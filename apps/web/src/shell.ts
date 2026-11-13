import { getVfs, readTextFile } from './vfs';
import { runFile } from './runtime/workerExec';
import { previewProject } from './runtime/preview';
import { detectProject } from './runtime/detect';

// Virtual shell layered on the shared VFS, now with real execution:
//   run <file>   — bundle + execute JS/TS in a Web Worker (edge-js tier)
//   preview|dev  — bundle the app and open the live preview pane
//   deps         — show package.json dependencies

interface ShellState {
  cwd: string;
}

const state: ShellState = { cwd: '/' };

export function getCwd(): string {
  return state.cwd;
}

function resolve(cwd: string, arg: string): string {
  if (arg.startsWith('/')) return arg;
  return cwd === '/' ? `/${arg}` : `${cwd}/${arg}`;
}

function normalize(path: string): string {
  const parts: string[] = [];
  for (const seg of path.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return '/' + parts.join('/');
}

/** TAB-completion candidates for the current token. */
export async function complete(prefix: string): Promise<string[]> {
  const vfs = await getVfs();
  const norm = normalize(prefix);
  const isDirPrefix = prefix.endsWith('/') || !prefix.includes('.');
  const walk = vfs.walk();
  const out = new Set<string>();
  const baseDir = norm.includes('/') ? norm.slice(0, norm.lastIndexOf('/')) || '/' : state.cwd;
  const needle = norm.split('/').pop()!.toLowerCase();
  for (const e of walk) {
    const parent = e.path.slice(0, e.path.lastIndexOf('/')) || '/';
    if (parent !== baseDir && !e.path.startsWith(baseDir === '/' ? '/' : baseDir + '/')) continue;
    const name = e.path.split('/').pop()!;
    if (!name.toLowerCase().startsWith(needle)) continue;
    if (isDirPrefix || e.is_dir) {
      out.add(`${e.path}/`);
    } else {
      out.add(e.path);
    }
    if (out.size > 50) break;
  }
  return [...out].sort();
}

export async function runShellLine(line: string, write: (s: string) => void): Promise<void> {
  const trimmed = line.trim();
  if (!trimmed) return;
  const [cmd, ...args] = trimmed.split(/\s+/);
  const vfs = await getVfs();

  switch (cmd) {
    case 'help':
      write(
        'ls cd pwd cat head tail wc find tree echo clear deps run preview dev start help\n' +
          '  run <file>    bundle & execute a JS/TS file (edge-js worker)\n' +
          '  preview|dev   bundle the app and open live preview\n' +
          '  deps          list package.json dependencies\n',
      );
      break;
    case 'pwd':
      write(state.cwd + '\n');
      break;
    case 'cd': {
      const target = normalize(resolve(state.cwd, args[0] ?? '/'));
      if (vfs.exists(target)) state.cwd = target === '' ? '/' : target;
      else write(`cd: no such directory: ${args[0]}\n`);
      break;
    }
    case 'ls': {
      const target = normalize(resolve(state.cwd, args[0] ?? '.'));
      const entries = vfs.list(target);
      if (entries.length === 0) {
        write((args[0] ? '' : '  (empty)') + '\n');
        break;
      }
      const dirs = entries.filter((e) => e.is_dir);
      const files = entries.filter((e) => !e.is_dir);
      for (const e of dirs) write(`  ${e.name}/\n`);
      for (const e of files) write(`  ${e.name}\n`);
      break;
    }
    case 'tree': {
      const prefix = args[0] ? resolve(state.cwd, args[0]) : state.cwd;
      const walk = vfs.walk().filter((e) => e.path.startsWith(prefix === '/' ? '/' : prefix + '/'));
      for (const e of walk) {
        const indent = '  '.repeat(Math.max(0, e.path.slice(prefix === '/' ? 1 : prefix.length + 1).split('/').length - 1));
        write(`${indent}${e.is_dir ? '📁 ' : '📄 '}${e.name}${e.is_dir ? '/' : ''}\n`);
      }
      break;
    }
    case 'cat': {
      const target = resolve(state.cwd, args.join(' '));
      const text = readTextFile(vfs, target);
      if (text === null) write(`cat: ${args.join(' ')}: No such file\n`);
      else write(text + (text.endsWith('\n') ? '' : '\n'));
      break;
    }
    case 'head': case 'tail': {
      const n = parseInt(args[0] ?? '10', 10);
      const file = args[1] ?? '';
      const text = readTextFile(vfs, resolve(state.cwd, file));
      if (text === null) write(`${cmd}: ${file}: No such file\n`);
      else {
        const lines = text.split('\n');
        const slice = cmd === 'head' ? lines.slice(0, n) : lines.slice(-n);
        write(slice.join('\n') + '\n');
      }
      break;
    }
    case 'wc': {
      const text = readTextFile(vfs, resolve(state.cwd, args[0] ?? ''));
      if (text === null) write(`wc: ${args[0]}: No such file\n`);
      else {
        const lines = text.split('\n').length;
        const words = text.split(/\s+/).filter(Boolean).length;
        write(`${lines} ${words} ${text.length}\n`);
      }
      break;
    }
    case 'find': {
      const needle = (args[0] ?? '').toLowerCase();
      const matches = vfs.walk().filter((e) => !e.is_dir && e.path.toLowerCase().includes(needle));
      for (const m of matches.slice(0, 200)) write(m.path + '\n');
      if (matches.length > 200) write(`… ${matches.length - 200} more\n`);
      break;
    }
    case 'deps': {
      const info = detectProject(vfs);
      const entries = Object.entries(info.deps);
      if (entries.length === 0) write('no dependencies in package.json\n');
      for (const [name, ver] of entries) write(`  ${name}@${ver}\n`);
      break;
    }
    case 'run': {
      const file = args[0];
      if (!file) {
        write('usage: run <file>   e.g. run src/index.js\n');
        break;
      }
      const target = resolve(state.cwd, file);
      if (!vfs.exists(target)) {
        write(`run: ${file}: No such file\n`);
        break;
      }
      write(`\x1b[2m[bundling ${target}…]\x1b[0m\n`);
      try {
        const handle = await runFile(target, (e) => write(e.data));
        const code = await handle.done;
        write(`\x1b[2m[exit ${code}]\x1b[0m\n`);
      } catch (e) {
        write(`\x1b[31mrun failed: ${e instanceof Error ? e.message : e}\x1b[0m\n`);
      }
      break;
    }
    case 'preview': case 'dev': case 'start': {
      write('\x1b[2m[bundling app…]\x1b[0m\n');
      try {
        await previewProject((m) => write(`\x1b[2m${m}\x1b[0m\n`));
        write('\x1b[32mpreview opened →\x1b[0m\n');
      } catch (e) {
        write(`\x1b[31mpreview failed: ${e instanceof Error ? e.message : e}\x1b[0m\n`);
      }
      break;
    }
    case 'node': case 'npm': case 'bun': case 'npx': {
      const sub = args[0];
      if (sub === 'run' || sub === 'start' || sub === 'dev' || !sub) {
        write(`\x1b[2m[${cmd} ${args.join(' ')} → bundling app…]\x1b[0m\n`);
        try {
          await previewProject(() => {});
          write('\x1b[32mpreview opened →\x1b[0m\n');
        } catch (e) {
          write(`\x1b[31m${e instanceof Error ? e.message : e}\x1b[0m\n`);
        }
      } else {
        write(`${cmd}: only \`${cmd} run|start|dev\` is supported (maps to preview).\n`);
      }
      break;
    }
    case 'echo':
      write(args.join(' ') + '\n');
      break;
    case 'clear':
      write('\x1b[2J\x1b[H');
      break;
    default:
      write(`stackbox-sh: ${cmd}: command not found (try 'help')\n`);
  }
}
