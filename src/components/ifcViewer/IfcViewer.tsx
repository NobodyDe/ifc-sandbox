import type { ChangeEvent } from "react";
import { SensorPopup } from "./SensorPopup";
import { useIfcViewer } from "./useIfcViewer";
import type { SectionAxis } from "./useSectionPlanes";

/**
 * Os eixos em linguagem de obra. X e Z são perpendiculares entre si no plano
 * horizontal, então geram cortes verticais em direções diferentes; Y é o
 * corte na altura, que é a planta baixa.
 */
const SECTION_BUTTONS: { axis: SectionAxis; label: string; hint: string }[] = [
  { axis: "x", label: "Vertical X", hint: "Corta no sentido da largura" },
  { axis: "z", label: "Vertical Z", hint: "Corta no sentido da profundidade" },
  { axis: "y", label: "Horizontal Y", hint: "Planta baixa, corta na altura" },
];

export function IfcViewer() {
  const {
    containerRef,
    ready,
    converting,
    progress,
    modelLoaded,
    loadIfcFile,
    fitToModel,
    selected,
    screenPosition,
    clearSelection,
    sectionCount,
    handlesVisible,
    createSection,
    clearSections,
    toggleHandles,
  } = useIfcViewer();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void loadIfcFile(file);
  };

  // O degradê agora é o céu da cena. O fundo aqui é só o instante antes de o
  // WebGL desenhar o primeiro quadro.
  return (
    <div className="relative h-screen w-full bg-slate-300">
      <div ref={containerRef} className="h-full w-full" />

      {selected && screenPosition && (
        <SensorPopup
          sensor={selected.sensor}
          screenPosition={screenPosition}
          onClose={clearSelection}
        />
      )}

      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4">
        <div className="pointer-events-auto rounded-xl bg-white/85 p-3 shadow-lg ring-1 ring-slate-900/10 backdrop-blur">
          <label className="block text-xs font-medium tracking-wide text-slate-500 uppercase">
            Modelo IFC
          </label>
          <input
            type="file"
            accept=".ifc"
            onChange={handleFileChange}
            disabled={!ready || converting}
            className="mt-1 block text-sm text-slate-700 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700 disabled:opacity-50"
          />
          {!ready && (
            <p className="mt-2 text-sm text-slate-500">
              Iniciando visualizador...
            </p>
          )}
          {converting && (
            <p className="mt-2 text-sm text-slate-600">
              Convertendo IFC... {Math.round(progress * 100)}%
            </p>
          )}
        </div>

        {modelLoaded && (
          <button
            type="button"
            onClick={() => void fitToModel()}
            className="pointer-events-auto rounded-xl bg-white/85 px-3 py-2 text-sm font-medium text-slate-700 shadow-lg ring-1 ring-slate-900/10 backdrop-blur hover:bg-white"
          >
            Enquadrar modelo
          </button>
        )}
      </header>

      {modelLoaded && (
        <aside className="absolute top-24 right-4 w-60 rounded-xl bg-white/85 p-3 shadow-lg ring-1 ring-slate-900/10 backdrop-blur">
          <h2 className="text-sm font-semibold text-slate-900">Cortes</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            O corte nasce no meio do modelo. Arraste a seta para deslocá-lo.
          </p>

          <div className="mt-2 space-y-1">
            {SECTION_BUTTONS.map(({ axis, label, hint }) => (
              <button
                key={axis}
                type="button"
                title={hint}
                onClick={() => createSection(axis)}
                className="flex w-full items-center justify-between rounded-md bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                {label}
                <span aria-hidden className="text-slate-400">
                  +
                </span>
              </button>
            ))}
          </div>

          <div className="mt-3 border-t border-slate-200 pt-2">
            <p className="text-xs text-slate-500">
              {sectionCount === 0
                ? "Nenhum corte ativo"
                : `${sectionCount} corte${sectionCount > 1 ? "s" : ""} ativo${sectionCount > 1 ? "s" : ""}`}
            </p>

            <div className="mt-2 space-y-1">
              <button
                type="button"
                onClick={toggleHandles}
                disabled={sectionCount === 0}
                className="w-full rounded-md bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100"
              >
                {handlesVisible ? "Ocultar alças" : "Mostrar alças"}
              </button>
              <button
                type="button"
                onClick={clearSections}
                disabled={sectionCount === 0}
                className="w-full rounded-md bg-slate-900 px-2 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-900"
              >
                Remover cortes
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
