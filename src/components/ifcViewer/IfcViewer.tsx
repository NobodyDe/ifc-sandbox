import type { ChangeEvent } from "react";
import { SensorPopup } from "./SensorPopup";
import { useIfcViewer } from "./useIfcViewer";

export function IfcViewer() {
  const {
    containerRef,
    ready,
    converting,
    progress,
    modelLoaded,
    loadIfcFile,
    fitToModel,
    sensors,
    selected,
    screenPosition,
    clearSelection,
  } = useIfcViewer();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void loadIfcFile(file);
  };

  return (
    <div className="relative h-screen w-full bg-linear-to-b from-slate-200 to-slate-400">
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
          <h2 className="text-sm font-semibold text-slate-900">Sensores</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Clique em um pino para ver as leituras.
          </p>

          <ul className="mt-2 space-y-1">
            {sensors.map((sensor, index) => (
              <li
                key={sensor.id}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                  selected?.sensor.id === sensor.id
                    ? "bg-cyan-100"
                    : "bg-slate-100"
                }`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-[10px] font-bold text-white">
                  {index + 1}
                </span>
                <span className="flex-1 truncate text-slate-600">
                  {sensor.facade} &middot; {sensor.storey}
                </span>
                <span className="font-mono text-slate-500">
                  {sensor.temperature.toFixed(1)}&deg;
                </span>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
