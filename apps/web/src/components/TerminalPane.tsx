import { useEffect, useRef } from 'react';
import { useStore } from '@tanstack/react-store';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { runShellLine, complete, getCwd } from '../shell';
import { projectStore } from '../store';
import { setTermWriter } from '../termBus';

function prompt(write: (s: string) => void) {
  const cwd = getCwd();
  write(`\x1b[1;32m${cwd === '/' ? '~' : cwd} ❯ \x1b[0m`);
}

export function TerminalPane() {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const open = useStore(projectStore, (s) => s.terminalOpen);

  useEffect(() => {
    if (!hostRef.current || termRef.current) return;
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'ui-monospace, "Cascidia Code", Consolas, monospace',
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
        selectionBackground: '#264f78',
      },
      convertEol: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    fitRef.current = fit;
    term.open(hostRef.current);
    fit.fit();
    termRef.current = term;

    const write = (s: string) => term.write(s);
    setTermWriter(write);
    write('\x1b[1;36mopen-web shell\x1b[0m — type `help`. `run <file>` executes JS, `preview` bundles the app.\r\n\r\n');
    prompt(write);

    let line = '';
    const history: string[] = [];
    let histIdx = -1;
    let busy = false;

    term.onData((data) => {
      if (busy) return; // don't interleave input while a command runs
      if (data === '\r') {
        term.write('\r\n');
        const cmd = line;
        line = '';
        histIdx = -1;
        if (cmd.trim()) history.push(cmd);
        busy = true;
        void runShellLine(cmd, write).finally(() => {
          busy = false;
          prompt(write);
        });
      } else if (data === '\x7f') {
        if (line.length) {
          line = line.slice(0, -1);
          term.write('\b \b');
        }
      } else if (data === '\x1b[A') {
        // up — history
        if (histIdx === -1) histIdx = history.length - 1;
        else if (histIdx > 0) histIdx--;
        if (histIdx >= 0 && history[histIdx] !== undefined) {
          const prev = line;
          line = history[histIdx];
          term.write('\x1b[2K\r' + '\x1b[1;32m' + (getCwd() === '/' ? '~' : getCwd()) + ' ❯ \x1b[0m' + line);
          void prev;
        }
      } else if (data === '\x1b[B') {
        // down
        if (histIdx >= 0 && histIdx < history.length - 1) {
          histIdx++;
          line = history[histIdx];
          term.write('\x1b[2K\r' + '\x1b[1;32m' + (getCwd() === '/' ? '~' : getCwd()) + ' ❯ \x1b[0m' + line);
        } else {
          histIdx = -1;
          line = '';
          term.write('\x1b[2K\r' + '\x1b[1;32m' + (getCwd() === '/' ? '~' : getCwd()) + ' ❯ \x1b[0m');
        }
      } else if (data === '\t') {
        // TAB completion on last token
        const parts = line.split(/\s+/);
        const last = parts[parts.length - 1] ?? '';
        void complete(last).then((cands) => {
          if (cands.length === 1) {
            parts[parts.length - 1] = cands[0];
            line = parts.join(' ');
            term.write('\x1b[2K\r' + '\x1b[1;32m' + (getCwd() === '/' ? '~' : getCwd()) + ' ❯ \x1b[0m' + line);
          } else if (cands.length > 1) {
            term.write('\r\n' + cands.slice(0, 30).join('  ') + '\r\n');
            prompt(write);
            term.write(line);
          }
        });
      } else if (data === '\x03') {
        line = '';
        histIdx = -1;
        term.write('^C\r\n');
        prompt(write);
      } else if (data >= ' ') {
        line += data;
        term.write(data);
      }
    });

    const ro = new ResizeObserver(() => fit.fit());
    ro.observe(hostRef.current);
    return () => {
      ro.disconnect();
      setTermWriter(null);
      term.dispose();
      termRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      fitRef.current?.fit();
      termRef.current?.focus();
    });
  }, [open]);

  // Keep the host mounted (hidden when closed) so the xterm instance
  // survives toggle — unmounting it would destroy the terminal.
  return <div className="terminal-pane" ref={hostRef} style={{ display: open ? 'block' : 'none' }} />;
}
