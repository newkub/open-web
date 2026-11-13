import { Show, createEffect, createUniqueId, onCleanup, type Accessor, type JSX } from 'solid-js';
import { IconButton } from './ui';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialogFocus(options: {
  open: Accessor<boolean>;
  container: Accessor<HTMLElement | undefined>;
  onClose: () => void;
}) {
  let previous: HTMLElement | null = null;

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      options.onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const root = options.container();
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (node) => node.offsetParent !== null,
    );
    if (nodes.length === 0) {
      event.preventDefault();
      root.focus();
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === root)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  createEffect(() => {
    if (!options.open()) return;
    previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => {
      const root = options.container();
      if (!root) return;
      const autofocus = root.querySelector<HTMLElement>('[data-autofocus]');
      (autofocus ?? root).focus();
    });
    onCleanup(() => {
      cancelAnimationFrame(frame);
      if (previous?.isConnected) previous.focus();
      previous = null;
    });
  });

  return onKeyDown;
}

export function Field(props: { label: string; hint?: string; children: JSX.Element }) {
  return (
    <label class="flex flex-col gap-1.5">
      <span class="text-[11px] font-medium text-secondary-foreground">{props.label}</span>
      {props.children}
      <Show when={props.hint}>
        <span class="text-[10px] leading-snug text-muted-foreground">{props.hint}</span>
      </Show>
    </label>
  );
}

export function Modal(props: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: JSX.Element;
  footer?: JSX.Element;
  width?: string;
}) {
  let panel: HTMLDivElement | undefined;
  const titleId = createUniqueId();
  const subtitleId = createUniqueId();
  const onKeyDown = useDialogFocus({
    open: () => props.open,
    container: () => panel,
    onClose: props.onClose,
  });
  return (
    <Show when={props.open}>
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="modal-overlay absolute inset-0 fade-in" aria-hidden="true" onClick={props.onClose} />
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={props.subtitle ? subtitleId : undefined}
          tabindex="-1"
          onKeyDown={onKeyDown}
          class={`relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-lg outline-none rise-in ${props.width ?? 'max-w-lg'}`}
        >
          <header class="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div class="min-w-0">
              <h2 id={titleId} class="text-sm font-semibold tracking-tight">
                {props.title}
              </h2>
              <Show when={props.subtitle}>
                <p id={subtitleId} class="mt-1 text-xs text-muted-foreground">
                  {props.subtitle}
                </p>
              </Show>
            </div>
            <IconButton icon="i-mdi-close" label="Close" onClick={props.onClose} />
          </header>
          <div class="min-h-0 flex-1 overflow-auto px-5 py-4">{props.children}</div>
          <Show when={props.footer}>
            <footer class="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-surface-elevated px-5 py-3">
              {props.footer}
            </footer>
          </Show>
        </div>
      </div>
    </Show>
  );
}

export function EmptyHint(props: { icon: string; title: string; children?: JSX.Element }) {
  return (
    <div class="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <span class={`${props.icon} text-3xl text-muted-foreground`} aria-hidden="true" />
      <div class="text-sm font-medium">{props.title}</div>
      <Show when={props.children}>
        <div class="max-w-sm text-xs leading-relaxed text-muted-foreground">{props.children}</div>
      </Show>
    </div>
  );
}
