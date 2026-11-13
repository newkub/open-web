import { For } from 'solid-js';
import { Kbd } from './ui';
import { Modal } from './ui-layout';

const GROUPS = [
  {
    title: 'Navigation',
    rows: [
      { keys: ['n'], label: 'Next file' },
      { keys: ['p'], label: 'Previous file' },
      { keys: ['/'], label: 'Focus the file filter' },
      { keys: ['r'], label: 'Reload the diff' },
    ],
  },
  {
    title: 'Viewer',
    rows: [
      { keys: ['d'], label: 'Toggle split / unified' },
      { keys: ['w'], label: 'Toggle line wrapping' },
      { keys: ['f'], label: 'Toggle focus layout' },
      { keys: ['s'], label: 'Toggle the file sidebar' },
      { keys: ['o'], label: 'Open viewer options' },
    ],
  },
  {
    title: 'General',
    rows: [
      { keys: ['t'], label: 'Cycle system / light / dark theme' },
      { keys: ['?'], label: 'Show this shortcut sheet' },
      { keys: ['Esc'], label: 'Close dialogs and panels' },
    ],
  },
];

export default function HelpModal(props: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Keyboard shortcuts"
      subtitle="Shortcuts are ignored while typing in a field."
      width="max-w-xl"
      footer={
        <a
          href="https://diffs.com"
          target="_blank"
          rel="noreferrer"
          class="mr-auto flex items-center gap-1 rounded-sm text-[10px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
        >
          Diff rendering by @pierre/diffs
          <span class="i-mdi-open-in-new text-[9px]" aria-hidden="true" />
        </a>
      }
    >
      <div class="grid gap-5 sm:grid-cols-2">
        <For each={GROUPS}>
          {(group) => (
            <section class="space-y-1.5">
              <h3 class="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {group.title}
              </h3>
              <div class="divide-y divide-border rounded-md border border-border">
                <For each={group.rows}>
                  {(row) => (
                    <div class="flex items-center justify-between gap-3 px-2.5 py-1.5">
                      <span class="text-xs text-secondary-foreground">{row.label}</span>
                      <span class="flex shrink-0 items-center gap-1">
                        <For each={row.keys}>{(key) => <Kbd>{key}</Kbd>}</For>
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </section>
          )}
        </For>
      </div>
    </Modal>
  );
}
