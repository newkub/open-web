import { loadRepo } from '../github';

const EXAMPLES = [
  { label: 'lzm0x219/template-vite-react', hint: 'React + Vite starter — preview works' },
  { label: 'micahlt/vite-vue3-simple-starter', hint: 'Vue 3 + Vite starter — preview works' },
  { label: 'solidjs/templates/tree/main/js', hint: 'SolidJS + Vite template — preview works' },
  { label: 'expressjs/express', hint: 'Minimal Node.js web framework' },
  { label: 'sindresorhus/ky', hint: 'Tiny fetch-based HTTP client' },
  { label: 'colinhacks/zod', hint: 'TypeScript-first schema validation' },
];

export function Welcome() {
  return (
    <div className="welcome">
      <div className="welcome-card">
        <div className="welcome-logo">⬒</div>
        <h1>stackbox</h1>
        <p className="welcome-sub">
          Paste a GitHub URL above to open a project — files load into a Rust/WASM
          virtual filesystem, edit in place, and explore from the terminal.
        </p>
        <div className="welcome-examples">
          <div className="examples-title">Try an example</div>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              className="example-chip"
              onClick={() => void loadRepo(`https://github.com/${ex.label}`)}
              title={ex.hint}
            >
              <span className="example-label">{ex.label}</span>
              <span className="example-hint">{ex.hint}</span>
            </button>
          ))}
        </div>
        <div className="welcome-keys">
          <span><kbd>Ctrl</kbd>+<kbd>`</kbd> terminal</span>
          <span><kbd>Ctrl</kbd>+<kbd>S</kbd> save</span>
          <span><kbd>Ctrl</kbd>+<kbd>P</kbd> quick open</span>
        </div>
      </div>
    </div>
  );
}
