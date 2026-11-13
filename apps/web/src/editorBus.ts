// Tiny pub/sub so global shortcuts (Ctrl+S) can reach the active editor
// without prop drilling. EditorPane registers its flush function here.

let saver: (() => void) | null = null;

export function registerSaver(fn: (() => void) | null) {
  saver = fn;
}

export function requestSave() {
  saver?.();
}
