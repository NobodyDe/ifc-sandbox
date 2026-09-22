import { useCallback, useEffect, useRef, useState } from "react";
import * as OBC from "@thatopen/components";
import * as THREE from "three";
import {
  MODEL_ALIGNMENT_Y,
  alignGridToModelBase,
  centerModelHorizontally,
  fitCameraToBox,
  getWorldBox,
} from "./sceneFraming";
import { SensorMarkers } from "./sensorMarkers";
import { SENSORS } from "./sensorsData";
import { useCoordinateProbe } from "./useCoordinateProbe";
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    const components = new OBC.Components();
    componentsRef.current = components;

    const worlds = components.get(OBC.Worlds);
    const world = worlds.create<
      OBC.SimpleScene,
      OBC.OrthoPerspectiveCamera,
      OBC.SimpleRenderer
    >();
    worldRef.current = world;

    world.scene = new OBC.SimpleScene(components);
    world.scene.setup({
      ambientLight: { color: new THREE.Color("#ffffff"), intensity: 1.1 },
      directionalLight: {
        color: new THREE.Color("#fff8ef"),
        intensity: 2.4,
        position: new THREE.Vector3(40, 80, 30),
      },
    });
    // Fundo transparente: o degradê fica no CSS do container, que dá um
    // resultado melhor do que uma cor chapada na cena.
    world.scene.three.background = null;

    world.renderer = new OBC.SimpleRenderer(components, container, {
      antialias: true,
    });
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

      world.camera.controls.addEventListener("update", () =>
        fragments.core.update(),
      );

      fragments.list.onItemSet.add(({ value: model }) => {
        model.useCamera(world.camera.three);
        modelRoot.add(model.object);
        fragments.core.update(true);
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
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", handleResize);
      markers.dispose();
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
    const grid = gridRef.current;
    const modelRoot = modelRootRef.current;
    if (!ifcLoader || !world || !grid || !modelRoot) return;

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
    sensors: SENSORS,
    ...selection,
  };
}
