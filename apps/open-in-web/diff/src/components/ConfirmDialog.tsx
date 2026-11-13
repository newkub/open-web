import { Show } from 'solid-js';
import { Button, Spinner } from './ui';
import { Modal } from './ui-layout';

export default function ConfirmDialog(props: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={props.title}
      width="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={props.onClose}>
            Cancel
          </Button>
          <Button variant={props.danger ? 'danger' : 'primary'} disabled={props.busy} onClick={props.onConfirm}>
            <Show when={props.busy} fallback={<span class="i-mdi-check text-sm" aria-hidden="true" />}>
              <Spinner class="text-sm" />
            </Show>
            {props.confirmLabel}
          </Button>
        </>
      }
    >
      <div class="flex items-start gap-3">
        <span
          aria-hidden="true"
          class={`mt-0.5 shrink-0 text-lg ${
            props.danger ? 'i-mdi-alert-outline text-destructive' : 'i-mdi-help-circle-outline text-warning'
          }`}
        />
        <p class="text-xs leading-relaxed text-secondary-foreground">{props.message}</p>
      </div>
    </Modal>
  );
}
