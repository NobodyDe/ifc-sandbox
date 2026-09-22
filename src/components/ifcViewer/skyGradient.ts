import * as THREE from "three";

/**
 * Paradas do degradê, do zênite (0) ao ponto mais baixo (1).
 *
 * A textura envolve a esfera inteira, então 0.5 é exatamente a linha do
 * horizonte: acima dela é céu, abaixo é a neblina clara que faz o modelo
 * "pousar" em vez de flutuar no vazio. As duas paradas coladas em volta de
 * 0.5 são o que cria a linha de horizonte nítida — sem elas o azul escorre
 * até embaixo e a cena vira um borrão.
 */
const SKY_STOPS: [stop: number, color: string][] = [
  [0, "#4a7ab0"],
  [0.42, "#9dc0dd"],
  [0.5, "#eef3f8"],
  [0.54, "#cdd6e0"],
  [1, "#94a3b8"],
];

/** Altura da textura em pixels. Só a vertical carrega informação. */
const TEXTURE_HEIGHT = 512;

/**
 * Gera o céu em degradê como textura equirretangular.
 *
 * Equirretangular, e não uma imagem de fundo comum, porque assim o céu fica
 * preso ao mundo em vez de à tela: o horizonte acompanha a órbita da câmera,
 * que é o que dá a sensação de estar dentro de um lugar. Um fundo de tela
 * ficaria parado enquanto o prédio gira — o mesmo efeito de papel de parede
 * que o degradê do CSS já dava.
 *
 * A textura tem 2px de largura porque a cor só varia com a altura; a
 * interpolação da GPU cobre o resto sem custo.
 */
export function createSkyTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = TEXTURE_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D indisponível para gerar o céu.");
  }

  const gradient = context.createLinearGradient(0, 0, 0, TEXTURE_HEIGHT);
  for (const [stop, color] of SKY_STOPS) {
    gradient.addColorStop(stop, color);
  }
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, TEXTURE_HEIGHT);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  // Sem isto o three trata os bytes como lineares e o céu sai lavado.
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
