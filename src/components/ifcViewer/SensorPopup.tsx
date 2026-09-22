import type { Sensor } from "./types";

type Props = {
  sensor: Sensor;
  /** Posição do pino em pixels, já projetada da cena 3D para a tela. */
  screenPosition: { x: number; y: number };
  onClose: () => void;
};

/**
 * O balão de informações do sensor.
 *
 * É HTML comum posicionado em cima do canvas: mais simples de estilizar e de
 * tornar acessível do que desenhar texto dentro da cena 3D. Quem o mantém
 * grudado no pino é a projeção feita em `useSensorSelection`.
 */
export function SensorPopup({ sensor, screenPosition, onClose }: Props) {
  return (
    <div
      className="pointer-events-auto absolute z-10 w-60 -translate-x-1/2 -translate-y-[calc(100%+20px)] rounded-xl bg-white/95 p-3 shadow-xl ring-1 ring-slate-900/10 backdrop-blur"
      style={{ left: screenPosition.x, top: screenPosition.y }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{sensor.name}</h3>
          <p className="text-xs text-slate-500">
            {sensor.facade} &middot; {sensor.storey}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="-mt-1 text-lg leading-none text-slate-400 hover:text-slate-700"
        >
          &times;
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-orange-50 p-2">
          <dt className="text-[10px] font-medium tracking-wide text-orange-700 uppercase">
            Temperatura
          </dt>
          <dd className="text-lg font-semibold text-orange-900">
            {sensor.temperature.toFixed(1)} &deg;C
          </dd>
        </div>
        <div className="rounded-lg bg-sky-50 p-2">
          <dt className="text-[10px] font-medium tracking-wide text-sky-700 uppercase">
            Umidade
          </dt>
          <dd className="text-lg font-semibold text-sky-900">
            {sensor.humidity.toFixed(0)} %
          </dd>
        </div>
      </dl>

      <p className="mt-2 font-mono text-[10px] text-slate-400">
        cota {sensor.elevation.toFixed(2)} m
      </p>

      {/* Bico do balão apontando para o pino. */}
      <div className="absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white/95 ring-1 ring-slate-900/10 [clip-path:polygon(100%_0,100%_100%,0_100%)]" />
    </div>
  );
}
