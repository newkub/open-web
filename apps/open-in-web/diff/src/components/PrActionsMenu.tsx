import { Show, createSignal, createUniqueId } from 'solid-js';
import { Button } from './ui';

export default function PrActionsMenu(props: {
  busy: string | null;
  onAction: (action: string, extra?: { method?: string }) => void;
  onComment: () => void;
}) {
  const [menuOpen, setMenuOpen] = createSignal(false);
  const menuId = createUniqueId();
  let actionsButton: HTMLButtonElement | undefined;
  const closeMenu = () => {
    setMenuOpen(false);
    actionsButton?.focus();
  };
  const run = (action: string, extra?: { method?: string }) => {
    closeMenu();
    props.onAction(action, extra);
  };

  return (
    <div
      class="relative"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen()) {
          event.preventDefault();
          closeMenu();
        }
      }}
    >
      <Button
        ref={(element) => (actionsButton = element)}
        size="sm"
        onClick={() => setMenuOpen((open) => !open)}
        title="Pull request actions"
        ariaLabel="Pull request actions"
        ariaHasPopup="menu"
        ariaExpanded={menuOpen()}
        ariaControls={menuId}
      >
        <span class="i-mdi-git-pull-request text-sm text-primary" aria-hidden="true" />
        <span class="hidden sm:inline">Actions</span>
        <span class="i-mdi-chevron-down text-sm text-muted-foreground" aria-hidden="true" />
      </Button>
      <Show when={menuOpen()}>
        <div class="fixed inset-0 z-40" aria-hidden="true" onClick={closeMenu} />
        <div
          id={menuId}
          role="menu"
          aria-label="Pull request actions"
          class="popover-enter absolute right-0 z-50 mt-1 w-52 rounded-lg border border-border bg-surface p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            disabled={!!props.busy}
            onClick={() => run('approve')}
            class="menu-item"
          >
            <span class="i-mdi-check-decagram-outline text-sm text-success" aria-hidden="true" /> Approve
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!!props.busy}
            onClick={() => run('merge', { method: 'squash' })}
            class="menu-item"
          >
            <span class="i-mdi-merge text-sm text-primary" aria-hidden="true" /> Squash and merge
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!!props.busy}
            onClick={() => run('merge', { method: 'rebase' })}
            class="menu-item"
          >
            <span class="i-mdi-source-commit text-sm text-accent" aria-hidden="true" /> Rebase and merge
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!!props.busy}
            onClick={() => run('merge')}
            class="menu-item"
          >
            <span class="i-mdi-source-merge text-sm text-muted-foreground" aria-hidden="true" /> Merge commit
          </button>
          <div class="my-1 h-px bg-border" role="separator" />
          <button
            type="button"
            role="menuitem"
            disabled={!!props.busy}
            onClick={props.onComment}
            class="menu-item"
          >
            <span class="i-mdi-comment-outline text-sm text-muted-foreground" aria-hidden="true" /> Comment
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!!props.busy}
            onClick={() => run('checkout')}
            class="menu-item"
          >
            <span class="i-mdi-source-branch text-sm text-muted-foreground" aria-hidden="true" /> Checkout PR
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!!props.busy}
            onClick={() => run('close')}
            class="menu-item text-destructive hover:bg-muted"
          >
            <span class="i-mdi-close-circle-outline text-sm" aria-hidden="true" /> Close pull request
          </button>
        </div>
      </Show>
    </div>
  );
}
