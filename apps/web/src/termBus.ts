// Tiny bus so non-terminal code (auto-dev, loaders) can print into the
// xterm pane. Messages written while the terminal is unmounted are
// buffered and flushed on the next mount.

let writer: ((s: string) => void) | null = null;
let pending = '';
const MAX_PENDING = 64 * 1024;

export function setTermWriter(w: ((s: string) => void) | null) {
  writer = w;
  if (w && pending) {
    const p = pending;
    pending = '';
    w(p);
  }
}

export function termWrite(s: string) {
  if (writer) writer(s);
  else {
    pending += s;
    if (pending.length > MAX_PENDING) pending = pending.slice(-MAX_PENDING);
  }
}
