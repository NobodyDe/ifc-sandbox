import { useEffect, type RefObject } from "react";
import * as OBC from "@thatopen/components";
import * as THREE from "three";
import type { IfcWorld } from "./types";

type Params = {
  containerRef: RefObject<HTMLDivElement | null>;
  componentsRef: RefObject<OBC.Components | null>;
  worldRef: RefObject<IfcWorld | null>;
  modelRootRef: RefObject<THREE.Object3D | null>;
  enabled: boolean;
};

/**
 * Ferramenta de desenvolvimento: shift + clique no modelo escreve no console a
 * coordenada local do ponto atingido, já pronta para colar em `sensorsData.ts`.
 *
 * Existe porque escolher a posição de um sensor "no olho" é inviável — este é o
 * caminho prático para descobrir onde cada ponto da fachada realmente fica.
 * Pode ser removido sem afetar mais nada do visualizador.
 */
export function useCoordinateProbe({
  containerRef,
  componentsRef,
  worldRef,
  modelRootRef,
  enabled,
}: Params) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    const handleClick = async (event: PointerEvent) => {
      if (!event.shiftKey) return;

      const components = componentsRef.current;
      const world = worldRef.current;
      const modelRoot = modelRootRef.current;
      if (!components || !world || !modelRoot) return;

      const bounds = container.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );

      const hit = await components
        .get(OBC.Raycasters)
        .get(world)
        .castRay({ position: ndc });
      if (!hit) return;

      // O clique devolve coordenadas de mundo; a inversa da matriz do grupo pai
      // traz o ponto de volta ao sistema do modelo, que é onde os sensores vivem.
      const local = modelRoot.worldToLocal(hit.point.clone());
      console.log(
        `new THREE.Vector3(${local.x.toFixed(2)}, ${local.y.toFixed(2)}, ${local.z.toFixed(2)})`,
      );
    };

    container.addEventListener("pointerup", handleClick);
    return () => container.removeEventListener("pointerup", handleClick);
  }, [containerRef, componentsRef, worldRef, modelRootRef, enabled]);
}
