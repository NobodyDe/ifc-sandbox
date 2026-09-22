import { useCallback, useEffect, useState, type RefObject } from "react";
import * as OBC from "@thatopen/components";
import * as THREE from "three";
import type { IfcWorld } from "./types";

/**
 * Eixo perpendicular ao plano de corte.
 *
 * X e Z dão cortes verticais (fatiam o prédio de cima a baixo); Y dá o corte
 * horizontal, que é a planta baixa. O nome é o do eixo, e não "vertical" ou
 * "horizontal", porque é o eixo que define o plano — a leitura em linguagem de
 * obra fica por conta da interface.
 */
export type SectionAxis = "x" | "y" | "z";

const AXIS_NORMALS: Record<SectionAxis, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

/** Folga da alça do plano em relação ao modelo, para ela sobrar das bordas. */
const HANDLE_SIZE_FACTOR = 1.2;

type Params = {
  componentsRef: RefObject<OBC.Components | null>;
  worldRef: RefObject<IfcWorld | null>;
  worldBoxRef: RefObject<THREE.Box3 | null>;
  enabled: boolean;
};

/**
 * Cortes de seção do modelo, sobre o `Clipper`.
 *
 * Separado do `useIfcViewer` pelo mesmo motivo dos outros hooks: um motivo só
 * para mudar. Aqui mora tudo que é plano de corte — criar, remover, esconder a
 * alça — e nada além disso.
 */
export function useSectionPlanes({
  componentsRef,
  worldRef,
  worldBoxRef,
  enabled,
}: Params) {
  const [sectionCount, setSectionCount] = useState(0);
  const [handlesVisible, setHandlesVisible] = useState(true);

  useEffect(() => {
    const components = componentsRef.current;
    const world = worldRef.current;
    const renderer = world?.renderer;
    if (!components || !world || !renderer || !enabled) return;

    const clipper = components.get(OBC.Clipper);
    clipper.enabled = true;

    // Arrastar a alça muda a imagem a cada movimento do ponteiro. Em vez de
    // pedir um quadro em cada evento de arrasto, devolvemos o renderer para
    // automático enquanto dura o gesto — é o único trecho em que quadro
    // contínuo se justifica.
    const startDragging = () => {
      renderer.mode = OBC.RendererMode.AUTO;
    };
    const stopDragging = () => {
      renderer.mode = OBC.RendererMode.MANUAL;
      renderer.needsUpdate = true;
    };

    clipper.onBeforeDrag.add(startDragging);
    clipper.onAfterDrag.add(stopDragging);

    return () => {
      clipper.onBeforeDrag.remove(startDragging);
      clipper.onAfterDrag.remove(stopDragging);
      clipper.deleteAll();
      clipper.enabled = false;
      renderer.mode = OBC.RendererMode.MANUAL;
      setSectionCount(0);
    };
  }, [componentsRef, worldRef, enabled]);

  const createSection = useCallback(
    (axis: SectionAxis) => {
      const components = componentsRef.current;
      const world = worldRef.current;
      const box = worldBoxRef.current;
      if (!components || !world || !box) return;

      const clipper = components.get(OBC.Clipper);

      // A alça precisa acompanhar a escala do modelo: no tamanho padrão ela
      // sumiria dentro de um prédio de dezenas de metros.
      const span = box.getSize(new THREE.Vector3());
      clipper.config.size =
        Math.max(span.x, span.y, span.z) * HANDLE_SIZE_FACTOR;

      // O corte nasce no meio do modelo, que é onde ele mostra alguma coisa —
      // numa borda ele não cortaria nada. `clone()` porque o plano guarda a
      // referência do vetor que recebe.
      clipper.createFromNormalAndCoplanarPoint(
        world,
        AXIS_NORMALS[axis].clone(),
        box.getCenter(new THREE.Vector3()),
      );

      setSectionCount(clipper.list.size);
      if (world.renderer) world.renderer.needsUpdate = true;
    },
    [componentsRef, worldRef, worldBoxRef],
  );

  const clearSections = useCallback(() => {
    const components = componentsRef.current;
    const world = worldRef.current;
    if (!components) return;

    components.get(OBC.Clipper).deleteAll();
    setSectionCount(0);
    if (world?.renderer) world.renderer.needsUpdate = true;
  }, [componentsRef, worldRef]);

  /**
   * Esconde a alça sem desfazer o corte: serve para conferir o resultado ou
   * tirar uma imagem sem o plano azul na frente.
   */
  const toggleHandles = useCallback(() => {
    const components = componentsRef.current;
    const world = worldRef.current;
    if (!components) return;

    const clipper = components.get(OBC.Clipper);
    const visible = !clipper.visible;
    clipper.visible = visible;
    setHandlesVisible(visible);
    if (world?.renderer) world.renderer.needsUpdate = true;
  }, [componentsRef, worldRef]);

  return {
    sectionCount,
    handlesVisible,
    createSection,
    clearSections,
    toggleHandles,
  };
}
