import * as THREE from "three";
import type { Sensor } from "./types";

/**
 * Os seis sensores da fachada, posicionados em código.
 *
 * `position` está em coordenadas locais do modelo, medidas dentro do próprio
 * visualizador. Para levantar novas posições, rode o app e dê shift + clique no
 * ponto desejado: `useCoordinateProbe` escreve no console a linha
 * `new THREE.Vector3(...)` pronta para colar aqui.
 *
 * Os quatro primeiros ficam no plano Z = -9,3 (fachada frontal) e os dois
 * últimos no plano X = 61,7 (fachada lateral) — cada um cerca de 1 m à frente
 * da parede, para o pino não afundar na geometria.
 *
 * `temperature` e `humidity` são valores de exemplo. Quando houver telemetria
 * de verdade, troque este arquivo por uma chamada de API que devolva a mesma
 * estrutura: nada mais no visualizador precisa mudar.
 */
export const SENSORS: Sensor[] = [
  {
    id: "S1",
    name: "Sensor 01",
    facade: "Fachada frontal",
    storey: "PAV 07",
    elevation: 24.3,
    position: new THREE.Vector3(35, -1.31, -9.3),
    temperature: 24.6,
    humidity: 62,
  },
  {
    id: "S2",
    name: "Sensor 02",
    facade: "Fachada frontal",
    storey: "PAV 09",
    elevation: 30.3,
    position: new THREE.Vector3(35, 4.69, -9.3),
    temperature: 25.1,
    humidity: 60,
  },
  {
    id: "S3",
    name: "Sensor 03",
    facade: "Fachada frontal",
    storey: "PAV 11",
    elevation: 36.3,
    position: new THREE.Vector3(35, 10.69, -9.3),
    temperature: 25.8,
    humidity: 58,
  },
  {
    id: "S4",
    name: "Sensor 04",
    facade: "Fachada frontal",
    storey: "PAV 13",
    elevation: 42.3,
    position: new THREE.Vector3(35, 16.69, -9.3),
    temperature: 26.9,
    humidity: 54,
  },
  {
    id: "S5",
    name: "Sensor 05",
    facade: "Fachada lateral",
    storey: "PAV 08",
    elevation: 27.3,
    position: new THREE.Vector3(61.7, 1.69, -20.5),
    temperature: 24.2,
    humidity: 64,
  },
  {
    id: "S6",
    name: "Sensor 06",
    facade: "Fachada lateral",
    storey: "PAV 12",
    elevation: 39.3,
    position: new THREE.Vector3(61.7, 13.69, -20.5),
    temperature: 26.4,
    humidity: 55,
  },
];
