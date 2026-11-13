export interface FileEntry {
  path: string;
  name: string;
  is_dir: boolean;
  size: number;
}

export interface VfsLike {
  write_file(path: string, data: Uint8Array): void;
  read_file(path: string): Uint8Array | undefined;
  delete_file(path: string): boolean;
  rename(from: string, to: string): boolean;
  exists(path: string): boolean;
  list(path: string): FileEntry[];
  walk(): FileEntry[];
  file_count(): number;
  total_bytes(): number;
  load_files(entries: { path: string; data: Uint8Array }[]): void;
  clear(): void;
}
