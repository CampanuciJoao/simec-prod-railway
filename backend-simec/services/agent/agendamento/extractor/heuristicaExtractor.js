import { AgendamentoSchema } from './schema.js';
import { normalizarHora } from './normalizers.js';
import { extrairDataUTC } from '../../../timeService.js';

export const mensagemEhConfirmacaoCurta = (mensagem) => {
  const lower = mensagem.trim().toLowerCase();
  return /^(sim|s|ok|confirmo|pode confirmar|certo|não|nao|n|cancela|cancelar)$/i.test(
    lower
  );
};

export const extrairCamposHeuristico = (mensagem, estado = {}) => {
  const msg = mensagem.trim();
  const lower = msg.toLowerCase();

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
  } else if (/^(não|nao|n|cancelar|cancela)$/i.test(lower)) {
    extraido.confirmacao = false;
  }

  if (lower.includes('corretiva')) extraido.tipoManutencao = 'Corretiva';
  if (lower.includes('preventiva')) extraido.tipoManutencao = 'Preventiva';

  const matchUnidade = msg.match(/(?:unidade|hospital)\s+(?:de\s+)?(.+)/i);
  if (matchUnidade) {
    extraido.unidadeTexto = matchUnidade[1].trim();
  }

  const matchEquipUnidade = msg.match(/^(.+?)\s+de\s+([a-zà-ú0-9\s-]+)$/i);
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