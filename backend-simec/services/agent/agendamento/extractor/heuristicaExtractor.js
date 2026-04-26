import { AgendamentoSchema } from './schema.js';
import {
  normalizarData,
  normalizarHora,
  normalizarDataRelativa,
} from './normalizers.js';
import { extrairDataUTC } from '../../../time/index.js';

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

  // ── Confirmação ─────────────────────────────────────────────────────────────
  if (/^(sim|s|confirmo|pode confirmar|ok|certo)$/i.test(lower)) {
    extraido.confirmacao = true;
  } else if (/^(nao|n|cancelar|cancela)$/i.test(lower)) {
    extraido.confirmacao = false;
  }

  // ── Tipo de manutenção ───────────────────────────────────────────────────────
  if (lower.includes('corretiva')) extraido.tipoManutencao = 'Corretiva';
  if (lower.includes('preventiva')) extraido.tipoManutencao = 'Preventiva';

  // ── Equipamento por TAG explícita ────────────────────────────────────────────
  const matchTag = msg.match(/\btag[:\s-]*([a-z0-9-]+)\b/i);
  if (matchTag?.[1]) {
    extraido.equipamentoTexto = matchTag[1].trim();
  }

  // ── Equipamento por ambiguidade previamente detectada ────────────────────────
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

  // ── Unidade ──────────────────────────────────────────────────────────────────
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

  // ── Intervalo de horário (ex: "das 8h às 17h") ───────────────────────────────
  const matchIntervalo = msg.match(
    /(?:das|de)\s+(\d{1,2}(?::\d{2})?\s*h?(?:s)?)\s+(?:ate|as?|a)\s+(\d{1,2}(?::\d{2})?\s*h?(?:s)?)/i
  );
  if (matchIntervalo) {
    extraido.horaInicio = normalizarHora(matchIntervalo[1]);
    extraido.horaFim = normalizarHora(matchIntervalo[2]);
  }

  // ── Data explícita ───────────────────────────────────────────────────────────
  // Aceita: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD/MM (sem ano)
  if (!extraido.data) {
    const matchData = msg.match(
      /\b(?:dia\s+)?(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?|\d{4}-\d{2}-\d{2})\b/i
    );
    if (matchData?.[1]) {
      extraido.data = normalizarData(matchData[1]);
    }
  }

  // ── Horário avulso ───────────────────────────────────────────────────────────
  // Captura: "10:00h", "10h", "8:30h", "10:00", "às 10", "as 14h", "8"
  // A regex captura o token numérico; normalizarHora remove prefixos/sufixos.
  if (!extraido.horaInicio && !extraido.data) {
    const matchHora = msg.match(
      /\b(\d{1,2}(?::\d{2})?\s*h(?:r?s?)?|\d{1,2}h\d{2}|\d{1,2}:\d{2})\b/i
    );
    if (matchHora?.[1]) {
      const horaNormalizada = normalizarHora(matchHora[1]);

      if (horaNormalizada) {
        if (estado?.horaInicio && !estado?.horaFim) {
          extraido.horaFim = horaNormalizada;
        } else {
          extraido.horaInicio = horaNormalizada;
        }
      }
    }
  }

  // ── Datas relativas (hoje, amanhã, dia 21, próxima terça…) ───────────────────
  // Executar DEPOIS de tentar data explícita para não sobrescrever.
  if (!extraido.data) {
    const dataRelativa = normalizarDataRelativa(lower);
    if (dataRelativa) {
      extraido.data = dataRelativa;
    }
  }

  // ── Número de chamado ────────────────────────────────────────────────────────
  const matchChamado = msg.match(/\b\d{4,}\b/);
  if (
    matchChamado &&
    (estado.tipoManutencao === 'Corretiva' || lower.includes('chamado'))
  ) {
    extraido.numeroChamado = matchChamado[0];
  }

  // ── Descrição livre (apenas para Corretiva sem outros campos) ────────────────
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
