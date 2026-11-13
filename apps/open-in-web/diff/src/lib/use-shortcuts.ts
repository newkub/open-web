import { onCleanup, onMount } from 'solid-js';

export interface ShortcutHandlers {
  openHelp: () => void;
  openOptions: () => void;
  closeOverlays: () => boolean;
  overlayOpen: () => boolean;
  focusSearch: () => void;
  cycleTheme: () => void;
  toggleSidebar: () => void;
  toggleStyle: () => void;
  toggleWrap: () => void;
  toggleLayout: () => void;
  nextFile: () => void;
  previousFile: () => void;
  reload: () => void;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function useShortcuts(getHandlers: () => ShortcutHandlers) {
  onMount(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) {
        if (event.key === 'Escape') (event.target as HTMLElement).blur();
        return;
      }

      const handlers = getHandlers();
      const key = event.key;

      if (key === 'Escape') {
        if (handlers.closeOverlays()) event.preventDefault();
        return;
      }
      if (handlers.overlayOpen()) return;
      if (key === '?') {
        event.preventDefault();
        handlers.openHelp();
        return;
      }
      if (key === '/') {
        event.preventDefault();
        handlers.focusSearch();
        return;
      }
      if (key === 't') {
        handlers.cycleTheme();
        return;
      }
      if (key === 's') {
        handlers.toggleSidebar();
        return;
      }
      if (key === 'o') {
        handlers.openOptions();
        return;
      }
      if (key === 'd') {
        handlers.toggleStyle();
        return;
      }
      if (key === 'w') {
        handlers.toggleWrap();
        return;
      }
      if (key === 'f') {
        handlers.toggleLayout();
        return;
      }
      if (key === 'n' || key === 'ArrowDown' && event.shiftKey) {
        handlers.nextFile();
        return;
      }
      if (key === 'p' || key === 'ArrowUp' && event.shiftKey) {
        handlers.previousFile();
        return;
      }
      if (key === 'r') {
        handlers.reload();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    onCleanup(() => window.removeEventListener('keydown', onKeyDown));
  });
}
