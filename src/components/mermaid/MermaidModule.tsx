import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

export function MermaidModule() {
  const [diagramText, setDiagramText] = useState(`graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Done]
  B -->|No| D[Review]`);
  const [renderError, setRenderError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const renderIdRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!previewRef.current) return;

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: 'base',
      fontFamily: 'Inter, system-ui, sans-serif',
    });

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
      }
    };

    void render();
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
          <textarea
            id="mermaid-editor"
            value={diagramText}
            onChange={(event) => setDiagramText(event.target.value)}
            spellCheck={false}
            className="min-h-[250px] w-full rounded-3xl border border-line bg-surface p-4 text-xs font-mono text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
          {renderError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <span className="font-bold">Render error:</span> {renderError}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold">Preview</h3>
        <div className="mt-4 overflow-auto rounded-3xl border border-line/70 bg-surface p-4 min-h-[280px]" ref={previewRef} />
      </section>
    </div>
  );
}
