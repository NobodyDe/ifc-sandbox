import { useCallback, useEffect, useState, type RefObject } from "react";
import * as OBC from "@thatopen/components";
import * as THREE from "three";
import type { SensorMarkers } from "./sensorMarkers";
import type { IfcWorld, SelectedSensor, Sensor } from "./types";

/** Deslocamento máximo, em pixels, para um pointerup ainda contar como clique. */
const CLICK_TOLERANCE_PX = 4;

type Params = {
  containerRef: RefObject<HTMLDivElement | null>;
  componentsRef: RefObject<OBC.Components | null>;
  worldRef: RefObject<IfcWorld | null>;
  markersRef: RefObject<SensorMarkers | null>;
  sensors: Sensor[];
  enabled: boolean;
};

/**
 * Converte um ponto do mundo 3D para pixels dentro do container.
 *
 * `project` leva o ponto até o espaço de recorte normalizado (NDC), onde a
 * tela vai de -1 a 1 nos dois eixos e o Y aponta para cima. As duas linhas
 * seguintes remapeiam isso para pixels com o Y apontando para baixo, que é
 * como o CSS posiciona elementos.
 */
function projectToScreen(
  worldPosition: THREE.Vector3,
  camera: THREE.Camera,
  container: HTMLElement,
) {
  const ndc = worldPosition.clone().project(camera);
  const { width, height } = container.getBoundingClientRect();
  return {
    x: (ndc.x * 0.5 + 0.5) * width,
    y: (-ndc.y * 0.5 + 0.5) * height,
  };
}

/** Posição do ponteiro em NDC, que é o formato que o raycaster espera. */
function toNdc(event: PointerEvent, container: HTMLElement) {
  const bounds = container.getBoundingClientRect();
  return new THREE.Vector2(
    ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
    -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
  );
}

/**
 * Cuida da interação com os sensores: descobrir qual pino foi clicado e manter
 * a posição do popup grudada nele enquanto a câmera se move. Fica separado do
 * `useIfcViewer` para que cada hook tenha um motivo só para mudar.
 */
export function useSensorSelection({
  containerRef,
  componentsRef,
  worldRef,
  markersRef,
  sensors,
  enabled,
}: Params) {
  const [selected, setSelected] = useState<SelectedSensor | null>(null);
  const [screenPosition, setScreenPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const clearSelection = useCallback(() => setSelected(null), []);

  // Um clique só conta se o ponteiro praticamente não andou entre o pointerdown
  // e o pointerup — senão orbitar a câmera abriria popups sem querer.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    let origin: { x: number; y: number } | null = null;

    const handlePointerDown = (event: PointerEvent) => {
      origin = { x: event.clientX, y: event.clientY };
    };

    const handlePointerUp = (event: PointerEvent) => {
      const start = origin;
      origin = null;
      if (!start) return;

      const travelled = Math.hypot(
        event.clientX - start.x,
        event.clientY - start.y,
      );
      if (travelled > CLICK_TOLERANCE_PX) return;

      const components = componentsRef.current;
      const world = worldRef.current;
      const markers = markersRef.current;
      if (!components || !world || !markers) return;

      const raycaster = components.get(OBC.Raycasters).get(world);
      const hit = raycaster.castRayToObjects(
        markers.pickables,
        toNdc(event, container),
      );

      if (!hit) {
        setSelected(null);
        return;
      }

      const sensorId = hit.object.userData.sensorId as string;
      const sensor = sensors.find((item) => item.id === sensorId);
      if (!sensor) return;

      setSelected({
        sensor,
        worldPosition: hit.object.getWorldPosition(new THREE.Vector3()),
      });
    };

    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("pointerup", handlePointerUp);

    return () => {
      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("pointerup", handlePointerUp);
    };
  }, [containerRef, componentsRef, worldRef, markersRef, sensors, enabled]);

  // O popup é HTML comum: para ele seguir o pino, reprojetamos a posição a cada
  // movimento de câmera. É o mesmo evento que o fragments usa para atualizar o
  // nível de detalhe do modelo.
  useEffect(() => {
    const world = worldRef.current;
    const container = containerRef.current;
    const markers = markersRef.current;

    markers?.setSelected(selected?.sensor.id ?? null);
    world?.renderer?.update();

    if (!world || !container || !selected) {
      setScreenPosition(null);
      return;
    }

    const update = () =>
      setScreenPosition(
        projectToScreen(selected.worldPosition, world.camera.three, container),
      );

    update();
    world.camera.controls.addEventListener("update", update);
    window.addEventListener("resize", update);

    return () => {
      world.camera.controls.removeEventListener("update", update);
      window.removeEventListener("resize", update);
    };
  }, [selected, worldRef, containerRef, markersRef]);

  return { selected, screenPosition, clearSelection };
}
