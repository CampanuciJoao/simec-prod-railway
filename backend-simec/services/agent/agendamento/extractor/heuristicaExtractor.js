import { AgendamentoSchema } from './schema.js';
import { normalizarHora } from './normalizers.js';
import { extrairDataUTC } from '../../../timeService.js';

export const mensagemEhConfirmacaoCurta = (mensagem) => {
  const lower = mensagem
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return /^(sim|s|ok|confirmo|pode confirmar|certo|nao|n|cancela|cancelar)$/i.test(
    lower
  );
};

export const extrairCamposHeuristico = (mensagem, estado = {}) => {
  const msg = mensagem.trim();
  const lower = msg
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const extraido = {
    tipoManutencao: null,
    unidadeTexto: null,
    equipamentoTexto: null,
    data: null,
    horaInicio: null,
    horaFim: null,
    numeroChamado: null,
    descricao: null,
    confirmacao: null,
  };

  if (/^(sim|s|confirmo|pode confirmar|ok|certo)$/i.test(lower)) {
    extraido.confirmacao = true;
  } else if (/^(nao|n|cancelar|cancela)$/i.test(lower)) {
    extraido.confirmacao = false;
  }

  if (lower.includes('corretiva')) extraido.tipoManutencao = 'Corretiva';
  if (lower.includes('preventiva')) extraido.tipoManutencao = 'Preventiva';

  const matchTag = msg.match(/\btag[:\s-]*([a-z0-9-]+)\b/i);
  if (matchTag?.[1]) {
    extraido.equipamentoTexto = matchTag[1].trim();
  }

  if (
    !extraido.equipamentoTexto &&
    Array.isArray(estado.ambiguidadeEquipamento) &&
    estado.ambiguidadeEquipamento.length > 0
  ) {
    const escolha = estado.ambiguidadeEquipamento.find((item) => {
      const tag = item?.tag?.toString().toLowerCase().trim();
      const modelo = item?.modelo?.toString().toLowerCase().trim();

      return (
        (!!tag && lower === tag) ||
        (!!tag && lower.includes(tag)) ||
        (!!modelo && lower === modelo)
      );
    });

    if (escolha) {
      extraido.equipamentoTexto = escolha.tag || escolha.modelo || null;
      extraido.unidadeTexto = escolha.unidade || extraido.unidadeTexto;
    }
  }

  const matchUnidade = msg.match(/(?:unidade|hospital)\s+(?:de\s+)?(.+)/i);
  if (matchUnidade) {
    extraido.unidadeTexto = matchUnidade[1].trim();
  }

  const matchEquipUnidade = msg.match(/^(.+?)\s+de\s+([a-zÀ-Úà-ú0-9\s-]+)$/i);
  if (
    matchEquipUnidade &&
    !extraido.equipamentoTexto &&
    !extraido.unidadeTexto
  ) {
    const esquerda = matchEquipUnidade[1].trim();
    const direita = matchEquipUnidade[2].trim();

    if (
      esquerda.length > 2 &&
      !['unidade', 'hospital', 'tipo', 'chamado'].includes(
        esquerda.toLowerCase()
      )
    ) {
      extraido.equipamentoTexto = esquerda;
      extraido.unidadeTexto = direita;
    }
  }

  const matchIntervalo = msg.match(
    /(?:das|de)\s+(\d{1,2}(?::\d{2})?\s*h?)\s+(?:até|as?|à|a)\s+(\d{1,2}(?::\d{2})?\s*h?)/i
  );
  if (matchIntervalo) {
    extraido.horaInicio = normalizarHora(matchIntervalo[1]);
    extraido.horaFim = normalizarHora(matchIntervalo[2]);
  }

  if (lower.includes('hoje')) {
    extraido.data = extrairDataUTC();
  }

  const matchChamado = msg.match(/\b\d{4,}\b/);
  if (
    matchChamado &&
    (estado.tipoManutencao === 'Corretiva' || lower.includes('chamado'))
  ) {
    extraido.numeroChamado = matchChamado[0];
  }

  if (
    !extraido.tipoManutencao &&
    !extraido.unidadeTexto &&
    !extraido.equipamentoTexto &&
    !extraido.data &&
    !extraido.horaInicio &&
    !extraido.horaFim &&
    !extraido.numeroChamado &&
    extraido.confirmacao === null &&
    msg.length > 3 &&
    estado.tipoManutencao === 'Corretiva'
  ) {
    extraido.descricao = msg;
  }

  return AgendamentoSchema.parse(extraido);
};
