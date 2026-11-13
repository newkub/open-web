import { parse, compileScript, compileTemplate, compileStyle } from '@vue/compiler-sfc';
import type { Loader } from 'esbuild-wasm';

function dirOf(path: string): string {
  const i = path.lastIndexOf('/');
  return i <= 0 ? '/' : path.slice(0, i);
}

export type VueCompileResult =
  | { contents: string; loader: Loader; resolveDir: string }
  | { errors: { text: string }[] };

/**
 * Compile a single-file component to a JS module.
 * - <script setup> + template → compileScript inlineTemplate
 * - options <script> + template → compileTemplate separately, attach .render
 *   (inlineTemplate is ignored for options API — without this the component
 *   mounts but renders nothing: the classic white-screen bug)
 * - template-only → compileTemplate with a default { render } export
 * - <style> blocks → injected as <style> tags at runtime
 */
export function compileVueFile(source: string, filename: string): VueCompileResult {
  const { descriptor, errors } = parse(source, { filename });
  if (errors.length) {
    return { errors: errors.map((e) => ({ text: String(e) })) };
  }
  let js = '';
  const hasScript = !!(descriptor.script || descriptor.scriptSetup);
  const id = `data-v-${filename.replace(/[^a-zA-Z0-9]/g, '')}`;

  if (hasScript) {
    const isSetup = !!descriptor.scriptSetup;
    try {
      const r = compileScript(descriptor, {
        id,
        inlineTemplate: isSetup && !!descriptor.template,
      });
      js += r.content + '\n';
      if (!isSetup && descriptor.template) {
        const t = compileTemplate({
          source: descriptor.template.content,
          filename,
          id,
          compilerOptions: {},
        });
        if (t.errors.length) {
          return { errors: t.errors.map((e) => ({ text: String(e) })) };
        }
        const tpl = t.code
          .replace(/export\s+function\s+render/, 'function render')
          .replace(/export\s+function\s+ssrRender/, 'function ssrRender');
        js += tpl + '\n';
        if (/export\s+default/.test(js)) {
          js = js.replace(/export\s+default/, 'const __sfc_default =')
            + '\n__sfc_default.render = render;\nexport default __sfc_default;\n';
        } else {
          js += '\nconst __sfc_default = {};\n__sfc_default.render = render;\nexport default __sfc_default;\n';
        }
      }
    } catch (e) {
      return { errors: [{ text: `vue compileScript: ${e}` }] };
    }
  }
  if (!hasScript && descriptor.template) {
    try {
      const t = compileTemplate({
        source: descriptor.template.content,
        filename,
        id,
        compilerOptions: {},
      });
      if (t.errors.length) {
        return { errors: t.errors.map((e) => ({ text: String(e) })) };
      }
      js += t.code.replace('export function render', 'function render') + '\nexport default { render };\n';
    } catch (e) {
      return { errors: [{ text: `vue compileTemplate: ${e}` }] };
    }
  }
  // Inject <style> blocks so SFC styles actually apply.
  for (const style of descriptor.styles) {
    try {
      const css = compileStyle({
        source: style.content,
        filename,
        id,
        scoped: style.scoped,
      }).code;
      js += `;(() => { const el = document.createElement('style'); el.textContent = ${JSON.stringify(css)}; document.head.appendChild(el); })();\n`;
    } catch {
      /* style compile failure is non-fatal */
    }
  }
  return { contents: js, loader: 'js' as Loader, resolveDir: dirOf(filename) };
}
