import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { runShellLine } from '../shell';
import { projectStore } from '../store';

export function TerminalPane() {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const open = projectStore.state.terminalOpen;

  useEffect(() => {
    if (!hostRef.current || termRef.current) return;
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
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
    term.open(hostRef.current);
    fit.fit();
    termRef.current = term;

    const write = (s: string) => term.write(s);
    write('\x1b[1;36mstackbox shell\x1b[0m — virtual FS over the loaded project. Type `help`.\r\n');
    write('node/npm/bun execution arrives with the edge-js runtime tier.\r\n\r\n');

    let line = '';
    term.onData((data) => {
      if (data === '\r') {
        term.write('\r\n');
        const cmd = line;
        line = '';
        void runShellLine(cmd, write).then(() => {
          write('\x1b[1;32m❯\x1b[0m ');
        });
      } else if (data === '\x7f') {
        if (line.length) {
          line = line.slice(0, -1);
          term.write('\b \b');
        }
      } else if (data === '\x1b[A' || data === '\x1b[B') {
        // history not implemented yet
      } else if (data >= ' ') {
        line += data;
        term.write(data);
      } else if (data === '\t') {
        // no completion yet
      } else if (data === '\x03') {
        line = '';
        term.write('^C\r\n\x1b[1;32m❯\x1b[0m ');
      }
    });

    const ro = new ResizeObserver(() => fit.fit());
    ro.observe(hostRef.current);
    return () => {
      ro.disconnect();
      term.dispose();
      termRef.current = null;
    };
  }, []);

  // re-fit when the pane becomes visible again
  useEffect(() => {
    if (open) requestAnimationFrame(() => termRef.current?.focus());
  }, [open]);

  if (!open) return null;
  return <div className="terminal-pane" ref={hostRef} />;
}
