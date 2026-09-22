import * as THREE from "three";
import type { Sensor } from "./types";

/** Tamanho do pino em fração da tela — constante em qualquer distância. */
const PIN_SCREEN_SIZE = 0.05;
const SELECTED_SCALE = 1.4;
const PIN_TEXTURE_PX = 128;
const PIN_FILL = "#0891b2";
const PIN_STROKE = "#ffffff";

/**
 * Desenha o pino numerado em um <canvas> e devolve como textura.
 *
 * Um canvas é a forma mais barata de gerar arte 2D para a GPU sem carregar
 * arquivos de imagem: desenhamos uma vez e o resultado vira um `CanvasTexture`.
 */
function createPinTexture(label: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = PIN_TEXTURE_PX;
  canvas.height = PIN_TEXTURE_PX;

  const ctx = canvas.getContext("2d")!;
  const center = PIN_TEXTURE_PX / 2;

  ctx.beginPath();
  ctx.arc(center, center, center - 10, 0, Math.PI * 2);
  ctx.fillStyle = PIN_FILL;
  ctx.fill();
  ctx.lineWidth = 9;
  ctx.strokeStyle = PIN_STROKE;
  ctx.stroke();

  ctx.fillStyle = PIN_STROKE;
  ctx.font = `bold ${PIN_TEXTURE_PX * 0.5}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, center, center);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Dono dos objetos 3D que representam os sensores na cena.
 *
 * É uma classe porque textura e material são recursos de GPU: precisam ser
 * criados uma vez, reutilizados enquanto a cena viver e liberados no dispose.
 * Esse ciclo de vida é justamente o que uma função solta não cobre.
 */
export class SensorMarkers {
  /** O grupo que entra na cena. */
  readonly object = new THREE.Group();

  /** Os sprites, na ordem dos sensores — é o que o raycaster vai testar. */
  readonly pickables: THREE.Sprite[] = [];

  constructor(sensors: Sensor[]) {
    sensors.forEach((sensor, index) => {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createPinTexture(String(index + 1)),
          depthTest: false, // o pino continua visível mesmo atrás de uma parede
          sizeAttenuation: false, // tamanho fixo na tela, não no mundo
          toneMapped: false,
        }),
      );

      sprite.position.copy(sensor.position);
      sprite.scale.setScalar(PIN_SCREEN_SIZE);
      sprite.renderOrder = 1;
      sprite.userData.sensorId = sensor.id;

      this.object.add(sprite);
      this.pickables.push(sprite);
    });
  }

  /** Aumenta o pino selecionado para dar retorno visual ao clique. */
  setSelected(sensorId: string | null) {
    for (const sprite of this.pickables) {
      const isSelected = sprite.userData.sensorId === sensorId;
      sprite.scale.setScalar(
        isSelected ? PIN_SCREEN_SIZE * SELECTED_SCALE : PIN_SCREEN_SIZE,
      );
    }
  }

  dispose() {
    for (const sprite of this.pickables) {
      sprite.material.map?.dispose();
      sprite.material.dispose();
    }
    this.pickables.length = 0;
    this.object.clear();
  }
}
