// Extrator LLM de campos estruturados a partir de PDFs de laudos
// fisico-medicos (Controle de Qualidade RDC ANVISA 611/2022).
//
// Sincrono. Recebe buffer do PDF (vindo do upload do form), retorna JSON
// estruturado para pre-preencher RegistrarTesteForm. NAO persiste — o PDF
// e' descartado apos extracao (ele sera re-enviado pelo proprio form ao
// salvar via /testes/:id/anexos).
//
// PDFs reais da Cerdil analisados (MRA 2018, FM Servicos 2024-2025) tem
// estrutura razoavelmente consistente entre fornecedores: cabecalho com
// numero do laudo (formato XXMD/SP/YYYY/ME/NNNN), bloco de identificacao
// do equipamento (modalidade, fabricante, modelo, serial), bloco do
// responsavel tecnico (nome + ABFM/CRM), conclusao (Aprovado/Reprovado),
// e secao "Recomendacoes — Providenciar X" para pendencias acionaveis.

import pdfParse from 'pdf-parse';
import { z } from 'zod';

import { generateJsonWithLlm } from '../ai/llmService.js';

const RESULTADOS = ['Aprovado', 'AprovadoComRestricoes', 'Reprovado'];

// Schema da resposta esperada do LLM. Tudo opcional — LLM emite null quando
// nao consegue identificar com confianca, evitando alucinacao.
const respostaSchema = z.object({
  numeroLaudo:         z.string().nullish(),
  empresaExecutora:    z.string().nullish(),
  responsavelNome:     z.string().nullish(),
  responsavelRegistro: z.string().nullish(),
  validadeMeses:       z.number().int().positive().max(120).nullish(),
  dataExecucao:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  resultado:           z.enum(RESULTADOS).nullish(),
  modalidade:          z.string().nullish(),
  codigoTipoSugerido:  z.string().nullish(),
  modeloIdentificado:  z.string().nullish(),
  serialIdentificado:  z.string().nullish(),
  fabricanteIdentificado: z.string().nullish(),
  pendenciasAcao:      z.array(z.object({
    descricao: z.string().min(1).max(500),
  })).nullish(),
  confianca:           z.number().min(0).max(1).nullish(),
  observacoesIa:       z.string().nullish(),
});

function montarPrompt(textoPdf, catalogoTipos) {
  // Resumo do catalogo (codigo + nome + modalidade) para orientar a sugestao
  // do `codigoTipoSugerido` sem alucinar codigos que nao existem.
  const catalogoResumo = catalogoTipos
    .map((t) => `- ${t.codigo} (${t.modalidade}): ${t.nome}`)
    .join('\n');

  return `Voce e um assistente especialista em Controle de Qualidade de equipamentos
de radiodiagnostico segundo a norma RDC ANVISA 611/2022 e IN 90/2021.
Sua tarefa: extrair campos estruturados de um laudo emitido por fisico
medico ou empresa de consultoria (ex: MRA, FM Servicos), para pre-preencher
um formulario de cadastro no sistema SIMEC.

REGRAS:
1. Se nao tiver certeza de um campo, retorne null. NAO invente valores.
2. "numeroLaudo" tem formato tipico XXMD/SP/YYYY/ME/NNNN (ex: LRMD/SP/2024/ME/0238).
3. "responsavelRegistro" eh o registro profissional do fisico medico — formato
   tipico "ABFM RX 201/843" ou "CRM 5975-MS" ou similar.
4. "modalidade" deve ser EXATAMENTE uma destas (ou null):
   - "Mamografia"
   - "Tomografia Computadorizada"
   - "Raio-X"
   - "Densitometro Osseo"
   - "Ressonancia Magnetica"
   - "Ultrassom"
5. "codigoTipoSugerido" deve ser EXATAMENTE um codigo do catalogo abaixo (ou null
   se nao casar). Use o tipo mais especifico que combina com o conteudo do laudo.
6. "resultado":
   - "Aprovado" se laudo declara conformidade total
   - "AprovadoComRestricoes" se aprova mas lista restricoes/condicionais
   - "Reprovado" se reprova ou aponta nao-conformidade critica
7. "validadeMeses": se o laudo declarar validade explicita (ex: "valido por
   12 meses" ou "validade ate 2026-05"), converta para meses. Caso contrario null.
8. "dataExecucao": data em que o teste foi efetivamente realizado (ISO YYYY-MM-DD).
   Se houver multiplas datas, use a data principal do teste (nao da emissao).
9. "pendenciasAcao": busque secao "Recomendacoes — Providenciar" ou similar.
   Cada item da lista vira { "descricao": "texto da recomendacao" }.
   Se nao houver pendencias, retorne array vazio [].
10. "confianca": float 0-1 — sua confianca global na extracao.
11. "observacoesIa": opcional, ate 200 chars — alguma nota relevante para o
    revisor humano (ex: "data de emissao difere da data de execucao", "responsavel
    sem registro CRM/ABFM identificado").
12. "modeloIdentificado", "serialIdentificado", "fabricanteIdentificado":
    extraia se o laudo identifica o equipamento testado (ex: "Mamografo
    Hologic Selenia 3D, serial: 12345"). Servirao para matching com o
    cadastro do SIMEC. Use null se nao houver dado claro.

CATALOGO DE TIPOS DE TESTE DISPONIVEIS:
${catalogoResumo}

TEXTO DO LAUDO (truncado se muito longo):
${textoPdf.slice(0, 12_000)}

Retorne APENAS um objeto JSON valido com os campos descritos acima.`;
}

