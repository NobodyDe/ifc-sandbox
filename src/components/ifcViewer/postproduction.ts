import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";

/**
 * Cor do contorno. Cinza-azulado escuro em vez de preto: preto puro sobre
 * fachada clara vira desenho de quadrinho, e some a leitura de material.
 */
const EDGE_COLOR = new THREE.Color("#33404f");

/** Espessura da linha de contorno, em pixels. */
const EDGE_WIDTH = 1.0;

/**
 * Liga o pós-processamento do renderer.
 *
 * Roda depois de o grid existir, porque ele precisa ficar de fora dos efeitos.
 */
export function setupPostproduction(
  renderer: OBF.PostproductionRenderer,
  grid: OBC.SimpleGrid,
) {
  const { postproduction } = renderer;

  // Renderiza sob demanda, e não a cada quadro.
  //
  // No modo AUTO a pilha inteira — oclusão, contorno, SMAA, mapa de sombra —
  // era refeita ~70x por segundo mesmo com a cena imóvel, o que é gasto puro:
  // o quadro sai idêntico ao anterior. No manual, quem muda a imagem pede o
  // quadro (`needsUpdate`), e uma cena parada custa zero.
  //
  // A biblioteca ainda troca sozinha para um estilo simples durante a
  // navegação e devolve a qualidade cheia 50 ms depois que o movimento para
  // (`turnOffOnManualMode`/`manualModeDelay`). Quem preferir qualidade
  // constante mesmo arrastando desliga esse comportamento.
  renderer.mode = OBC.RendererMode.MANUAL;

  postproduction.enabled = true;

  // Cor + contorno + oclusão de ambiente. É a combinação que dá o aspecto de
  // software de BIM: a cor preserva a leitura de material, o contorno separa
  // peças coplanares que a iluminação sozinha deixaria grudadas, e a oclusão
  // escurece quinas e frestas, que é de onde vem a percepção de volume.
  postproduction.style = OBF.PostproductionAspect.COLOR_PEN_SHADOWS;

  // O antialias do WebGL não alcança o que é desenhado em render target, que
  // é o caso de tudo aqui — quem tira o serrilhado da imagem final é o SMAA.
  postproduction.smaaEnabled = true;

  postproduction.edgesPass.color.copy(EDGE_COLOR);
  postproduction.edgesPass.width = EDGE_WIDTH;

  // Parâmetros de oclusão calibrados pela ThatOpen para escala de edificação.
  // Não são aplicados sozinhos: o GTAOPass do three nasce com os dele, que
  // foram pensados para cena de objeto único.
  postproduction.aoPass.updateGtaoMaterial(postproduction.defaultAoParameters);

  // O grid fica fora dos efeitos: contorno em cima de linha de grid vira
  // sujeira, e a oclusão escureceria o plano inteiro.
  postproduction.basePass.isolatedMaterials.push(grid.material);
}
