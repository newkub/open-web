import { defineConfig, presetIcons, transformerDirectives, transformerVariantGroup } from 'unocss';
import { presetWind4 } from '@unocss/preset-wind4';

const token = (name: string) => `hsl(var(--color-${name}))`;

export default defineConfig({
  presets: [
    presetWind4({ dark: 'class' }),
    presetIcons({
      scale: 1.1,
      extraProperties: {
        display: 'inline-block',
        'vertical-align': 'middle',
      },
    }),
  ],
  transformers: [transformerVariantGroup(), transformerDirectives()],
  theme: {
    colors: {
      background: token('background'),
      foreground: token('foreground'),
      surface: {
        DEFAULT: token('surface'),
        elevated: token('surface-elevated'),
        foreground: token('surface-foreground'),
      },
      muted: {
        DEFAULT: token('muted'),
        foreground: token('muted-foreground'),
      },
      border: {
        DEFAULT: token('border'),
        hover: token('border-hover'),
      },
      accent: {
        DEFAULT: token('accent'),
        hover: token('accent-hover'),
        foreground: token('accent-foreground'),
      },
      primary: {
        DEFAULT: token('primary'),
        hover: token('primary-hover'),
        foreground: token('primary-foreground'),
      },
      secondary: {
        DEFAULT: token('secondary'),
        hover: token('secondary-hover'),
        foreground: token('secondary-foreground'),
      },
      success: {
        DEFAULT: token('success'),
        hover: token('success-hover'),
        foreground: token('success-foreground'),
      },
      warning: {
        DEFAULT: token('warning'),
        hover: token('warning-hover'),
        foreground: token('warning-foreground'),
      },
      destructive: {
        DEFAULT: token('destructive'),
        hover: token('destructive-hover'),
        foreground: token('destructive-foreground'),
      },
      focus: token('focus'),
      overlay: token('overlay'),
      skeleton: {
        DEFAULT: token('skeleton'),
        shine: token('skeleton-shine'),
      },
    },
    radius: {
      sm: 'var(--radius-sm)',
      md: 'var(--radius-md)',
      lg: 'var(--radius-lg)',
      xl: 'var(--radius-xl)',
    },
    shadow: {
      sm: 'var(--shadow-sm)',
      md: 'var(--shadow-md)',
      lg: 'var(--shadow-lg)',
    },
    font: {
      sans: 'var(--font-sans)',
      mono: 'var(--font-mono)',
    },
  },
});
