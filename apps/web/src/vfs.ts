import type { FileEntry, VfsLike } from './types';

// The VFS core is a Rust crate (crates/vfs) compiled to wasm
// (crates/wasm). The generated glue is served from /wasm (public dir in
// dev, copied into dist on build). See `bun run wasm` at repo root.

interface WasmModule {
  default: (opts?: { module_or_path?: string | URL }) => Promise<void>;
  WebVfs: new () => VfsLike;
}

let instance: VfsLike | null = null;

export async function getVfs(): Promise<VfsLike> {
  if (instance) return instance;
  // Static asset served from /wasm (public dir); @vite-ignore keeps the
  // specifier out of the bundle graph — the glue fetches its .wasm itself.
  const spec = '/wasm/webide_wasm.js';
  const mod = (await import(/* @vite-ignore */ spec)) as WasmModule;
  await mod.default();
  instance = new mod.WebVfs();
  return instance;
}

export async function resetVfs(): Promise<VfsLike> {
  const vfs = await getVfs();
  vfs.clear();
  return vfs;
}

export function readTextFile(vfs: VfsLike, path: string): string | null {
  const data = vfs.read_file(path);
  if (!data) return null;
  return new TextDecoder('utf-8', { fatal: false }).decode(data);
}

export function decodePath(base: string, name: string): string {
  return base === '/' ? `/${name}` : `${base}/${name}`;
}

export function buildTree(entries: FileEntry[]): FileEntry[] {
  // Entries come pre-sorted from Rust walk(); the UI groups by directory.
  return entries;
}
