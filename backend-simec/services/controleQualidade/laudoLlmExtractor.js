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
  salaIdentificada:    z.string().nullish(),
  unidadeIdentificada: z.object({
    razaoSocial: z.string().nullish(),
    cnpj:        z.string().nullish(),
    endereco:    z.string().nullish(),
    cidade:      z.string().nullish(),
  }).nullish(),
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
   PROCURE em todo o documento incluindo cabecalho e rodape. Tambem pode aparecer
   como "Relatorio Nº", "Laudo Nº", "Documento Nº", "Protocolo".
3. "responsavelNome" e "responsavelRegistro" — quem EXECUTOU e ASSINOU o
   laudo, NAO o responsavel institucional do estabelecimento.
   ATENCAO IMPORTANTE: laudos brasileiros frequentemente listam DOIS
   responsaveis diferentes:
   a. "Responsavel Tecnico" do ESTABELECIMENTO — geralmente um medico
      diretor da clinica com registro CRM. Aparece nos "DADOS DO CLIENTE"
      ou cabecalho institucional. Ex: "Res. Tecnico (RT): Dr. Luiz Dias
      Dutra, CRM: 4060-MS". *** NAO USE ESSE. ***
   b. O FISICO MEDICO que executou o teste e assinou o laudo. Geralmente
      tem registro ABFM ou CRF, nao CRM. Pode aparecer:
      - Em bloco de assinatura digital no rodape ("Assinado de forma
        digital por NOME EM CAPS:cpf"), seguido por nome em Title Case
        e cargo "Fisico Medico e Responsavel Tecnico".
      - Em assinatura escaneada/manuscrita ao final, com nome digitado
        abaixo + registro: "Vitor Marinelli Belonezi / ABFM RX 291/1220
        / Especialista em Fisica do Radiodiagnostico".
   *** PREFIRA SEMPRE ABFM > CRF > CRBM > CRM. Se houver ABFM no documento,
   esse eh o responsavel correto. Se so houver CRM, use-o como fallback. ***
   "responsavelRegistro" eh o registro profissional — formato tipico
   "ABFM RX 201/843", "ABFM/RX 201/843", "ABFM RX 291/1220", "CRF 1234".
4. "modalidade" deve ser EXATAMENTE uma destas (ou null):
   - "Mamografia"
   - "Tomografia Computadorizada"
   - "Raio-X"
   - "Densitometro Osseo"
   - "Ressonancia Magnetica"
   - "Ultrassom"
5. "codigoTipoSugerido" deve ser EXATAMENTE um codigo do catalogo abaixo (ou null
   se nao casar). REGRA DE ESCOLHA:
   - O catalogo tem 3 categorias por modalidade:
     * CQ_<MOD>  — Controle de Qualidade (umbrella, testes fisicos do equipamento)
     * LR_<MOD>  — Levantamento Radiometrico Ambiental (radiacao saindo das salas)
     * EPI_<MOD> — Eficiencia de Blindagem (aventais e protetores de tireoide)
   - Se o laudo abrange MULTIPLAS frentes em um documento unico (ex: testes
     fisicos do equipamento + dose + uniformidade + EPIs + LR todos juntos)
     -> use sempre CQ_<MOD>. Esta eh a categoria umbrella.
   - Se o laudo eh PONTUAL e claramente sobre apenas UM tipo:
     * So levantamento radiometrico ambiental -> LR_<MOD>
     * So avaliacao de EPIs / aventais plumbiferos -> EPI_<MOD>
     * Apenas testes fisicos de constancia / phantom / dose -> CQ_<MOD>
   - O titulo do laudo geralmente diz: "Testes de Constancia", "Controle
     de Qualidade", "Levantamento Radiometrico", "Avaliacao de EPIs", etc.
6. "resultado":
   - "Aprovado" se laudo declara conformidade total
   - "AprovadoComRestricoes" se aprova mas lista restricoes/condicionais
   - "Reprovado" se reprova ou aponta nao-conformidade critica
7. "validadeMeses": se o laudo declarar validade explicita, converta para meses:
   - "1 ano", "anual" -> 12
   - "2 anos" -> 24
   - "4 anos", "quadrienal" -> 48
   - "6 meses", "semestral" -> 6
   - "valido por 12 meses" -> 12
   - "validade ate 2026-05" -> calcular meses ate la
   Tabela de validade dentro do PDF tem coluna "Validade" com cada teste —
   pegue o maior valor declarado. Caso contrario null.
8. "dataExecucao": data em que o teste foi efetivamente realizado (ISO YYYY-MM-DD).
   Se houver multiplas datas, use a data principal do teste (nao da emissao,
   nao da assinatura digital).
   ACEITA varios formatos brasileiros:
   - "22/08/2025" -> "2025-08-22"
   - "26 maio, 2020" / "26 de maio de 2020" -> "2020-05-26"
   - "agosto 2025" (mes/ano) -> use dia 1: "2025-08-01"
   Meses por extenso: janeiro=01, fevereiro=02, marco=03, abril=04,
   maio=05, junho=06, julho=07, agosto=08, setembro=09, outubro=10,
   novembro=11, dezembro=12.
9. "pendenciasAcao": busque secao "Recomendacoes — Providenciar" ou similar.
   Cada item da lista vira { "descricao": "texto da recomendacao" }.
   Se nao houver pendencias, retorne array vazio [].
10. "confianca": float 0-1 — sua confianca global na extracao.
11. "observacoesIa": opcional, ate 200 chars — alguma nota relevante para o
    revisor humano (ex: "data de emissao difere da data de execucao", "nome
    extraido apenas da assinatura digital").
12. "modeloIdentificado", "serialIdentificado", "fabricanteIdentificado",
    "salaIdentificada":
    extraia se o laudo identifica o equipamento testado. Procure em sessoes
    como "DADOS DO EQUIPAMENTO", "Identificacao do equipamento",
    "Equipamento", "Sistema avaliado". Exemplos:
      - "Tomografo GE Discovery 710, serial: HC1234, Sala TC"
      - "Mamografo Hologic Selenia 3D, NS 56789, Sala Mamografia"
      - Bloco tabular com "Marca: GE / Modelo: Discovery / Sala: PET/CT"
    fabricante normalmente eh GE/GE Healthcare, Philips, Siemens, Hologic,
    Toshiba/Canon, Shimadzu.
    "salaIdentificada" eh a sala/setor onde o equipamento esta instalado
    (rotulos: "Sala", "Local", "Setor", "Ambiente"). Exemplos de valores:
    "PET/CT", "Sala TC", "Mamografia", "Raio-X 1", "RM 3T". Eh uma pista
    forte para o matcher: cada sala tipicamente tem 1 unico equipamento na
    unidade. Use null se nao houver. NAO inclua o prefixo "Sala" no valor —
    devolva so o nome (ex: "PET/CT", nao "Sala PET/CT").
13. "unidadeIdentificada": extraia o cliente/local onde o equipamento esta
    instalado. Procure secoes "DADOS DO CLIENTE", "Cliente", "Identificacao",
    "Razao Social", "Endereco", "CNPJ". Exemplo tipico:
      "Razao Social: CERDIL - Centro de Radiologia e Diagnostico por Imagem Ltda"
      "CNPJ: 03.304.188/0001-50"
      "Endereco: Rua Dr. Antonio Emilio de Figueiredo, 2280 - Dourados/MS"
    Estruture como {
      "razaoSocial": "...",
      "cnpj": "apenas digitos ou XX.XXX.XXX/XXXX-XX",
      "endereco": "logradouro completo",
      "cidade": "cidade/UF se separavel"
    }. Campo nao identificado vira null. Esta info NAO aparece no formulario
    — eh usada internamente para filtrar o equipamento certo entre tenants
    com varios sites.
14. "empresaExecutora" frequentemente aparece no CABECALHO de TODAS as
    paginas como nome da empresa que assinou o laudo (ex:
    "FM - SERVICOS DE FISICA MEDICA E PROTECAO RADIOLOGICA",
    "MRA Divisao de Consultoria"). NAO confunda com a "Razao Social" do
    cliente (que vai em unidadeIdentificada).

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
      salaIdentificada:    d.salaIdentificada || null,
      unidadeIdentificada: d.unidadeIdentificada
        ? {
            razaoSocial: d.unidadeIdentificada.razaoSocial || null,
            cnpj:        d.unidadeIdentificada.cnpj || null,
            endereco:    d.unidadeIdentificada.endereco || null,
            cidade:      d.unidadeIdentificada.cidade || null,
          }
        : null,
    },
    alertas,
  };
}
