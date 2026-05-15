// Importador em lote de manutenções preventivas.
//
// Fluxo:
//   1) Front sobe 1+ arquivos (PDF/CSV) via POST /manutencoes/importacao/extrair-lote
//   2) Backend parseia, faz matching de unidade/equipamento e devolve preview
//      (nada é persistido — o buffer do arquivo é descartado após extrair)
//   3) Usuário revisa/edita no front (calendário + tabela)
//   4) Front confirma via POST /manutencoes/importacao/criar-lote
//   5) Backend valida cada item, pula duplicatas (conflito de agendamento)
//      e cria as OS via criarManutencaoService (origemAbertura='importacao_lote')
//
// Escopo: somente Preventiva / Calibracao / Inspecao. Corretivas seguem o
// fluxo separado de OsCorretiva.

import pdfParse from 'pdf-parse';
import { z } from 'zod';

import prisma from '../../prismaService.js';
import { generateJsonWithLlm } from '../../ai/llmService.js';
import { criarManutencaoService } from '../index.js';
import { existeConflitoAgendamento } from '../manutencaoRepository.js';

const TIPOS_PERMITIDOS = ['Preventiva', 'Calibracao', 'Inspecao'];

const entradaPreviewSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
  horaFim: z.string().regex(/^\d{2}:\d{2}$/),
  unidadeNome: z.string().min(1),
  modeloEquipamento: z.string().min(1),
  tipoManutencao: z.enum(TIPOS_PERMITIDOS).default('Preventiva'),
  descricao: z.string().nullish(),
  isRemota: z.boolean().default(false),
  confianca: z.number().min(0).max(1).nullish(),
});

const itemCriacaoSchema = z.object({
  tempId: z.string().min(1),
  equipamentoId: z.string().min(1),
  tipo: z.enum(TIPOS_PERMITIDOS),
  agendamentoDataInicioLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  agendamentoHoraInicioLocal: z.string().regex(/^\d{2}:\d{2}$/),
  agendamentoDataFimLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  agendamentoHoraFimLocal: z.string().regex(/^\d{2}:\d{2}$/),
  descricaoProblemaServico: z.string().nullish(),
});

// ─── Normalizadores e scoring fuzzy ────────────────────────────────────────

