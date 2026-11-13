import { Show } from 'solid-js';
import type { DiffSource } from '../types';
import { useActions } from '../lib/use-actions';
import { useChecks } from '../lib/use-checks';
import { useDiff } from '../lib/use-diff';
import { useOptions } from '../lib/use-options';
import { useOverlays } from '../lib/use-overlays';
import { usePrActions } from '../lib/use-pr-actions';
import { useShortcuts } from '../lib/use-shortcuts';
import { useToast } from '../lib/use-toast';
import { sourceLabel } from '../lib/source';
import { useWorkbench } from '../lib/use-workbench';
import Banners from './Banners';
import CommentDialog from './CommentDialog';
import ConfirmDialog from './ConfirmDialog';
import DiffPanel, { type ViewerApi } from './DiffPanel';
import EmptyState from './EmptyState';
import Header from './Header';
import HelpModal from './HelpModal';
import OptionsPanel from './OptionsPanel';
import Sidebar from './Sidebar';
import SourceDialog from './SourceDialog';
import StatusBar from './StatusBar';
import ToastView from './Toast';
import Toolbar, { THEME_MODE_ICON } from './Toolbar';
import UiDiffPanel from './UiDiffPanel';

export default function App() {
  const { options, update, reset, isDark, cycleTheme } = useOptions();
  const diff = useDiff();
  const checks = useChecks();
  const { toast, notify } = useToast();
  const overlays = useOverlays();
  let viewerApi: ViewerApi | null = null;

  const viewer = useWorkbench(diff, checks, (id) => viewerApi?.scrollTo(id), () => options().layout);
  const actions = useActions(() => viewer.source());
  const pr = usePrActions(actions, viewer.reload, notify);

  const focusSearch = () => {
    if (!options().sidebar) update({ sidebar: true });
    setTimeout(() => document.getElementById('file-search')?.focus(), 0);
  };

  const closeOverlays = () => {
    if (pr.pending()) {
      pr.setPending(null);
      return true;
    }
    if (pr.commentOpen()) {
      pr.setCommentOpen(false);
      return true;
    }
    return overlays.closeOverlays();
  };

  const overlayOpen = () => overlays.active() !== null || pr.commentOpen() || !!pr.pending();

  useShortcuts(() => ({
    openHelp: overlays.openHelp,
    openOptions: overlays.openOptions,
    closeOverlays,
    overlayOpen,
    focusSearch,
    cycleTheme,
    toggleSidebar: () => update({ sidebar: !options().sidebar }),
    toggleStyle: () => update({ diffStyle: options().diffStyle === 'split' ? 'unified' : 'split' }),
    toggleWrap: () => update({ wrap: !options().wrap }),
    toggleLayout: () => update({ layout: options().layout === 'all' ? 'focus' : 'all' }),
    nextFile: () => viewer.stepFile(1),
    previousFile: () => viewer.stepFile(-1),
    reload: viewer.reload,
  }));

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify('success', 'Link copied to the clipboard');
    } catch {
      notify('danger', 'Could not access the clipboard');
    }
  };

  const statusInfo = () => {
    if (diff.loading() && !diff.data()) return { label: 'Loading diff…', tone: 'accent' as const };
    if (diff.error()) return { label: 'Load failed', tone: 'danger' as const };
    if (!viewer.source()) return { label: 'No source selected', tone: 'warning' as const };
    if (viewer.source()!.kind === 'ui') {
      const ui = diff.data()?.ui;
      return {
        label: ui ? `UI diff · ${ui.width}×${ui.height} · ${(ui.mismatch * 100).toFixed(2)}% differ` : 'UI diff',
        tone: ui && ui.mismatch === 0 ? ('success' as const) : ('warning' as const),
      };
    }
    const totals = diff.totals();
    return {
      label: `${sourceLabel(viewer.source()!)} · ${diff.fileList().length} files · +${totals.add} −${totals.del}`,
      tone: 'success' as const,
    };
  };

  return (
    <div class="flex h-full flex-col overflow-hidden bg-background text-foreground">
      <div class="flex min-h-0 flex-1 flex-col" inert={overlayOpen()}>
        <a href="#diff-region" class="skip-link">
          Skip to diff content
        </a>

        <Header
          source={viewer.source()}
          data={diff.data()}
          checks={checks.checks()}
          busy={actions.busy()}
          themeMode={options().themeMode}
          themeIcon={THEME_MODE_ICON[options().themeMode]}
          onOpenSource={overlays.openSource}
          onOpenOptions={overlays.openOptions}
          onOpenHelp={overlays.openHelp}
          onCycleTheme={cycleTheme}
          onRefresh={viewer.reload}
          onCopy={() => void copyLink()}
          onAction={pr.requestAction}
          onComment={() => pr.setCommentOpen(true)}
        />

        <Banners
          error={diff.error()}
          unparsed={diff.fileList().length - diff.metas().filter(Boolean).length}
          onRetry={viewer.reload}
        />

        <main class="flex min-h-0 flex-1">
          <Show when={options().sidebar && viewer.source() && viewer.source()!.kind !== 'ui'}>
            <Sidebar
              files={diff.fileList()}
              indices={viewer.indices()}
              metas={diff.metas()}
              activeIdx={viewer.activeIdx()}
              viewed={viewer.viewed()}
              query={viewer.query()}
              status={viewer.status()}
              sort={viewer.sort()}
              treeView={viewer.treeView()}
              hideViewed={viewer.hideViewed()}
              total={diff.fileList().length}
              onQuery={viewer.setQuery}
              onStatus={viewer.setStatus}
              onSort={viewer.setSort}
              onTreeView={viewer.setTreeView}
              onHideViewed={viewer.setHideViewed}
              onSelect={viewer.selectFile}
              onToggleViewed={(idx) => viewer.toggleViewed(idx)}
              onMarkAll={viewer.markAllViewed}
            />
          </Show>

          <section
            id="diff-region"
            tabindex="-1"
            aria-label="Diff viewer"
            class="flex min-w-0 flex-1 flex-col outline-none"
          >
            <Show
              when={viewer.source()?.kind === 'ui' && viewer.source()}
              fallback={
                <Show
                  when={viewer.source()}
                  fallback={<EmptyState onOpen={overlays.openSource} onOpenHelp={overlays.openHelp} />}
                >
              <Toolbar
                options={options()}
                activeFile={viewer.activeFile()}
                activeIdx={viewer.activeIdx()}
                visible={viewer.indices().length}
                total={diff.fileList().length}
                onUpdate={update}
                onPrev={() => viewer.stepFile(-1)}
                onNext={() => viewer.stepFile(1)}
                onOpenOptions={overlays.openOptions}
              />

              <DiffPanel
                items={viewer.viewerItems()}
                options={options()}
                isDark={isDark()}
                source={viewer.source()}
                sourceKey={viewer.sourceKey()}
                cacheKey={viewer.cacheKey()}
                loading={diff.loading()}
                scrollTarget={viewer.scrollTarget()}
                activeFile={viewer.activeFile()}
                activeVisible={viewer.activeVisible()}
                focus={options().layout === 'focus'}
                onApi={(api) => {
                  viewerApi = api;
                }}
              />
                </Show>
              }
            >
              <UiDiffPanel
                source={viewer.source() as Extract<DiffSource, { kind: 'ui' }>}
                ui={diff.data()?.ui}
                loading={diff.loading()}
              />
            </Show>
          </section>
        </main>

        <StatusBar options={options()} status={statusInfo()} onOpenHelp={overlays.openHelp} />
      </div>

      <OptionsPanel
        open={overlays.isOpen('options')}
        options={options()}
        update={update}
        reset={reset}
        close={overlays.close}
      />

      <SourceDialog
        open={overlays.isOpen('source')}
        current={viewer.source()}
        onApply={(next) => {
          viewer.open(next);
          overlays.close();
        }}
        onClose={overlays.close}
      />

      <HelpModal open={overlays.isOpen('help')} onClose={overlays.close} />

      <CommentDialog
        open={pr.commentOpen()}
        busy={actions.busy() === 'comment'}
        onClose={() => pr.setCommentOpen(false)}
        onSubmit={(body) => void pr.submitComment(body)}
      />

      <ConfirmDialog
        open={!!pr.pending()}
        title={pr.pending()?.title ?? ''}
        message={pr.pending()?.message ?? ''}
        confirmLabel={pr.pending()?.confirm ?? 'Confirm'}
        danger={pr.pending()?.danger ?? false}
        busy={!!actions.busy()}
        onConfirm={pr.confirmPending}
        onClose={() => pr.setPending(null)}
      />

      <ToastView toast={toast()} />
    </div>
  );
}
