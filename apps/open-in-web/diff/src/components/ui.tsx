import { For, Show, createUniqueId, type JSX } from 'solid-js';

type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  default:
    'border border-border bg-surface text-secondary-foreground hover:border-border-hover hover:bg-secondary',
  primary:
    'border border-transparent bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm',
  ghost: 'border border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground',
  danger:
    'border border-transparent text-destructive hover:bg-muted hover:text-destructive',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-7 px-2 text-[11px]',
  md: 'h-8 px-3 text-xs',
};

export const INPUT =
  'h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs outline-none transition-colors placeholder:text-muted-foreground hover:border-border-hover focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus';

export function Button(props: {
  children: JSX.Element;
  onClick?: (event: MouseEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  title?: string;
  type?: 'button' | 'submit';
  ariaLabel?: string;
  ariaExpanded?: boolean;
  ariaHasPopup?: 'menu' | 'dialog' | 'listbox';
  ariaControls?: string;
  ariaPressed?: boolean;
  ref?: (element: HTMLButtonElement) => void;
}) {
  return (
    <button
      ref={props.ref}
      type={props.type ?? 'button'}
      title={props.title}
      aria-label={props.ariaLabel}
      aria-expanded={props.ariaExpanded}
      aria-haspopup={props.ariaHasPopup}
      aria-controls={props.ariaControls}
      aria-pressed={props.ariaPressed}
      disabled={props.disabled}
      onClick={props.onClick}
      class={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:pointer-events-none disabled:opacity-50 ${BUTTON_SIZES[props.size ?? 'md']} ${BUTTON_VARIANTS[props.variant ?? 'default']}`}
    >
      {props.children}
    </button>
  );
}

export function IconButton(props: {
  icon: string;
  label: string;
  onClick?: (event: MouseEvent) => void;
  active?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
}) {
  const size = () => (props.size === 'sm' ? 'size-7 text-base' : 'size-8 text-lg');
  return (
    <button
      type="button"
      title={props.label}
      aria-label={props.label}
      aria-pressed={props.active === undefined ? undefined : props.active}
      disabled={props.disabled}
      onClick={props.onClick}
      class={`grid shrink-0 place-items-center rounded-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:pointer-events-none disabled:opacity-40 ${size()} ${
        props.active
          ? 'bg-secondary text-foreground'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
      }`}
    >
      <span class={props.icon} aria-hidden="true" />
    </button>
  );
}

export function Segmented<T extends string>(props: {
  value: T;
  options: { value: T; label: string; icon?: string }[];
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <div
      role="group"
      aria-label={props.label}
      class="inline-flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5"
    >
      <For each={props.options}>
        {(option) => (
          <button
            type="button"
            aria-pressed={props.value === option.value}
            onClick={() => props.onChange(option.value)}
            class={`inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus ${
              props.value === option.value
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Show when={option.icon}>
              <span class={`${option.icon} text-sm`} aria-hidden="true" />
            </Show>
            {option.label}
          </button>
        )}
      </For>
    </div>
  );
}

export function Select(props: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  label?: string;
  class?: string;
}) {
  return (
    <label class={`relative inline-flex items-center ${props.class ?? ''}`}>
      <select
        aria-label={props.label}
        value={props.value}
        onChange={(event) => props.onChange(event.currentTarget.value)}
        class="h-8 w-full appearance-none rounded-md border border-border bg-surface pr-7 pl-2.5 text-xs text-secondary-foreground outline-none transition-colors hover:border-border-hover focus-visible:ring-2 focus-visible:ring-focus"
      >
        <For each={props.options}>
          {(option) => <option value={option.value}>{option.label}</option>}
        </For>
      </select>
      <span
        class="i-mdi-chevron-down pointer-events-none absolute right-1.5 text-sm text-muted-foreground"
        aria-hidden="true"
      />
    </label>
  );
}

export function SwitchRow(props: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const descriptionId = createUniqueId();
  return (
    <div class="flex items-center justify-between gap-4 py-1.5">
      <div class="min-w-0">
        <div class="text-xs font-medium">{props.label}</div>
        <Show when={props.description}>
          <div id={descriptionId} class="mt-0.5 text-[10px] leading-snug text-muted-foreground">
            {props.description}
          </div>
        </Show>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={props.checked}
        aria-label={props.label}
        aria-describedby={props.description ? descriptionId : undefined}
        onClick={() => props.onChange(!props.checked)}
        class={`relative h-5 w-9 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus ${
          props.checked ? 'bg-accent' : 'bg-border'
        }`}
      >
        <span
          aria-hidden="true"
          class={`absolute top-0.5 size-4 rounded-full bg-surface shadow-sm transition-transform ${
            props.checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

const TONES = {
  neutral: 'bg-muted text-muted-foreground',
  success: 'bg-muted text-success',
  warning: 'bg-muted text-warning',
  danger: 'bg-muted text-destructive',
  accent: 'bg-muted text-accent',
  primary: 'bg-muted text-primary',
} as const;

export function Badge(props: {
  children: JSX.Element;
  tone?: keyof typeof TONES;
  icon?: string;
}) {
  return (
    <span
      class={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${TONES[props.tone ?? 'neutral']}`}
    >
      <Show when={props.icon}>
        <span class={`${props.icon} text-xs`} aria-hidden="true" />
      </Show>
      {props.children}
    </span>
  );
}

export function Kbd(props: { children: JSX.Element }) {
  return (
    <kbd class="inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground">
      {props.children}
    </kbd>
  );
}

export function Spinner(props: { class?: string }) {
  return (
    <span
      aria-hidden="true"
      class={`i-mdi-loading animate-spin text-muted-foreground ${props.class ?? ''}`}
    />
  );
}
