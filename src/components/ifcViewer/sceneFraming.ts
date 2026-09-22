import * as THREE from "three";
import type * as OBC from "@thatopen/components";

/** Folga em metros entre o modelo e as bordas da tela ao enquadrar. */
const FIT_PADDING = 3;

/**
 * Direção do eixo X do terreno, lida direto do IFC deste arquivo:
 * `#108=IFCDIRECTION((0.96665171364118219,0.25609463976148755,0.))`.
 *
 * Todo o edifício herda o posicionamento do IFCSITE, então ele nasce girado
 * ~14,8 graus em relação aos eixos do mundo. É por isso que a fachada aparece
 * "torta" em relação às linhas do grid.
 */
const SITE_REF_DIRECTION = new THREE.Vector2(
  0.96665171364118219,
  0.25609463976148755,
);

/**
 * Rotação, em radianos no eixo Y do three.js, que desfaz o giro do terreno e
 * deixa a fachada paralela ao grid.
 *
 * O sinal é negativo porque girar em torno de +Y *diminui* o ângulo
 * `atan2(z, x)` de um vetor: com rotação Δ, um normal em φ passa a φ - Δ.
 * Então, para levar as paredes do ângulo do terreno até zero, giramos pelo
 * oposto dele.
 *
 * Conferido medindo as normais horizontais da geometria carregada: o ângulo
 * que de fato alinha as paredes é -14,65°, a 0,19° deste — diferença dentro do
 * erro de medição e invisível em tela.
 */
export const MODEL_ALIGNMENT_Y = -Math.atan2(
  SITE_REF_DIRECTION.y,
  SITE_REF_DIRECTION.x,
);

/**
 * Converte a caixa envolvente local do modelo para coordenadas de mundo.
 *
 * `model.box` é medido no espaço do próprio modelo, antes da rotação. Aplicar
 * a matriz do grupo pai reposiciona os 8 cantos e refaz os limites — é isso
 * que `Box3.applyMatrix4` faz.
 */
export function getWorldBox(
  localBox: THREE.Box3,
  root: THREE.Object3D,
): THREE.Box3 {
  root.updateMatrixWorld(true);
  return localBox.clone().applyMatrix4(root.matrixWorld);
}

/**
 * Centra o modelo na origem no plano horizontal e devolve a caixa atualizada.
 *
 * Só X e Z mudam: a altura fica onde está, porque é ela que carrega o
 * significado (cota do pavimento). Os sensores são filhos deste mesmo grupo,
 * então acompanham sem que nenhuma coordenada precise ser reescrita.
 */
export function centerModelHorizontally(
  root: THREE.Object3D,
  worldBox: THREE.Box3,
): THREE.Box3 {
  const center = worldBox.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.updateMatrixWorld(true);
  return worldBox.clone().translate(new THREE.Vector3(-center.x, 0, -center.z));
}

/**
 * Assenta o grid na base do modelo, em vez de mover o modelo até o grid.
 *
 * O IFC coloca Y = 0 no pavimento térreo, então os quatro subsolos (até -11 m)
 * ficam legitimamente abaixo do plano Y = 0. Deslocar o grid preserva as
 * coordenadas originais do Revit — o que importa quando um sensor precisa
 * reportar a cota real onde foi instalado.
 */
export function alignGridToModelBase(grid: OBC.SimpleGrid, box: THREE.Box3) {
  grid.three.position.y = box.min.y;
}

/**
 * Enquadra a câmera para que o modelo inteiro caiba na tela.
 *
 * `transition` anima o movimento. Ele fica desligado no carregamento de
 * propósito: o renderer roda em modo manual, então uma animação só termina
 * enquanto houver quadros sendo pedidos — e a promessa do `fitToBox` pode
 * ficar pendente para sempre se a cena entrar em repouso no meio do caminho.
 */
export async function fitCameraToBox(
  camera: OBC.OrthoPerspectiveCamera,
  box: THREE.Box3,
  transition = true,
) {
  await camera.controls.fitToBox(box, transition, {
    paddingTop: FIT_PADDING,
    paddingBottom: FIT_PADDING,
    paddingLeft: FIT_PADDING,
    paddingRight: FIT_PADDING,
  });
}
