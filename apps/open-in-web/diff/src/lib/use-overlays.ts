import { createSignal } from 'solid-js';

export type OverlayId = 'source' | 'options' | 'help';

export function useOverlays() {
  const [active, setActive] = createSignal<OverlayId | null>(null);
  const isOpen = (id: OverlayId) => active() === id;
  const openSource = () => setActive('source');
  const openOptions = () => setActive('options');
  const openHelp = () => setActive('help');
  const close = () => setActive(null);
  const closeOverlays = () => {
    if (!active()) return false;
    setActive(null);
    return true;
  };
  return { active, isOpen, openSource, openOptions, openHelp, close, closeOverlays };
}
