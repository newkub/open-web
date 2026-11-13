import { createSignal } from 'solid-js';
import type { useActions } from './use-actions';

export interface PendingAction {
  action: string;
  method?: string;
  title: string;
  message: string;
  confirm: string;
  danger: boolean;
}

type Notify = (tone: 'success' | 'danger', text: string) => void;

export function usePrActions(
  actions: ReturnType<typeof useActions>,
  reload: () => void,
  notify: Notify,
) {
  const [pending, setPending] = createSignal<PendingAction | null>(null);
  const [commentOpen, setCommentOpen] = createSignal(false);

  const mergeMessage = (method?: string) => {
    if (method === 'squash') return 'Squash all commits from this pull request into one commit on the base branch?';
    if (method === 'rebase') return 'Rebase the pull request commits onto the base branch and merge them?';
    return 'Create a merge commit for this pull request on the base branch?';
  };

  const requestAction = (action: string, extra?: { method?: string }) => {
    if (action === 'checkout') {
      void perform('checkout');
      return;
    }
    if (action === 'approve') {
      setPending({
        action,
        title: 'Approve pull request',
        message: 'Submit an approving review for this pull request with the gh CLI?',
        confirm: 'Approve',
        danger: false,
      });
      return;
    }
    if (action === 'merge') {
      setPending({
        action,
        method: extra?.method,
        title: 'Merge pull request',
        message: mergeMessage(extra?.method),
        confirm: 'Merge',
        danger: false,
      });
      return;
    }
    if (action === 'close') {
      setPending({
        action,
        title: 'Close pull request',
        message: 'Close this pull request without merging? This is visible to everyone on the repository.',
        confirm: 'Close PR',
        danger: true,
      });
    }
  };

  const perform = async (action: string, extra?: { method?: string }) => {
    const result = await actions.run(action, extra);
    if (!result.ok) {
      notify('danger', result.error ?? `${action} failed`);
      return;
    }
    if (action === 'merge' || action === 'close') {
      notify('success', action === 'merge' ? 'Pull request merged' : 'Pull request closed');
      reload();
    } else if (action === 'approve') {
      notify('success', 'Review approved');
    } else if (action === 'checkout') {
      notify('success', 'Checked out the diff ref');
    } else {
      notify('success', `${action} completed`);
    }
  };

  const confirmPending = () => {
    const task = pending();
    if (!task) return;
    setPending(null);
    void perform(task.action, task.method ? { method: task.method } : undefined);
  };

  const submitComment = async (body: string) => {
    const result = await actions.run('comment', { body });
    if (!result.ok) {
      notify('danger', result.error ?? 'Could not post the comment');
      return;
    }
    setCommentOpen(false);
    notify('success', 'Comment posted');
  };

  return { pending, commentOpen, setPending, setCommentOpen, requestAction, confirmPending, submitComment };
}
