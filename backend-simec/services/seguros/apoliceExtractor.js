// services/seguros/apoliceExtractor.js
// Extrai dados estruturados de uma apólice em PDF usando LLM.
// Suporta PDFs protegidos por senha via pdfjs-dist.

import { z } from 'zod';
import { generateJsonWithLlm } from '../ai/llmService.js';

const MAX_CHARS = 14000; // primeiras páginas bastam — condições gerais são boilerplate

// ─── Erros tipados ──────────────────────────────────────────────────────────
export class ApoliceExtractorError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'ApoliceExtractorError';
  }
}

// ─── Extração de texto do PDF ───────────────────────────────────────────────
async function extrairTexto(buffer, password) {
  // pdfjs-dist em ESM precisa do build legacy pra rodar no Node
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    password: password || '',
    isEvalSupported: false,
    useSystemFonts: true,
  });

  let pdf;
  try {
    pdf = await loadingTask.promise;
  } catch (err) {
    const name = err?.name || '';
    if (name === 'PasswordException') {
      if (err.code === 1) {
        // 1 = NEED_PASSWORD
        throw new ApoliceExtractorError(
          'ERR_PDF_PROTECTED',
          'PDF protegido por senha. Informe a senha para extrair os dados.'
        );
      }
      // 2 = INCORRECT_PASSWORD
      throw new ApoliceExtractorError(
        'ERR_PDF_PASSWORD_INVALID',
        'Senha incorreta. Tente novamente.'
      );
    }
    throw new ApoliceExtractorError(
      'ERR_PDF_PARSE',
      `Não foi possível ler o PDF: ${err?.message || 'erro desconhecido'}`
    );
  }

  const partes = [];
  const maxPaginas = Math.min(pdf.numPages, 12); // 12 páginas costuma cobrir tudo

  for (let i = 1; i <= maxPaginas; i++) {
    const pagina = await pdf.getPage(i);
    const conteudo = await pagina.getTextContent();
    const linha = conteudo.items.map((it) => it.str || '').join(' ');
    partes.push(linha);

    if (partes.join('\n').length > MAX_CHARS) break;
  }

  await pdf.cleanup?.();
  return partes.join('\n').slice(0, MAX_CHARS);
}

// ─── Dicionário de coberturas canônicas ─────────────────────────────────────
// Mapeia nomes que aparecem em apólices reais para o catálogo flat do SIMEC.
const DICIONARIO_COBERTURAS = `
DICIONÁRIO DE COBERTURAS (nome no PDF → campo canônico):
- "Incêndio", "Incêndio/Raio/Explosão", "Incêndio, Raio, Explosão, Implosão, Fumaça, Queda de Aeronaves" → lmiIncendio
- "Danos Elétricos" → lmiDanosEletricos
- "Roubo", "Furto", "Roubo Mediante Arrombamento", "Equipamentos Estacionários (Incluindo Roubo e Furto)", "Objetos Portáteis (Incluindo Roubo e Furto)" → lmiRoubo
- "Quebra de Vidros", "Vidros, Espelhos, Mármores" → lmiVidros
- "Vendaval", "Vendaval/Furacão/Ciclone/Tornado/Granizo", "Vendaval com Impacto de Veículos" → lmiVendaval
- "Danos de Causa Externa" → lmiDanosCausaExterna
- "Derrame e/ou Vazamento de Tanques e Tubulações" → lmiVazamentoTanques
- "Lucros Cessantes", "Perda de Lucro Bruto" → lmiPerdaLucroBruto
- "Responsabilidade Civil Operações", "Responsabilidade Civil" → lmiResponsabilidadeCivil
- "Casco", "Valor Mercado Referenciado", "VMR" (Auto) → lmiColisao
- "Danos Materiais a Terceiros", "RCF Materiais" → lmiDanosMateriais
- "Danos Corporais a Terceiros", "RCF Corporais" → lmiDanosCorporais
- "Danos Morais" → lmiDanosMorais
- "APP", "Acidentes Pessoais Passageiros", "Morte por Passageiro", "Invalidez por Passageiro" → lmiAPP

Coberturas SEM equivalente no catálogo (IGNORE — não inclua na saída):
- Despesas de Aluguel / Perda de Aluguel / Pagamento de Aluguel
- Recomposição de Documentos
- Assistência 24h / Auto Reserva / Repare Fácil / Vidro Protegido
- Salvamento e Contenção de Sinistros
- Reintegração Automática
- Renúncia de Sub-rogação
`.trim();

