import { createSignal, onCleanup } from 'solid-js';
import type { Toast } from '../components/Toast';

export function useToast() {
  const [toast, setToast] = createSignal<Toast | null>(null);
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  const notify = (tone: Toast['tone'], text: string) => {
    setToast({ tone, text });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => setToast(null), 4200);
  };

  onCleanup(() => {
    if (toastTimer) clearTimeout(toastTimer);
  });

  return { toast, notify };
}
