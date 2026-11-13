// Minimal Node builtin shims injected by the bundler for the edge-js tier.
// Each returns JS module source for the 'shim' esbuild namespace.

const PATH_SHIM = `
const sep = '/';
const posix = {
  normalize(p){ const parts=[]; for(const s of String(p).split('/')){ if(!s||s==='.')continue; if(s==='..')parts.pop(); else parts.push(s);} return '/'+parts.join('/'); },
  join(...a){ return posix.normalize(a.filter(Boolean).join('/')); },
  resolve(...a){ const parts=[]; for(const x of a){ if(x.startsWith('/')) parts.length=0; parts.push(x);} return posix.normalize('/'+parts.join('/')); },
  dirname(p){ const i=String(p).lastIndexOf('/'); return i<=0?'/':String(p).slice(0,i); },
  basename(p,ext){ let b=String(p).split('/').pop()||''; if(ext&&b.endsWith(ext))b=b.slice(0,-ext.length); return b; },
  extname(p){ const b=posix.basename(p); const i=b.lastIndexOf('.'); return i>0?b.slice(i):''; },
  isAbsolute(p){ return String(p).startsWith('/'); },
};
export default posix;
export const normalize=posix.normalize, join=posix.join, resolve=posix.resolve,
  dirname=posix.dirname, basename=posix.basename, extname=posix.extname,
  isAbsolute=posix.isAbsolute, sep='/';
`;

const PROCESS_SHIM = `
const __emit=(s)=>{ try{ postMessage({__sb:'out',data:s}) }catch(e){} };
const proc = {
  cwd: () => '/',
  argv: ['node','main.js'],
  env: {},
  platform: 'browser',
  version: 'v20.0.0-stackbox',
  versions: { node: '20.0.0' },
  stdout: { write:(s)=>{__emit(String(s)); return true}, isTTY:false },
  stderr: { write:(s)=>{__emit(String(s)); return true}, isTTY:false },
  stdin: { isTTY:false, on(){}, once(){}, read(){return null} },
  exit:(c=0)=>{ try{ postMessage({__sb:'exit',code:c}) }catch(e){} },
  on:(ev,fn)=>{ if(ev==='exit') globalThis.__sbExit=fn; return proc },
  once:(ev,fn)=>proc.on(ev,fn),
  emit:()=>false,
  nextTick:(fn,...a)=>queueMicrotask(()=>fn(...a)),
  hrtime:{ now:()=>[0,0] },
};
export default proc;
export const cwd=proc.cwd, argv=proc.argv, env=proc.env, platform=proc.platform,
  version=proc.version, versions=proc.versions, stdout=proc.stdout,
  stderr=proc.stderr, stdin=proc.stdin, exit=proc.exit;
`;

const EVENTS_SHIM = `
export class EventEmitter {
  constructor(){ this._h = new Map(); }
  on(ev,fn){ (this._h.get(ev)??this._h.set(ev,[]).get(ev)).push(fn); return this; }
  once(ev,fn){ const w=(...a)=>{this.off(ev,w);fn(...a)}; return this.on(ev,w); }
  off(ev,fn){ const l=this._h.get(ev); if(l){const i=l.indexOf(fn); if(i>=0)l.splice(i,1);} return this; }
  removeListener(ev,fn){ return this.off(ev,fn); }
  emit(ev,...a){ for(const fn of [...(this._h.get(ev)??[])]) fn(...a); return true; }
  listeners(ev){ return [...(this._h.get(ev)??[])]; }
  listenerCount(ev){ return (this._h.get(ev)??[]).length; }
}
export default EventEmitter;
`;

const OS_SHIM = `
export const platform=()=>'browser';
export const type=()=>'BrowserVM';
export const arch=()=>'wasm32';
export const release=()=>'stackbox';
export const tmpdir=()=>'/tmp';
export const homedir=()=>'/home/user';
export const hostname=()=>'stackbox';
export const cpus=()=>[{model:'stackbox-vm',speed:0}];
export const totalmem=()=>navigator.deviceMemory?navigator.deviceMemory*2**30:2**30;
export const freemem=totalmem;
export const uptime=()=>performance.now()/1000;
export const networkInterfaces=()=>({});
export const EOL='\\n';
`;

const CRYPTO_SHIM = `
const c = globalThis.crypto;
export function randomBytes(n){ const b=new Uint8Array(n); c.getRandomValues(b); return b; }
export function randomUUID(){ return c.randomUUID(); }
export const webcrypto = c;
export default { randomBytes, randomUUID, webcrypto, subtle:c.subtle, getRandomValues:(a)=>c.getRandomValues(a) };
`;

function stubError(name: string): string {
  return `throw new Error(${JSON.stringify(name + ' is not available in the stackbox edge-js runtime')});`;
}

const STUBS = new Set(['fs', 'child_process', 'http', 'https', 'net', 'tls', 'zlib', 'stream', 'assert', 'querystring', 'module', 'vm', 'tty', 'readline', 'dns', 'cluster', 'worker_threads', 'perf_hooks']);

export function shimSource(spec: string): string | null {
  const name = spec.startsWith('node:') ? spec.slice(5) : spec;
  switch (name) {
    case 'path': return PATH_SHIM;
    case 'process': return PROCESS_SHIM;
    case 'events': return EVENTS_SHIM;
    case 'os': return OS_SHIM;
    case 'crypto': return CRYPTO_SHIM;
    case 'url': return `export { URL, URLSearchParams };\n`;
    case 'util': return `export const format=(f,...a)=>{let i=0;return String(f).replace(/%[sdifjoO%]/g,m=>m==='%%'?'%':a[i++]??m)}; export const promisify=(fn)=>(...a)=>new Promise((res,rej)=>fn(...a,(e,r)=>e?rej(e):res(r))); export const inherits=()=>{}; export const deprecate=(f)=>f; export const types={isUint8Array:(v)=>v instanceof Uint8Array}; export default {format,promisify};\n`;
    case 'buffer': return `export const Buffer = { from:(a)=>typeof a==='string'?new TextEncoder().encode(a):a, isBuffer:()=>false, alloc:(n)=>new Uint8Array(n), concat:(l)=>{const n=l.reduce((s,b)=>s+b.length,0);const o=new Uint8Array(n);let i=0;for(const b of l){o.set(b,i);i+=b.length}return o} }; export default {Buffer};\n`;
    case 'string_decoder': return `export class StringDecoder { constructor(){} write(b){ return b?new TextDecoder().decode(b):'' } end(){return ''} }\n`;
    default:
      if (STUBS.has(name)) return stubError(name);
      return null;
  }
}
