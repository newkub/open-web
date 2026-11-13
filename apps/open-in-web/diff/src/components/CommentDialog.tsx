import { Show, createEffect, createSignal, on } from 'solid-js';
import { Button, Spinner } from './ui';
import { Modal } from './ui-layout';

export default function CommentDialog(props: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (body: string) => void;
}) {
  const [body, setBody] = createSignal('');

  createEffect(
    on(
      () => props.open,
      (open) => {
        if (open) setBody('');
      },
    ),
  );

  const submit = () => {
    const value = body().trim();
    if (!value || props.busy) return;
    props.onSubmit(value);
  };

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Comment on pull request"
      subtitle="The comment is posted with the gh CLI as the authenticated user."
      width="max-w-xl"
      footer={
        <>
          <span class="mr-auto font-mono text-[10px] text-muted-foreground">
            {body().length} chars · Ctrl+Enter to post
          </span>
          <Button variant="ghost" onClick={props.onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!body().trim() || props.busy} onClick={submit}>
            <Show when={props.busy} fallback={<span class="i-mdi-send text-sm" aria-hidden="true" />}>
              <Spinner class="text-sm" />
            </Show>
            Comment
          </Button>
        </>
      }
    >
      <textarea
        data-autofocus
        aria-label="Comment body"
        value={body()}
        onInput={(event) => setBody(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            submit();
          }
        }}
        rows={8}
        spellcheck={false}
        placeholder="Leave a comment…"
        class="w-full resize-y rounded-md border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed outline-none transition-colors placeholder:text-muted-foreground hover:border-border-hover focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus"
      />
    </Modal>
  );
}