function normalizarTexto(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreSimilaridade(a, b) {
  if (!a || !b) return 0;
  const na = normalizarTexto(a);
  const nb = normalizarTexto(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const tokensA = new Set(na.split(' '));
  const tokensB = new Set(nb.split(' '));
  const intersecao = [...tokensA].filter((t) => tokensB.has(t)).length;
  const uniao = new Set([...tokensA, ...tokensB]).size;
  return uniao === 0 ? 0 : intersecao / uniao;
}

async function carregarCatalogo(tenantId) {
  const [unidades, equipamentos] = await Promise.all([
    prisma.unidade.findMany({
      where: { tenantId },
      select: { id: true, nomeSistema: true, nomeFantasia: true },
    }),
    prisma.equipamento.findMany({
      where: { tenantId },
      select: {
        id: true,
        modelo: true,
        tag: true,
        apelido: true,
        tipo: true,
        unidadeId: true,
        unidade: { select: { id: true, nomeSistema: true } },
      },
    }),
  ]);
  return { unidades, equipamentos };
}

function casarUnidade(nomeQuery, unidades) {
  if (!nomeQuery) return null;
  const ranking = unidades
    .map((u) => ({
      unidade: u,
      score: Math.max(
        scoreSimilaridade(nomeQuery, u.nomeSistema),
        scoreSimilaridade(nomeQuery, u.nomeFantasia)
      ),
    }))
    .filter((r) => r.score >= 0.4)
    .sort((a, b) => b.score - a.score);
  return ranking[0] || null;
}

function casarEquipamento(modeloQuery, equipamentos, unidadeId) {
  if (!modeloQuery) return null;
  const universo = unidadeId
    ? equipamentos.filter((e) => e.unidadeId === unidadeId)
    : equipamentos;
  const ranking = universo
    .map((e) => ({
      equipamento: e,
      score: Math.max(
        scoreSimilaridade(modeloQuery, e.modelo),
        scoreSimilaridade(modeloQuery, e.apelido),
        scoreSimilaridade(modeloQuery, e.tag)
      ),
    }))
    .filter((r) => r.score >= 0.45)
    .sort((a, b) => b.score - a.score);
  if (ranking.length === 0) return null;
  const top = ranking[0];
  const segundo = ranking[1];
  const gap = top.score - (segundo?.score || 0);
  return { ...top, ambiguo: gap < 0.1 && (segundo?.score || 0) > 0.6 };
}

// ─── Parsers (PDF via LLM / CSV determinístico) ────────────────────────────

const PROMPT_BASE = `Você é um assistente especialista em manutenção preventiva de equipamentos médicos.
Receberá o TEXTO BRUTO de um calendário anual de PMs (preventivas) emitido por um fornecedor (GE Healthcare, Philips, Siemens, etc.).

Sua tarefa: extrair TODAS as entradas de preventiva agendada, devolvendo uma LISTA JSON.

REGRAS:
1. Cada entrada tem: data (YYYY-MM-DD), horaInicio (HH:mm 24h), horaFim (HH:mm 24h),
   unidadeNome (texto), modeloEquipamento (texto), tipoManutencao (default "Preventiva";
   use "Calibracao" ou "Inspecao" apenas se o calendário disser claramente),
   descricao (curta, opcional), isRemota (boolean).
2. O ano é o ano do calendário (lê do título — "Calendário 2026" → 2026).
3. Horário típico "10:00 às 17:00" → horaInicio="10:00", horaFim="17:00".
4. unidadeNome é como aparece (ex: "Cerdil Sede Dourados", "R.M. Cassems Ponta Porã").
5. modeloEquipamento mantém o modelo + categoria entre parênteses (ex:
   "Revolution ACT (Tomografia)", "Optima 360 (Ressonância Magnética)").
6. isRemota = true APENAS se a entrada estiver na tabela "Manutenções remotas no mês"
   (rodapé do mês) OU se a descrição contiver "Remota"/"Remoto" sem horário fechado.
7. Múltiplas entradas no mesmo dia viram entradas JSON separadas.
8. NÃO invente entradas; dias vazios não entram na lista.
9. confianca 0-1: sua confiança na linha (≥0.8 quando claro, <0.5 quando ambíguo).

Retorne APENAS um JSON válido no formato:
{ "entradas": [ { "data": "2026-05-14", "horaInicio": "10:00", "horaFim": "17:00",
  "unidadeNome": "...", "modeloEquipamento": "...", "tipoManutencao": "Preventiva",
  "descricao": null, "isRemota": false, "confianca": 0.95 } ] }

TEXTO DO CALENDÁRIO (truncado se muito longo):
`;

async function extrairDoPdf({ pdfBuffer, tenantId }) {
  if (!pdfBuffer?.length) return { ok: false, erro: 'pdf_vazio', entradas: [] };

  let texto;
  try {
    const parsed = await pdfParse(pdfBuffer);
    texto = parsed.text || '';
  } catch (err) {
    return { ok: false, erro: `pdf_parse_failed: ${err.message}`, entradas: [] };
  }

  if (!texto || texto.length < 100) {
    return { ok: false, erro: 'pdf_texto_curto', entradas: [] };
  }

  const prompt = `${PROMPT_BASE}${texto.slice(0, 18_000)}\n\nRetorne APENAS o JSON.`;

  let resposta;
  try {
    resposta = await generateJsonWithLlm(prompt, {
      tenantId,
      feature: 'manutencao_calendario_extractor',
    });
  } catch (err) {
    return { ok: false, erro: `llm_falhou: ${err.message}`, entradas: [] };
  }

  const lista = Array.isArray(resposta?.entradas) ? resposta.entradas : [];
  const validas = [];
  for (const item of lista) {
    const parsed = entradaPreviewSchema.safeParse(item);
    if (parsed.success) validas.push(parsed.data);
  }
  // Decisão de produto: descarta entradas remotas (sem janela fechada).
  return { ok: true, entradas: validas.filter((e) => !e.isRemota) };
}

function extrairDoCsv({ texto }) {
  if (!texto) return { ok: false, erro: 'csv_vazio', entradas: [] };
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (linhas.length < 2) return { ok: false, erro: 'csv_sem_dados', entradas: [] };

  const sep = linhas[0].includes(';') && !linhas[0].includes(',') ? ';' : ',';
  const split = (s) => s.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));

  const header = split(linhas[0]).map((h) => normalizarTexto(h));
  const idx = {
    data: header.findIndex((h) => h === 'data'),
    horaInicio: header.findIndex((h) => h === 'hora inicio' || h === 'horainicio'),
    horaFim: header.findIndex((h) => h === 'hora fim' || h === 'horafim'),
    unidade: header.findIndex((h) => h === 'unidade'),
    modelo: header.findIndex((h) => h === 'modelo' || h === 'equipamento'),
    tipo: header.findIndex((h) => h === 'tipo'),
    descricao: header.findIndex((h) => h === 'descricao'),
  };

  if (idx.data < 0 || idx.horaInicio < 0 || idx.horaFim < 0 || idx.unidade < 0 || idx.modelo < 0) {
    return {
      ok: false,
      erro: 'csv_colunas_faltando',
      detalhes: 'cabeçalho precisa de: data, hora_inicio, hora_fim, unidade, modelo, tipo (opcional: descricao)',
      entradas: [],
    };
  }

  const entradas = [];
  for (let i = 1; i < linhas.length; i += 1) {
    const c = split(linhas[i]);
    const tipo = (c[idx.tipo] || 'Preventiva').trim();
    const parsed = entradaPreviewSchema.safeParse({
      data: (c[idx.data] || '').trim(),
      horaInicio: (c[idx.horaInicio] || '').trim(),
      horaFim: (c[idx.horaFim] || '').trim(),
      unidadeNome: c[idx.unidade] || '',
      modeloEquipamento: c[idx.modelo] || '',
      tipoManutencao: TIPOS_PERMITIDOS.includes(tipo) ? tipo : 'Preventiva',
      descricao: idx.descricao >= 0 ? c[idx.descricao] || null : null,
      isRemota: false,
      confianca: 1,
    });
    if (parsed.success) entradas.push(parsed.data);
  }
  return { ok: true, entradas };
}

