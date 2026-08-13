import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Button } from '../ui';
import { Loader2 } from 'lucide-react';

// Example templates (audit F-P3): one-click presets so syntax is discoverable.
const DIAGRAM_EXAMPLES = [
  { label: 'Flowchart', source: `graph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Done]\n  B -->|No| D[Review]` },
  { label: 'Sequence', source: `sequenceDiagram\n  Customer->>Technician: Bring device\n  Technician-->>Customer: Diagnosis\n  Customer-->>Technician: Approve repair` },
  { label: 'State', source: `stateDiagram-v2\n  [*] --> Receive\n  Receive --> InProgress\n  InProgress --> Finished\n  Finished --> [*]` },
];

// Initialize ONCE outside the component (audit D-P3): the old code re-ran
// mermaid.initialize inside the effect on every keystroke and used
// securityLevel 'loose' (clickable links / raw HTML labels).
mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'base',
  fontFamily: 'Inter, system-ui, sans-serif',
});

export function MermaidModule() {
  const [diagramText, setDiagramText] = useState(`graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Done]
  B -->|No| D[Review]`);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const renderIdRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!previewRef.current) return;

    // Debounce (audit D-P3): fast typing used to interleave two async
    // mermaid.render calls sharing the same id — the second removed the
    // first's temp element → transient "element not found" flashes.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setIsRendering(true);
      const render = async () => {
        try {
          const output = await mermaid.render(renderIdRef.current, diagramText);
          if (previewRef.current) {
            previewRef.current.innerHTML = output.svg;
          }
          setRenderError(null);
        } catch (error) {
          if (previewRef.current) {
            previewRef.current.innerHTML = '';
          }
          setRenderError(error instanceof Error ? error.message : String(error));
        } finally {
          setIsRendering(false);
        }
      };
      void render();
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [diagramText]);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-base font-bold">Mermaid Diagram</h2>
            <p className="mt-1 text-sm text-muted">Edit Mermaid source and preview the rendered diagram instantly.</p>
          </div>
          <label htmlFor="mermaid-editor" className="sr-only">
            Mermaid source
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-muted">Examples:</span>
            {DIAGRAM_EXAMPLES.map((example) => (
              <Button
                key={example.label}
                type="button"
                variant="ghost"
                onClick={() => setDiagramText(example.source)}
                className="h-8 rounded-full border border-line bg-surface px-3 text-xs font-bold text-ink hover:border-brand hover:text-brand"
              >
                {example.label}
              </Button>
            ))}
          </div>
          <textarea
            id="mermaid-editor"
            value={diagramText}
            onChange={(event) => setDiagramText(event.target.value)}
            spellCheck={false}
            className="min-h-[250px] w-full resize-y rounded-xl border border-line bg-white p-4 text-xs font-mono text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
          {renderError ? (
            <div role="alert" className="max-h-40 overflow-auto rounded-2xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              <span className="font-bold">Render error:</span> {renderError}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold">Preview</h3>
        <div className="relative mt-4">
          <div
            role="img"
            aria-label="Rendered Mermaid diagram"
            className="overflow-auto rounded-3xl border border-line/70 bg-surface p-4 min-h-[280px]"
            ref={previewRef}
          />
          {isRendering && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-3xl bg-surface/70 text-sm font-semibold text-muted">
              <Loader2 className="h-4 w-4 animate-spin text-brand" />
              Rendering…
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
