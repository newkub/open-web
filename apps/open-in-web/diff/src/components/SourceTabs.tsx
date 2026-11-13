import { For, Show } from 'solid-js';
import type { SourceKind } from '../types';
import type { SourceFields } from '../lib/source';
import { Badge, Button, INPUT, Segmented, Spinner } from './ui';
import { Field } from './ui-layout';
import SourcePrPanel, { type PrItem } from './SourcePrPanel';
import { RefList, type RefsResult } from './SourceRefs';

export function SourceTabs(props: {
  fields: SourceFields;
  set: (patch: Partial<SourceFields>) => void;
  refs: RefsResult | null;
  prs: PrItem[] | null;
  loading: 'prs' | 'refs' | null;
  onApply: () => void;
  onRefresh: () => void;
}) {
  const onEnter = (event: KeyboardEvent) => event.key === 'Enter' && props.onApply();
  return (
    <div class="space-y-4">
      <Segmented
        value={props.fields.source as SourceKind}
        label="Diff source"
        onChange={(value) => props.set({ source: value })}
        options={[
          { value: 'pr' as SourceKind, label: 'Pull request', icon: 'i-mdi-source-pull' },
          { value: 'git' as SourceKind, label: 'Commit range', icon: 'i-mdi-source-commit' },
          { value: 'branch' as SourceKind, label: 'Branches', icon: 'i-mdi-source-branch' },
          { value: 'file' as SourceKind, label: 'Two files', icon: 'i-mdi-file-compare' },
          { value: 'ui' as SourceKind, label: 'UI diff', icon: 'i-mdi-web' },
        ]}
      />

      <Show when={props.fields.source !== 'file' && props.fields.source !== 'ui'}>
        <Field label="Repository" hint="Optional owner/repo. Defaults to the current directory.">
          <div class="flex gap-1.5">
            <input
              class={INPUT}
              value={props.fields.repo}
              placeholder="owner/repo"
              spellcheck={false}
              onInput={(event) => props.set({ repo: event.currentTarget.value })}
            />
            <Button
              size="sm"
              onClick={props.onRefresh}
              title="Refresh from this repository"
              ariaLabel="Refresh repository suggestions"
            >
              <Show when={props.loading} fallback={<span class="i-mdi-refresh text-sm" aria-hidden="true" />}>
                <Spinner class="text-sm" />
              </Show>
            </Button>
          </div>
        </Field>
      </Show>

      <Show when={props.fields.source === 'pr'}>
        <SourcePrPanel
          fields={props.fields}
          set={props.set}
          prs={props.prs}
          loading={props.loading}
          onApply={props.onApply}
        />
      </Show>

      <Show when={props.fields.source === 'git'}>
        <div class="space-y-2.5">
          <Field label="Base ref" hint="Diffs this ref against the working tree HEAD.">
            <input
              class={INPUT}
              list="diff-refs"
              value={props.fields.ref}
              placeholder="HEAD~1, main, v1.2.0, a1b2c3d"
              spellcheck={false}
              onInput={(event) => props.set({ ref: event.currentTarget.value })}
              onKeyDown={onEnter}
            />
            <datalist id="diff-refs">
              <For each={props.refs?.branches ?? []}>{(branch) => <option value={branch} />}</For>
              <For each={props.refs?.tags ?? []}>{(tag) => <option value={tag} />}</For>
            </datalist>
          </Field>
          <RefList
            loading={props.loading === 'refs'}
            refs={props.refs}
            onPick={(value) => props.set({ ref: value })}
          />
        </div>
      </Show>

      <Show when={props.fields.source === 'branch'}>
        <div class="space-y-2.5">
          <div class="grid grid-cols-2 gap-2">
            <Field label="Base">
              <input
                class={INPUT}
                list="diff-branches"
                value={props.fields.base}
                placeholder="main"
                spellcheck={false}
                onInput={(event) => props.set({ base: event.currentTarget.value })}
              />
            </Field>
            <Field label="Head">
              <input
                class={INPUT}
                list="diff-branches"
                value={props.fields.head}
                placeholder="feature/branch"
                spellcheck={false}
                onInput={(event) => props.set({ head: event.currentTarget.value })}
              />
            </Field>
          </div>
          <datalist id="diff-branches">
            <For each={props.refs?.branches ?? []}>{(branch) => <option value={branch} />}</For>
          </datalist>
          <div class="max-h-40 overflow-auto rounded-md border border-border">
            <Show
              when={(props.refs?.branches ?? []).length > 0}
              fallback={
                <div class="px-3 py-4 text-center text-xs text-muted-foreground">
                  {props.loading === 'refs' ? 'Loading branches…' : 'No branches found.'}
                </div>
              }
            >
              <For each={props.refs?.branches ?? []}>
                {(branch) => (
                  <div class="flex items-center gap-2 border-b border-border px-2.5 py-1.5 text-xs last:border-b-0">
                    <span class="i-mdi-source-branch shrink-0 text-sm text-muted-foreground" aria-hidden="true" />
                    <span class="min-w-0 flex-1 truncate font-mono">{branch}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      ariaLabel={`Use ${branch} as base`}
                      onClick={() => props.set({ base: branch })}
                    >
                      Base
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      ariaLabel={`Use ${branch} as head`}
                      onClick={() => props.set({ head: branch })}
                    >
                      Head
                    </Button>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>
      </Show>

      <Show when={props.fields.source === 'file'}>
        <div class="grid gap-2 sm:grid-cols-2">
          <Field label="Old file" hint="Path on disk, e.g. D:/update-project project/src/old.ts">
            <input
              class={INPUT}
              value={props.fields.old}
              placeholder="path/to/old-file"
              spellcheck={false}
              onInput={(event) => props.set({ old: event.currentTarget.value })}
            />
          </Field>
          <Field label="New file" hint="Path on disk, e.g. D:/update-project project/src/new.ts">
            <input
              class={INPUT}
              value={props.fields.new}
              placeholder="path/to/new-file"
              spellcheck={false}
              onInput={(event) => props.set({ new: event.currentTarget.value })}
              onKeyDown={onEnter}
            />
          </Field>
        </div>
      </Show>

      <Show when={props.fields.source === 'ui'}>
        <div class="space-y-2.5">
          <div class="grid gap-2 sm:grid-cols-2">
            <Field label="Before URL" hint="Baseline page — e.g. a production or main-branch preview.">
              <input
                class={INPUT}
                value={props.fields.before}
                placeholder="https://main--app.pages.dev"
                spellcheck={false}
                onInput={(event) => props.set({ before: event.currentTarget.value })}
              />
            </Field>
            <Field label="After URL" hint="Changed page — e.g. a PR preview deployment.">
              <input
                class={INPUT}
                value={props.fields.after}
                placeholder="https://pr-123--app.pages.dev"
                spellcheck={false}
                onInput={(event) => props.set({ after: event.currentTarget.value })}
                onKeyDown={onEnter}
              />
            </Field>
          </div>
          <Field label="Viewport" hint="WxH — defaults to 1280x800. Add ?fullPage=true&threshold=0.1&waitMs=3000 to the URL for more options.">
            <input
              class={INPUT}
              value={props.fields.viewport}
              placeholder="1280x800"
              spellcheck={false}
              onInput={(event) => props.set({ viewport: event.currentTarget.value })}
            />
          </Field>
        </div>
      </Show>

      <div class="flex flex-wrap gap-1.5 rounded-md border border-border bg-background px-2.5 py-2 text-[10px] text-muted-foreground">
        <Badge tone="accent" icon="i-mdi-lightbulb-outline">
          CLI
        </Badge>
        <span class="font-mono">open-in-web diff pr 128</span>
        <span class="font-mono">git HEAD~3</span>
        <span class="font-mono">branch main..feature</span>
        <span class="font-mono">file old.ts new.ts</span>
        <span class="font-mono">ui &lt;before&gt; &lt;after&gt;</span>
      </div>
    </div>
  );
}
