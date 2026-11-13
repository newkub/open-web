import { Show, createEffect, createSignal, on } from 'solid-js';
import type { DiffSource } from '../types';
import { EMPTY_FIELDS, fieldsToSource, readFields, sourceToFields, type SourceFields } from '../lib/source';
import { Button, Spinner } from './ui';
import { Modal } from './ui-layout';
import { SourceTabs } from './SourceTabs';
import type { PrItem } from './SourcePrPanel';
import type { RefsResult } from './SourceRefs';

export default function SourceDialog(props: {
  open: boolean;
  current: DiffSource | null;
  onApply: (source: DiffSource) => void;
  onClose: () => void;
}) {
  const [fields, setFields] = createSignal<SourceFields>({ ...EMPTY_FIELDS, source: 'pr' });
  const [prs, setPrs] = createSignal<PrItem[] | null>(null);
  const [refs, setRefs] = createSignal<RefsResult | null>(null);
  const [loading, setLoading] = createSignal<'prs' | 'refs' | null>(null);
  const [notice, setNotice] = createSignal<string | null>(null);

  const set = (patch: Partial<SourceFields>) => setFields((prev) => ({ ...prev, ...patch }));

  const repoQuery = () => {
    const repo = fields().repo.trim();
    return repo ? `?repo=${encodeURIComponent(repo)}` : '';
  };

  const loadPrs = async () => {
    setLoading('prs');
    setNotice(null);
    try {
      const response = await fetch(`/api/prs${repoQuery()}`);
      const data = (await response.json()) as PrItem[];
      setPrs(Array.isArray(data) ? data : []);
    } catch {
      setPrs([]);
      setNotice('Could not load pull requests. Check the gh CLI and repository.');
    } finally {
      setLoading(null);
    }
  };

  const loadRefs = async () => {
    setLoading('refs');
    setNotice(null);
    try {
      const response = await fetch(`/api/refs${repoQuery()}`);
      const data = (await response.json()) as RefsResult;
      setRefs(data && Array.isArray(data.branches) ? data : null);
    } catch {
      setRefs(null);
      setNotice('Could not read git refs for this repository.');
    } finally {
      setLoading(null);
    }
  };

  createEffect(
    on(
      () => props.open,
      (open) => {
        if (!open) return;
        const initial = props.current ? sourceToFields(props.current) : readFields();
        setFields({ ...EMPTY_FIELDS, ...initial, source: initial.source || 'pr' });
        setNotice(null);
        loadPrs();
        loadRefs();
      },
    ),
  );

  const nextSource = () => fieldsToSource(fields());
  const apply = () => {
    const source = nextSource();
    if (source) props.onApply(source);
  };

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Open a diff"
      subtitle="Pull request, commit range, branch comparison, or two files on disk."
      width="max-w-2xl"
      footer={
        <>
          <span class="mr-auto text-[10px] text-muted-foreground">
            Tip: the source is stored in the URL — copy it to share.
          </span>
          <Button variant="ghost" onClick={props.onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!nextSource()} onClick={apply}>
            <Show when={!loading()} fallback={<Spinner class="text-sm" />}>
              <span class="i-mdi-play text-sm" aria-hidden="true" />
            </Show>
            Load diff
          </Button>
        </>
      }
    >
      <div class="space-y-4">
        <SourceTabs
          fields={fields()}
          set={set}
          refs={refs()}
          prs={prs()}
          loading={loading()}
          onApply={apply}
          onRefresh={fields().source === 'pr' ? loadPrs : loadRefs}
        />

        <Show when={notice()}>
          <p role="status" aria-live="polite" class="flex items-center gap-1.5 text-[11px] text-warning">
            <span class="i-mdi-alert-outline" aria-hidden="true" /> {notice()}
          </p>
        </Show>
      </div>
    </Modal>
  );
}