// ─── extrair-lote ───────────────────────────────────────────────────────────

export async function extrairLoteService({ tenantId, files }) {
  if (!Array.isArray(files) || files.length === 0) {
    return { ok: false, status: 400, message: 'Nenhum arquivo enviado.' };
  }
  if (files.length > 10) {
    return { ok: false, status: 400, message: 'Máximo de 10 arquivos por lote.' };
  }

  const catalogo = await carregarCatalogo(tenantId);

  let contadorTempId = 0;
  const proximoId = () => `e${Date.now().toString(36)}-${(contadorTempId += 1)}`;
  const resultadosPorArquivo = [];

  for (const file of files) {
    const fileName = file.originalname || 'arquivo';
    const mime = file.mimetype || '';
    let parseResult;
    if (mime.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
      parseResult = await extrairDoPdf({ pdfBuffer: file.buffer, tenantId });
    } else if (
      mime.includes('csv') ||
      mime.includes('text/plain') ||
      fileName.toLowerCase().endsWith('.csv')
    ) {
      parseResult = extrairDoCsv({ texto: file.buffer.toString('utf8') });
    } else {
      resultadosPorArquivo.push({
        fileName,
        ok: false,
        erro: 'formato_nao_suportado',
        entradas: [],
      });
      continue;
    }

    if (!parseResult.ok) {
      resultadosPorArquivo.push({ fileName, ...parseResult });
      continue;
    }

    const entradasEnriquecidas = parseResult.entradas.map((e) => {
      const tempId = proximoId();
      const matchUnidade = casarUnidade(e.unidadeNome, catalogo.unidades);
      const unidadeId = matchUnidade?.unidade?.id || null;
      const matchEquipamento = casarEquipamento(
        e.modeloEquipamento,
        catalogo.equipamentos,
        unidadeId
      );

      const alertas = [];
      if (!matchUnidade) {
        alertas.push(`Unidade "${e.unidadeNome}" não encontrada no cadastro.`);
      } else if (matchUnidade.score < 0.7) {
        alertas.push(
          `Unidade "${e.unidadeNome}" mapeada para "${matchUnidade.unidade.nomeSistema}" com baixa confiança.`
        );
      }
      if (!matchEquipamento) {
        alertas.push(`Equipamento "${e.modeloEquipamento}" não encontrado.`);
      } else if (matchEquipamento.ambiguo) {
        alertas.push(
          `Mais de um equipamento parecido com "${e.modeloEquipamento}". Confirme a seleção.`
        );
      }

      return {
        tempId,
        fileName,
        dados: e,
        unidadeSugerida: matchUnidade?.unidade
          ? {
              id: matchUnidade.unidade.id,
              nomeSistema: matchUnidade.unidade.nomeSistema,
              score: matchUnidade.score,
            }
          : null,
        equipamentoSugerido: matchEquipamento?.equipamento
          ? {
              id: matchEquipamento.equipamento.id,
              modelo: matchEquipamento.equipamento.modelo,
              apelido: matchEquipamento.equipamento.apelido,
              tag: matchEquipamento.equipamento.tag,
              unidade: matchEquipamento.equipamento.unidade,
              score: matchEquipamento.score,
              ambiguo: matchEquipamento.ambiguo,
            }
          : null,
        alertas,
        ok: true,
      };
    });

    resultadosPorArquivo.push({
      fileName,
      ok: true,
      entradas: entradasEnriquecidas,
    });
  }

  // Catálogo enxuto pro front renderizar selects sem outra round-trip
  const catalogoFront = {
    unidades: catalogo.unidades.map((u) => ({ id: u.id, nomeSistema: u.nomeSistema })),
    equipamentos: catalogo.equipamentos.map((e) => ({
      id: e.id,
      modelo: e.modelo,
      apelido: e.apelido,
      tag: e.tag,
      tipo: e.tipo,
      unidadeId: e.unidadeId,
      unidadeNome: e.unidade?.nomeSistema || null,
    })),
  };

  return {
    ok: true,
    status: 200,
    data: { resultados: resultadosPorArquivo, catalogo: catalogoFront },
  };
}