// ─── Schema de saída esperado do LLM ────────────────────────────────────────
const ApoliceExtraidaSchema = z.object({
  apoliceNumero: z.string().nullable(),
  seguradora: z.string().nullable(),
  dataInicio: z.string().nullable().describe('ISO date YYYY-MM-DD'),
  dataFim: z.string().nullable().describe('ISO date YYYY-MM-DD'),
  premioTotal: z.number().nullable(),
  tipoSeguro: z
    .enum(['EQUIPAMENTO', 'PREDIAL', 'AUTO', 'RESPONSABILIDADE_CIVIL', 'OUTRO'])
    .nullable(),
  localRisco: z
    .object({
      cep: z.string().nullable(),
      logradouro: z.string().nullable(),
      numero: z.string().nullable(),
      bairro: z.string().nullable(),
      cidade: z.string().nullable(),
      estado: z.string().nullable(),
    })
    .nullable(),
  bens: z
    .array(
      z.object({
        numeroSerie: z.string().nullable(),
        modelo: z.string().nullable(),
        fabricante: z.string().nullable(),
        ano: z.string().nullable(),
        placa: z.string().nullable(),
        chassi: z.string().nullable(),
      })
    )
    .default([]),
  coberturas: z
    .object({
      lmiIncendio: z.number().default(0),
      lmiDanosEletricos: z.number().default(0),
      lmiRoubo: z.number().default(0),
      lmiVidros: z.number().default(0),
      lmiVendaval: z.number().default(0),
      lmiDanosCausaExterna: z.number().default(0),
      lmiVazamentoTanques: z.number().default(0),
      lmiPerdaLucroBruto: z.number().default(0),
      lmiResponsabilidadeCivil: z.number().default(0),
      lmiColisao: z.number().default(0),
      lmiDanosMateriais: z.number().default(0),
      lmiDanosCorporais: z.number().default(0),
      lmiDanosMorais: z.number().default(0),
      lmiAPP: z.number().default(0),
    })
    .default({}),
});

// ─── Prompt builder ─────────────────────────────────────────────────────────
function montarPrompt(texto) {
  return `Você é um especialista em extrair dados estruturados de apólices de seguro brasileiras.

${DICIONARIO_COBERTURAS}

REGRAS DE EXTRAÇÃO:
1. Retorne APENAS um JSON válido, sem markdown, sem texto adicional.
2. Datas no formato ISO YYYY-MM-DD. Se a apólice diz "08/08/2025 até 08/08/2026", retorne "2025-08-08" e "2026-08-08".
3. Valores monetários como número (sem R$, sem ponto de milhar, vírgula vira ponto). Ex: "R$ 4.870.000,00" → 4870000.
4. tipoSeguro: EQUIPAMENTO (raio-x, ressonância, kit solar fotovoltaico), PREDIAL (prédio/conteúdo/empresarial), AUTO (carro/moto), RESPONSABILIDADE_CIVIL, OUTRO.
5. localRisco: extraia o endereço de "Local de Risco" / "Local do Risco" / "Endereço do Risco". Para auto, use o endereço de pernoite. CEP no formato 12345-678 ou 12345678.
6. bens: liste todos os bens segurados com série/chassi/placa/modelo/fabricante. Pra equipamentos médicos a "série" pode aparecer como "Nº Série", "Nº Chassi" ou similar.
7. coberturas: mapeie usando o dicionário acima. Some valores se a mesma cobertura aparecer em mais de uma linha (improvável, mas possível). Coberturas não listadas no dicionário: IGNORE.
8. Se um campo não aparece na apólice, retorne null (ou 0 para coberturas, [] para bens).

SCHEMA DE SAÍDA:
{
  "apoliceNumero": "string ou null",
  "seguradora": "string ou null",
  "dataInicio": "YYYY-MM-DD ou null",
  "dataFim": "YYYY-MM-DD ou null",
  "premioTotal": "number ou null",
  "tipoSeguro": "EQUIPAMENTO|PREDIAL|AUTO|RESPONSABILIDADE_CIVIL|OUTRO ou null",
  "localRisco": {
    "cep": "string ou null",
    "logradouro": "string ou null",
    "numero": "string ou null",
    "bairro": "string ou null",
    "cidade": "string ou null",
    "estado": "string ou null (UF de 2 letras)"
  },
  "bens": [{ "numeroSerie": "string ou null", "modelo": "string ou null", "fabricante": "string ou null", "ano": "string ou null", "placa": "string ou null", "chassi": "string ou null" }],
  "coberturas": { "lmiIncendio": 0, "lmiDanosEletricos": 0, "lmiRoubo": 0, "lmiVidros": 0, "lmiVendaval": 0, "lmiDanosCausaExterna": 0, "lmiVazamentoTanques": 0, "lmiPerdaLucroBruto": 0, "lmiResponsabilidadeCivil": 0, "lmiColisao": 0, "lmiDanosMateriais": 0, "lmiDanosCorporais": 0, "lmiDanosMorais": 0, "lmiAPP": 0 }
}

TEXTO DA APÓLICE:
${texto}`;
}

// ─── API pública ────────────────────────────────────────────────────────────
export async function extrairApolice(buffer, { password = null, tenantId = null } = {}) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new ApoliceExtractorError('ERR_INVALID_INPUT', 'Buffer do PDF é obrigatório.');
  }

  const texto = await extrairTexto(buffer, password);

  if (!texto || texto.trim().length < 50) {
    throw new ApoliceExtractorError(
      'ERR_PDF_EMPTY',
      'Não foi possível extrair texto do PDF. Pode ser uma imagem digitalizada sem OCR.'
    );
  }

  const prompt = montarPrompt(texto);

  let bruto;
  try {
    bruto = await generateJsonWithLlm(prompt, {
      tenantId,
      feature: 'apolice-extractor',
    });
  } catch (err) {
    throw new ApoliceExtractorError(
      'ERR_LLM_FAILED',
      `IA não conseguiu interpretar a apólice: ${err?.message || 'erro desconhecido'}`
    );
  }

  const parsed = ApoliceExtraidaSchema.safeParse(bruto);

  if (!parsed.success) {
    throw new ApoliceExtractorError(
      'ERR_LLM_INVALID_SCHEMA',
      `IA retornou estrutura inválida: ${parsed.error.errors.map((e) => e.path.join('.')).join(', ')}`
    );
  }

  return parsed.data;
}
