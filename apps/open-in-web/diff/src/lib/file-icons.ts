const EXTENSIONS: Record<string, { icon: string; tone: string }> = {
  ts: { icon: 'i-mdi-language-typescript', tone: 'text-accent' },
  tsx: { icon: 'i-mdi-react', tone: 'text-accent' },
  js: { icon: 'i-mdi-language-javascript', tone: 'text-warning' },
  jsx: { icon: 'i-mdi-react', tone: 'text-warning' },
  mjs: { icon: 'i-mdi-language-javascript', tone: 'text-warning' },
  cjs: { icon: 'i-mdi-language-javascript', tone: 'text-warning' },
  json: { icon: 'i-mdi-code-json', tone: 'text-warning' },
  jsonc: { icon: 'i-mdi-code-json', tone: 'text-warning' },
  css: { icon: 'i-mdi-language-css3', tone: 'text-accent' },
  scss: { icon: 'i-mdi-language-css3', tone: 'text-primary' },
  html: { icon: 'i-mdi-language-html5', tone: 'text-warning' },
  md: { icon: 'i-mdi-language-markdown', tone: 'text-muted-foreground' },
  mdx: { icon: 'i-mdi-language-markdown', tone: 'text-muted-foreground' },
  rs: { icon: 'i-mdi-language-rust', tone: 'text-warning' },
  go: { icon: 'i-mdi-language-go', tone: 'text-accent' },
  py: { icon: 'i-mdi-language-python', tone: 'text-accent' },
  rb: { icon: 'i-mdi-language-ruby', tone: 'text-destructive' },
  php: { icon: 'i-mdi-language-php', tone: 'text-primary' },
  sh: { icon: 'i-mdi-bash', tone: 'text-success' },
  bash: { icon: 'i-mdi-bash', tone: 'text-success' },
  ps1: { icon: 'i-mdi-powershell', tone: 'text-accent' },
  nix: { icon: 'i-mdi-nix', tone: 'text-accent' },
  kt: { icon: 'i-mdi-language-kotlin', tone: 'text-primary' },
  swift: { icon: 'i-mdi-language-swift', tone: 'text-warning' },
  zig: { icon: 'i-mdi-language-zig', tone: 'text-warning' },
  lua: { icon: 'i-mdi-language-lua', tone: 'text-accent' },
  sql: { icon: 'i-mdi-database-outline', tone: 'text-primary' },
  yml: { icon: 'i-mdi-file-cog-outline', tone: 'text-muted-foreground' },
  yaml: { icon: 'i-mdi-file-cog-outline', tone: 'text-muted-foreground' },
  toml: { icon: 'i-mdi-file-cog-outline', tone: 'text-muted-foreground' },
  svg: { icon: 'i-mdi-svg', tone: 'text-primary' },
  png: { icon: 'i-mdi-file-image-outline', tone: 'text-primary' },
  jpg: { icon: 'i-mdi-file-image-outline', tone: 'text-primary' },
  jpeg: { icon: 'i-mdi-file-image-outline', tone: 'text-primary' },
  gif: { icon: 'i-mdi-file-image-outline', tone: 'text-primary' },
  webp: { icon: 'i-mdi-file-image-outline', tone: 'text-primary' },
  lock: { icon: 'i-mdi-lock-outline', tone: 'text-muted-foreground' },
};

const STATUS: Record<string, { icon: string; tone: string; label: string }> = {
  new: { icon: 'i-mdi-file-plus-outline', tone: 'text-success', label: 'Added' },
  deleted: { icon: 'i-mdi-file-remove-outline', tone: 'text-destructive', label: 'Deleted' },
  change: { icon: 'i-mdi-file-edit-outline', tone: 'text-warning', label: 'Modified' },
  'rename-pure': { icon: 'i-mdi-file-swap-outline', tone: 'text-accent', label: 'Renamed' },
  'rename-changed': { icon: 'i-mdi-file-swap-outline', tone: 'text-accent', label: 'Renamed' },
};

export function fileIcon(path: string) {
  const name = path.toLowerCase();
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '';
  return EXTENSIONS[ext] ?? { icon: 'i-mdi-file-outline', tone: 'text-muted-foreground' };
}

export function statusIcon(type: string) {
  return STATUS[type] ?? STATUS.change;
}

export function fileKind(type: string): 'new' | 'deleted' | 'renamed' | 'change' {
  if (type === 'new') return 'new';
  if (type === 'deleted') return 'deleted';
  if (type.startsWith('rename')) return 'renamed';
  return 'change';
}
