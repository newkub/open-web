import { getVfs, readTextFile } from './vfs';

// Minimal virtual shell layered on the shared VFS. Gives the terminal
// immediate utility (browse/read project files) while the runtime tier
// (bun.wasm / WASIX / WebVM) is wired in behind the same interface.

interface ShellState {
  cwd: string;
}

const state: ShellState = { cwd: '/' };

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

export async function runShellLine(line: string, write: (s: string) => void): Promise<void> {
  const trimmed = line.trim();
  if (!trimmed) return;
  const [cmd, ...args] = trimmed.split(/\s+/);
  const vfs = await getVfs();

  switch (cmd) {
    case 'help':
      write('Available: ls, cd, pwd, cat, echo, clear, find, wc, head, tree, node, npm, bun\n');
      write('Runtime note: `node`/`npm`/`bun` run through the edge-js tier (in progress).\n');
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
      for (const e of entries) {
        write(e.is_dir ? `  ${e.name}/\n` : `  ${e.name}\n`);
      }
      break;
    }
    case 'tree': {
      const prefix = args[0] ? resolve(state.cwd, args[0]) : state.cwd;
      const walk = vfs.walk().filter((e) => e.path.startsWith(prefix === '/' ? '/' : prefix + '/'));
      const dirs = new Set(walk.filter((e) => e.is_dir).map((e) => e.path));
      for (const e of walk.filter((e) => !e.is_dir)) {
        write(e.path.replace(prefix === '/' ? '' : prefix, '') + '\n');
      }
      void dirs;
      break;
    }
    case 'cat': {
      const target = resolve(state.cwd, args.join(' '));
      const text = readTextFile(vfs, target);
      if (text === null) write(`cat: ${args.join(' ')}: No such file\n`);
      else write(text + (text.endsWith('\n') ? '' : '\n'));
      break;
    }
    case 'head': {
      const n = parseInt(args[0] ?? '10', 10);
      const file = args[1] ?? '';
      const text = readTextFile(vfs, resolve(state.cwd, file));
      if (text === null) write(`head: ${file}: No such file\n`);
      else write(text.split('\n').slice(0, n).join('\n') + '\n');
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
    case 'echo':
      write(args.join(' ') + '\n');
      break;
    case 'clear':
      write('\x1b[2J\x1b[H');
      break;
    case 'node':
    case 'npm':
    case 'bun':
      write(`${cmd}: edge-js runtime tier is not enabled yet — JS execution lands in the next milestone.\n`);
      write('For now use ls/cat/find to explore the project.\n');
      break;
    default:
      write(`stackbox-sh: ${cmd}: command not found\n`);
  }
}
