import type * as THREE from "three";
import type * as OBC from "@thatopen/components";

/** O mundo 3D usado pelo visualizador (cena + câmera + renderer). */
export type IfcWorld = OBC.SimpleWorld<
  OBC.SimpleScene,
  OBC.OrthoPerspectiveCamera,
  OBC.SimpleRenderer
>;

/** Um sensor instalado na fachada. */
export type Sensor = {
  id: string;
  name: string;
  /** Em que fachada ele está, em linguagem de obra. */
  facade: string;
  /** Pavimento, como nomeado no IFC ("PAV 07"). */
  storey: string;
  /** Cota do pavimento em metros, como no Revit. */
  elevation: number;
  /**
   * Ponto no sistema de coordenadas local do modelo, em metros.
   *
   * Guardar assim, e não em coordenadas de mundo, faz o sensor acompanhar
   * qualquer rotação ou deslocamento aplicado ao modelo — porque o pino é
   * filho do mesmo grupo que o modelo no grafo de cena.
   */
  position: THREE.Vector3;
  /** Última leitura em graus Celsius. */
  temperature: number;
  /** Última leitura de umidade relativa, em porcentagem. */
  humidity: number;
};

/** Um sensor selecionado, com a posição já convertida para coordenadas de mundo. */
export type SelectedSensor = {
  sensor: Sensor;
  worldPosition: THREE.Vector3;
};
