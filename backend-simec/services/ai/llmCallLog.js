import prisma from '../prismaService.js';
import { calcularCustoUsd } from './llmPricing.js';

// Grava uma chamada LLM no LlmCallLog. Falha SILENCIOSA — o registro de
// uso nunca deve bloquear a chamada principal nem propagar erro de DB
// pra resposta do usuario.
//
// Campos obrigatorios: feature, provider, model, status, durationMs.
// Demais campos sao opcionais — tenantId pode ser null em chamadas
// cross-tenant (eval, jobs globais), refType/refId apontam (sem FK) pra
// entidade que originou a chamada (GehcPdfDocumento, IaConversa, etc).
//
// O custo USD eh calculado AQUI a partir dos tokens + tabela de precos,
// nao confiando em valor pre-calculado externamente — garante consistencia
// quando atualizarmos llmPricing.js.
export async function registrarLlmCall({
  tenantId = null,
  feature,
  provider,
  model,
  status,
  tokensIn = 0,
  tokensOut = 0,
  durationMs = 0,
  refType = null,
  refId = null,
  errorMessage = null,
}) {
  try {
    const costUsd = calcularCustoUsd({ model, tokensIn, tokensOut });

    await prisma.llmCallLog.create({
      data: {
        tenantId,
        feature,
        provider,
        model,
        status,
        tokensIn,
        tokensOut,
        costUsd,
        durationMs,
        refType,
        refId,
        errorMessage: errorMessage ? String(errorMessage).slice(0, 500) : null,
      },
    });
  } catch (err) {
    // Nunca bloquear chamada principal. So loga warning pra debug.
    console.warn('[LLM_CALL_LOG] Falha ao gravar registro:', err.message);
  }
}