// Parse defensivo de data — se LLM emitir "20/05/2024" ao inves de ISO,
// tenta converter ao inves de descartar.
function normalizarData(valor) {
  if (!valor) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  const m = valor.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return null;
}

// Match fuzzy do codigoTipoSugerido contra o catalogo do tenant — corrige
// pequenas variacoes de case/acento mas devolve null se nao casar.
function resolverCodigoTipo(codigoSugerido, catalogoTipos) {
  if (!codigoSugerido) return null;
  const norm = String(codigoSugerido).toUpperCase().trim();
  const exato = catalogoTipos.find((t) => t.codigo === norm);
  if (exato) return exato.codigo;
  // Fallback: mesmo prefixo de modalidade + ultimo segmento
  return null;
}

/**
 * Extrai campos de um laudo PDF via LLM.
 *
 * @param {object} params
 * @param {Buffer} params.pdfBuffer
 * @param {string} params.tenantId
 * @param {Array<{id, codigo, nome, modalidade}>} params.catalogoTipos
 * @returns {Promise<{ok: boolean, dados?: object, alertas?: string[], erro?: string}>}
 */
export async function extrairLaudoCq({ pdfBuffer, tenantId, catalogoTipos }) {
  if (!pdfBuffer?.length) {
    return { ok: false, erro: 'pdf_vazio' };
  }

  let texto;
  try {
    const parsed = await pdfParse(pdfBuffer);
    texto = parsed.text || '';
  } catch (err) {
    return { ok: false, erro: `pdf_parse_failed: ${err.message}` };
  }

  if (!texto || texto.length < 100) {
    return { ok: false, erro: 'pdf_texto_vazio_ou_muito_curto' };
  }

  const prompt = montarPrompt(texto, catalogoTipos);

  let respostaCrua;
  try {
    respostaCrua = await generateJsonWithLlm(prompt, {
      tenantId,
      feature: 'cq_laudo_extractor',
    });
  } catch (err) {
    return { ok: false, erro: `llm_falhou: ${err.message}` };
  }

  const parsed = respostaSchema.safeParse(respostaCrua);
  if (!parsed.success) {
    return {
      ok: false,
      erro: 'llm_resposta_invalida',
      detalhes: parsed.error.issues.slice(0, 5),
    };
  }

  const d = parsed.data;
  const alertas = [];

  // Pos-processamento defensivo
  const dataNormalizada = normalizarData(d.dataExecucao);
  if (d.dataExecucao && !dataNormalizada) {
    alertas.push(`Data de execucao em formato nao reconhecido: "${d.dataExecucao}"`);
  }

  const codigoResolvido = resolverCodigoTipo(d.codigoTipoSugerido, catalogoTipos);
  if (d.codigoTipoSugerido && !codigoResolvido) {
    alertas.push(`Codigo de tipo sugerido "${d.codigoTipoSugerido}" nao consta no catalogo do tenant.`);
  }

  if (!d.responsavelNome) alertas.push('Responsavel tecnico nao identificado pela IA.');
  if (!d.numeroLaudo)     alertas.push('Numero do laudo nao identificado pela IA.');
  if (!d.resultado)       alertas.push('Resultado (Aprovado/Reprovado) nao identificado pela IA.');

  return {
    ok: true,
    dados: {
      numeroLaudo:         d.numeroLaudo || null,
      empresaExecutora:    d.empresaExecutora || null,
      responsavelNome:     d.responsavelNome || null,
      responsavelRegistro: d.responsavelRegistro || null,
      validadeMeses:       d.validadeMeses ?? null,
      dataExecucao:        dataNormalizada,
      resultado:           d.resultado || null,
      modalidade:          d.modalidade || null,
      codigoTipoSugerido:  codigoResolvido,
      pendenciasAcao:      Array.isArray(d.pendenciasAcao) ? d.pendenciasAcao : [],
      confianca:           d.confianca ?? null,
      observacoesIa:       d.observacoesIa || null,
      modeloIdentificado:  d.modeloIdentificado || null,
      serialIdentificado:  d.serialIdentificado || null,
      fabricanteIdentificado: d.fabricanteIdentificado || null,
    },
    alertas,
  };
}
