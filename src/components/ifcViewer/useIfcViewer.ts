import { useCallback, useEffect, useRef, useState } from "react";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as THREE from "three";
import {
  MODEL_ALIGNMENT_Y,
  alignGridToModelBase,
  centerModelHorizontally,
  fitCameraToBox,
  getWorldBox,
} from "./sceneFraming";
import { setupPostproduction } from "./postproduction";
import { castShadowsOnModel, setupShadowedScene } from "./sceneShadows";
import { createSkyTexture } from "./skyGradient";
import { SensorMarkers } from "./sensorMarkers";
import { SENSORS } from "./sensorsData";
import { useCoordinateProbe } from "./useCoordinateProbe";
import { useSectionPlanes } from "./useSectionPlanes";
import { useSensorSelection } from "./useSensorSelection";
import type { IfcWorld } from "./types";

export function useIfcViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const componentsRef = useRef<OBC.Components | null>(null);
  const worldRef = useRef<IfcWorld | null>(null);
  const ifcLoaderRef = useRef<OBC.IfcLoader | null>(null);
  const gridRef = useRef<OBC.SimpleGrid | null>(null);
  const markersRef = useRef<SensorMarkers | null>(null);

  /**
   * Grupo que carrega o modelo e os sensores juntos. Girando só este grupo, a
   * fachada fica paralela ao grid e os pinos acompanham sem nenhuma conta
   * extra — é o grafo de cena do three.js fazendo o trabalho.
   */
  const modelRootRef = useRef<THREE.Group | null>(null);
  const worldBoxRef = useRef<THREE.Box3 | null>(null);

  const [ready, setReady] = useState(false);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [modelLoaded, setModelLoaded] = useState(false);

  const selection = useSensorSelection({
    containerRef,
    componentsRef,
    worldRef,
    markersRef,
    sensors: SENSORS,
    enabled: modelLoaded,
  });

  useCoordinateProbe({
    containerRef,
    componentsRef,
    worldRef,
    modelRootRef,
    enabled: modelLoaded,
  });

  const sections = useSectionPlanes({
    componentsRef,
    worldRef,
    worldBoxRef,
    enabled: modelLoaded,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    const components = new OBC.Components();
    componentsRef.current = components;

    const worlds = components.get(OBC.Worlds);
    const world = worlds.create<
      OBC.ShadowedScene,
      OBC.OrthoPerspectiveCamera,
      OBF.PostproductionRenderer
    >();
    worldRef.current = world;

    world.scene = new OBC.ShadowedScene(components);

    // Sem `antialias`: o WebGL só aplica MSAA no canvas, e com pós-processamento
    // nada é desenhado direto nele. O SMAA do pós cobre isso.
    const renderer = new OBF.PostproductionRenderer(components, container);
    world.renderer = renderer;
    world.camera = new OBC.OrthoPerspectiveCamera(components);

    components.init();

    const modelRoot = new THREE.Group();
    modelRoot.rotation.y = MODEL_ALIGNMENT_Y;
    world.scene.three.add(modelRoot);
    modelRootRef.current = modelRoot;

    const markers = new SensorMarkers(SENSORS);
    modelRoot.add(markers.object);
    markersRef.current = markers;

    void world.camera.controls.setLookAt(15, 15, 15, 0, 0, 0);

    const grid = components.get(OBC.Grids).create(world);
    grid.config.color = new THREE.Color("#94a3b8");
    gridRef.current = grid;

    setupShadowedScene(world.scene, renderer, grid);
    setupPostproduction(renderer, grid);

    // O renderer passou a desenhar sob demanda, então tudo que muda a imagem
    // precisa pedir um quadro. Mexer na geometria ou na luz também invalida o
    // mapa de sombra; girar a câmera, não.
    const requestFrame = () => {
      renderer.needsUpdate = true;
    };
    const requestFrameWithShadows = () => {
      renderer.three.shadowMap.needsUpdate = true;
      renderer.needsUpdate = true;
    };

    // A luz de sombra é reposicionada de forma assíncrona, por um worker, bem
    // depois da chamada que a pediu — sem isto o novo ângulo só apareceria no
    // próximo movimento de câmera.
    world.scene.distanceRenderer.onDistanceComputed.add(requestFrameWithShadows);

    // O primeiro quadro precisa ser pedido explicitamente: a câmera já foi
    // posicionada acima, enquanto o renderer ainda estava em automático, então
    // não há nenhum evento pendente para disparar o desenho inicial.
    requestFrameWithShadows();

    // Depois do setup da cena, que reinstala a cor de fundo padrão.
    const sky = createSkyTexture();
    world.scene.three.background = sky;

    const setup = async () => {
      const ifcLoader = components.get(OBC.IfcLoader);
      ifcLoaderRef.current = ifcLoader;

      await ifcLoader.setup({
        autoSetWasm: false,
        wasm: { path: "/web-ifc/", absolute: true },
      });
      // O StrictMode monta e desmonta o componente uma vez em desenvolvimento.
      // Sem esta checagem, o setup continuaria em um mundo já descartado.
      if (cancelled) return;

      const workerUrl = await OBC.FragmentsManager.getWorker();
      if (cancelled) return;
      const fragments = components.get(OBC.FragmentsManager);
      fragments.init(workerUrl);

      world.camera.controls.addEventListener("update", () => {
        requestFrame();
        void fragments.core.update();
      });

      // A sombra é calculada para o trecho de cena que está na frente da
      // câmera, então precisa ser refeita quando a vista muda. "rest" dispara
      // quando o movimento termina: recalcular durante o arrasto custaria um
      // render extra e uma leitura de pixels por quadro.
      //
      // Só com modelo em cena. Sem geometria visível, o cálculo de distância
      // da biblioteca não acha pixel nenhum, devolve -Infinity, e o raio da
      // sombra (`distância - deslocamento`) vira NaN — que gruda na posição da
      // luz e mata a sombra até alguém recalcular com sucesso.
      world.camera.controls.addEventListener("rest", () => {
        if (!worldBoxRef.current) return;
        void world.scene.updateShadows();
      });

      fragments.list.onItemSet.add(({ value: model }) => {
        model.useCamera(world.camera.three);
        castShadowsOnModel(model);
        // Os tiles chegam aos poucos, conforme o campo de visão: cada um que
        // nasce é geometria nova em cena e no mapa de sombra.
        model.tiles.onItemSet.add(requestFrameWithShadows);
        modelRoot.add(model.object);
        void fragments.core.update(true);
        requestFrameWithShadows();
      });

      // evita z-fighting entre paredes/lajes coincidentes (comum em modelo de hotel)
      fragments.core.models.materials.list.onItemSet.add(
        ({ value: material }) => {
          if (!("isLodMaterial" in material && material.isLodMaterial)) {
            material.polygonOffset = true;
            material.polygonOffsetUnits = 1;
            material.polygonOffsetFactor = Math.random();
          }
        },
      );

      if (!cancelled) setReady(true);
    };

    void setup().catch((error) => {
      if (!cancelled) console.error(error);
    });

    const handleResize = () => {
      world.renderer?.resize();
      world.camera?.updateAspect();
      requestFrame();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", handleResize);
      markers.dispose();
      sky.dispose();
      components.dispose();
      componentsRef.current = null;
      worldRef.current = null;
      ifcLoaderRef.current = null;
      gridRef.current = null;
      markersRef.current = null;
      modelRootRef.current = null;
      worldBoxRef.current = null;
      setReady(false);
      setModelLoaded(false);
    };
  }, []);

  const loadIfcFile = useCallback(async (file: File) => {
    const ifcLoader = ifcLoaderRef.current;
    const world = worldRef.current;
    const renderer = world?.renderer;
    const grid = gridRef.current;
    const modelRoot = modelRootRef.current;
    if (!ifcLoader || !world || !renderer || !grid || !modelRoot) return;

    setConverting(true);
    setProgress(0);
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const model = await ifcLoader.load(
        buffer,
        false,
        file.name.replace(/\.ifc$/i, ""),
        { processData: { progressCallback: setProgress } },
      );

      const worldBox = centerModelHorizontally(
        modelRoot,
        getWorldBox(model.box, modelRoot),
      );
      worldBoxRef.current = worldBox;
      alignGridToModelBase(grid, worldBox);
      await fitCameraToBox(world.camera, worldBox, false);
      // Depois de enquadrar, e não antes: o cálculo parte da posição final da
      // câmera para dimensionar a área coberta pela sombra.
      await world.scene.updateShadows();
      renderer.three.shadowMap.needsUpdate = true;
      renderer.needsUpdate = true;
      setModelLoaded(true);
    } finally {
      setConverting(false);
    }
  }, []);

  const fitToModel = useCallback(async () => {
    const world = worldRef.current;
    const box = worldBoxRef.current;
    if (!world || !box) return;
    await fitCameraToBox(world.camera, box);
  }, []);

  return {
    containerRef,
    ready,
    converting,
    progress,
    modelLoaded,
    loadIfcFile,
    fitToModel,
    ...selection,
    ...sections,
  };
}
