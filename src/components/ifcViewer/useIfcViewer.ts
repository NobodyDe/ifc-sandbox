import { useEffect, useRef, useState } from "react";
import * as OBC from "@thatopen/components";

type IfcWorld = OBC.SimpleWorld<
  OBC.SimpleScene,
  OBC.OrthoPerspectiveCamera,
  OBC.SimpleRenderer
>;

export function useIfcViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const componentsRef = useRef<OBC.Components | null>(null);
  const worldRef = useRef<IfcWorld | null>(null);
  const ifcLoaderRef = useRef<OBC.IfcLoader | null>(null);

  const [ready, setReady] = useState(false);
  const [converting, setConverting] = useState(false);

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
    world.scene.setup(); // luzes padrão
    world.scene.three.background = null;

    world.renderer = new OBC.SimpleRenderer(components, container);
    world.camera = new OBC.OrthoPerspectiveCamera(components);

    components.init();

    void world.camera.controls.setLookAt(15, 15, 15, 0, 0, 0);
    components.get(OBC.Grids).create(world);

    const setup = async () => {
      const ifcLoader = components.get(OBC.IfcLoader);
      ifcLoaderRef.current = ifcLoader;

      await ifcLoader.setup({
        autoSetWasm: false,
        wasm: { path: "/web-ifc/", absolute: true },
      });

      const workerUrl = await OBC.FragmentsManager.getWorker();
      const fragments = components.get(OBC.FragmentsManager);
      fragments.init(workerUrl);

      world.camera.controls.addEventListener("update", () =>
        fragments.core.update(),
      );

      fragments.list.onItemSet.add(({ value: model }) => {
        model.useCamera(world.camera.three);
        world.scene.three.add(model.object);
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

    setup();

    const handleResize = () => {
      world.renderer?.resize();
      world.camera?.updateAspect();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", handleResize);
      components.dispose();
      componentsRef.current = null;
      worldRef.current = null;
      ifcLoaderRef.current = null;
      setReady(false);
    };
  }, []);

  const loadIfcFile = async (file: File) => {
    const ifcLoader = ifcLoaderRef.current;
    if (!ifcLoader) return;

    setConverting(true);
    try {
      const data = await file.arrayBuffer();
      const buffer = new Uint8Array(data);
      await ifcLoader.load(buffer, false, file.name.replace(/\.ifc$/i, ""), {
        processData: {
          progressCallback: (progress) =>
            console.log(`Convertendo: ${(progress * 100).toFixed(0)}%`),
        },
      });
    } finally {
      setConverting(false);
    }
  };

  return { containerRef, ready, converting, loadIfcFile };
}