// ─── criar-lote ─────────────────────────────────────────────────────────────

export async function criarLoteService({ tenantId, usuarioId, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, status: 400, message: 'Nenhum item enviado.' };
  }
  if (items.length > 200) {
    return { ok: false, status: 400, message: 'Limite de 200 itens por chamada.' };
  }

  const criadas = [];
  const pulados = [];
  const falhas = [];

  for (const raw of items) {
    const parsed = itemCriacaoSchema.safeParse(raw);
    if (!parsed.success) {
      falhas.push({
        tempId: raw?.tempId || null,
        erro: 'validacao',
        detalhes: parsed.error.issues.slice(0, 3),
      });
      continue;
    }
    const item = parsed.data;

    try {
      const startUtc = new Date(
        `${item.agendamentoDataInicioLocal}T${item.agendamentoHoraInicioLocal}:00`
      );
      const endUtc = new Date(
        `${item.agendamentoDataFimLocal}T${item.agendamentoHoraFimLocal}:00`
      );
      const conflito = await existeConflitoAgendamento({
        tenantId,
        equipamentoId: item.equipamentoId,
        startUtc,
        endUtc,
      });
      if (conflito) {
        pulados.push({
          tempId: item.tempId,
          motivo: 'conflito_agendamento',
          osExistente: { id: conflito.id, numeroOS: conflito.numeroOS },
        });
        continue;
      }
    } catch (err) {
      falhas.push({
        tempId: item.tempId,
        erro: 'conflito_check_falhou',
        detalhes: err.message,
      });
      continue;
    }

    try {
      const resultado = await criarManutencaoService({
        tenantId,
        usuarioId,
        dados: {
          equipamentoId: item.equipamentoId,
          tipo: item.tipo,
          descricaoProblemaServico:
            item.descricaoProblemaServico || 'Manutenção preventiva — calendário fornecedor',
          agendamentoDataInicioLocal: item.agendamentoDataInicioLocal,
          agendamentoHoraInicioLocal: item.agendamentoHoraInicioLocal,
          agendamentoDataFimLocal: item.agendamentoDataFimLocal,
          agendamentoHoraFimLocal: item.agendamentoHoraFimLocal,
          origemAbertura: 'importacao_lote',
          status: 'Agendada',
        },
      });

      if (!resultado.ok) {
        falhas.push({ tempId: item.tempId, erro: resultado.message || 'criar_falhou' });
        continue;
      }
      criadas.push({
        tempId: item.tempId,
        id: resultado.data?.id,
        numeroOS: resultado.data?.numeroOS,
      });
    } catch (err) {
      falhas.push({ tempId: item.tempId, erro: err.message });
    }
  }

  return {
    ok: true,
    status: 201,
    data: {
      criados: criadas.length,
      pulados: pulados.length,
      falhas: falhas.length,
      detalhes: { criados: criadas, pulados, falhas },
    },
  };
}
