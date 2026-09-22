import * as THREE from "three";
import type * as OBC from "@thatopen/components";
import type * as FRAGS from "@thatopen/fragments";

/** Luz de preenchimento: define o quanto a sombra "abre", nunca o quanto escurece. */
const AMBIENT_LIGHT = {
  color: new THREE.Color("#ffffff"),
  intensity: 1.1,
};

/** O sol da cena — é esta luz, e só ela, que projeta sombra. */
const DIRECTIONAL_LIGHT = {
  color: new THREE.Color("#fff8ef"),
  intensity: 2.4,
  position: new THREE.Vector3(40, 80, 30),
};

/**
 * Lado do mapa de sombra, em pixels — mesmo valor do exemplo oficial.
 *
 * O padrão da biblioteca (512) serrilha demais na escala de um prédio inteiro,
 * e 4096 quadruplica o custo de memória sem ganho visível nesta câmera.
 */
const SHADOW_RESOLUTION = 2048;

/**
 * Configura a iluminação e as sombras projetadas da cena.
 *
 * Precisa rodar com o renderer e a câmera já montados no mundo: é o `setup()`
 * que cria o renderer de distância, e o construtor dele exige os dois. Por
 * isso a chamada mora aqui, junto de tudo que depende dela, e não solta no
 * meio da montagem do mundo.
 */
export function setupShadowedScene(
  scene: OBC.ShadowedScene,
  renderer: OBC.SimpleRenderer,
  grid: OBC.SimpleGrid,
) {
  scene.setup({
    ambientLight: AMBIENT_LIGHT,
    directionalLight: DIRECTIONAL_LIGHT,
  });

  // A ShadowedScene configura as luzes, mas não encosta no renderer — e o
  // three.js simplesmente não desenha sombra nenhuma com o shadow map
  // desligado. VSM é o filtro do exemplo oficial: borda suave, sem o
  // serrilhado que o PCF produz em geometria grande como laje e fachada.
  renderer.three.shadowMap.enabled = true;
  renderer.three.shadowMap.type = THREE.VSMShadowMap;

  // O mapa de sombra só muda quando a geometria ou a luz mudam — nunca por
  // girar a câmera. Com `autoUpdate` ligado, o three redesenhava os 2048² e os
  // dois passes de desfoque do VSM em todo quadro renderizado. Agora quem
  // mexe na cena marca `shadowMap.needsUpdate`.
  renderer.three.shadowMap.autoUpdate = false;
  renderer.three.shadowMap.needsUpdate = true;

  // A resolução deveria vir de `setup({ shadows: { resolution } })`, mas a
  // 3.4.8 lê essa chave achatada e acaba ignorando o objeto aninhado que o
  // próprio tipo exige. Aplicar direto na luz é o que o setup faria.
  for (const light of scene.directionalLights.values()) {
    light.shadow.mapSize.setScalar(SHADOW_RESOLUTION);
  }

  // Reaplica a luz ambiente pedida acima: a 3.4.8 constrói a ambiente com a
  // cor e a intensidade da *direcional*, então o valor configurado se perde.
  // Isso importa aqui porque ambiente forte demais preenche a sombra e apaga
  // justamente o efeito que estamos ligando.
  for (const light of scene.ambientLights.values()) {
    light.color.copy(AMBIENT_LIGHT.color);
    light.intensity = AMBIENT_LIGHT.intensity;
  }

  // O grid é infinito. Se entrasse na conta da distância visível, a sombra
  // seria esticada para cobrir o horizonte e perderia toda a definição sobre
  // o modelo.
  scene.distanceRenderer.excludedObjects.add(grid.three);
}

/**
 * Faz as malhas opacas do modelo projetarem e receberem sombra.
 *
 * `castShadow` não é herdado no grafo de cena do three.js: cada malha precisa
 * ser marcada. Como o fragments carrega os tiles aos poucos, conforme o campo
 * de visão, não dá para marcar tudo de uma vez — o ouvinte pega os que ainda
 * vão nascer e o laço pega os que já estão lá.
 */
export function castShadowsOnModel(model: FRAGS.FragmentsModel) {
  for (const child of model.object.children) {
    child.castShadow = true;
    child.receiveShadow = true;
  }

  model.tiles.onItemSet.add(({ value: mesh }) => {
    if (!isOpaque(mesh)) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
}

/**
 * Vidro e outros translúcidos ficam de fora: janela projetando sombra cheia é
 * o artefato que mais denuncia render mal configurado.
 */
function isOpaque(mesh: FRAGS.BIMMesh) {
  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];
  return materials.every((material) => material.opacity === 1);
}
