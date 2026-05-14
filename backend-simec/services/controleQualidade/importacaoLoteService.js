// Importacao em lote de PDFs antigos de laudos CQ.
//
// Fluxo:
// 1. extrairLote(): para cada PDF, salva em R2 temp, roda LLM, tenta
//    matching de equipamento. Retorna lista para revisao do usuario.
// 2. criarLote(): apos confirmacao, cria N TesteQualidade e move R2 temp
//    -> R2 final via adicionarAnexos. Tudo soft-failable: erro em 1 PDF
//    nao impede os demais.
//
// Cache temporario em R2 com folder dedicado 'tmp/cq-import/{tenant}/{tempId}'
// permite cleanup em massa via cron e isolamento por tenant.

import crypto from 'crypto';
import path from 'path';

import prisma from '../prismaService.js';
import {
  uploadToR2,
  getFromR2,
  deleteStoredFile,
} from '../uploads/fileStorageService.js';
import { adicionarAnexos } from '../uploads/anexoService.js';

import { extrairLaudoCq } from './laudoLlmExtractor.js';
import { matchEquipamento } from './equipamentoMatcher.js';
import { listarTipos } from './controleQualidadeRepository.js';
import { criarTesteService } from './index.js';

function tmpKey(tenantId, tempId) {
  return `tmp/cq-import/${tenantId}/${tempId}.pdf`;
}

/**
 * Extrai N PDFs em paralelo (limite interno) e devolve resultado por arquivo.
 * Cada PDF eh salvo em R2 temp para ser referenciado depois em criarLote.
 */
export async function extrairLoteService({ tenantId, files }) {
  if (!Array.isArray(files) || files.length === 0) {
    return { ok: false, erro: 'sem_arquivos' };
  }
  if (files.length > 50) {
    return { ok: false, erro: 'lote_excede_50_arquivos' };
  }

  const catalogoTipos = await listarTipos({ tenantId, somenteAtivos: true });
  const catalogoLite = catalogoTipos.map((t) => ({
    id: t.id, codigo: t.codigo, nome: t.nome, modalidade: t.modalidade,
  }));

  // Roda em sequencia para nao estourar rate limit OpenAI (~5 req/s).
  // 50 PDFs leva ~5min; aceitavel para importacao manual.
  const resultados = [];
  for (const file of files) {
    const tempId = crypto.randomUUID();
    const key = tmpKey(tenantId, tempId);

    try {
      await uploadToR2(key, file.buffer, file.mimetype);
    } catch (e) {
      resultados.push({
        tempId, fileName: file.originalname,
        ok: false, erro: `r2_upload_failed: ${e.message}`,
      });
      continue;
    }

    const r = await extrairLaudoCq({
      pdfBuffer: file.buffer,
      tenantId,
      catalogoTipos: catalogoLite,
    });

    if (!r.ok) {
      resultados.push({
        tempId, fileName: file.originalname, r2Key: key,
        ok: false, erro: r.erro,
      });
      continue;
    }

    const match = await matchEquipamento({
      tenantId,
      modelo:      r.dados.modeloIdentificado,
      serial:      r.dados.serialIdentificado,
      fabricante:  r.dados.fabricanteIdentificado,
      modalidade:  r.dados.modalidade,
      sala:        r.dados.salaIdentificada,
      unidadeIdentificada: r.dados.unidadeIdentificada,
    });

    resultados.push({
      tempId,
      fileName: file.originalname,
      r2Key: key,
      ok: true,
      dados: r.dados,
      alertas: r.alertas,
      equipamentoSugerido: match?.equipamento
        ? {
            id: match.equipamento.id,
            modelo: match.equipamento.modelo,
            tag: match.equipamento.tag,
            tipo: match.equipamento.tipo,
            fabricante: match.equipamento.fabricante,
          }
        : null,
      matchCriterio: match?.criterio || null,
      matchScore: match?.score ?? null,
    });
  }

  return { ok: true, resultados };
}

/**
 * Cria N testes a partir do payload confirmado pelo usuario. Cada item
 * deve trazer { tempId, equipamentoId, tipoTesteId, dados, importarAnexo }.
 * Anexos sao copiados de R2 temp -> R2 final via adicionarAnexos.
 */
export async function criarLoteService({ tenantId, usuarioId, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, erro: 'sem_itens' };
  }

  const criados = [];
  const falhas = [];

  for (const item of items) {
    const { tempId, r2Key, equipamentoId, tipoTesteId, dados, importarAnexo, fileName } = item;

    try {
      const r = await criarTesteService({
        tenantId, usuarioId,
        dados: {
          equipamentoId,
          tipoTesteId,
          dataExecucao:        dados.dataExecucao,
          resultado:           dados.resultado,
          numeroLaudo:         dados.numeroLaudo,
          empresaExecutora:    dados.empresaExecutora,
          responsavelNome:     dados.responsavelNome,
          responsavelRegistro: dados.responsavelRegistro,
          validadeMeses:       dados.validadeMeses,
          observacoes:         dados.observacoes || `Importado em lote de "${fileName || tempId}".`,
          pendenciasAcao:      Array.isArray(dados.pendenciasAcao)
            ? dados.pendenciasAcao.map((p) => ({ descricao: p.descricao, resolvido: false }))
            : [],
        },
      });

      if (!r.ok) {
        falhas.push({ tempId, fileName, erro: r.message, fieldErrors: r.fieldErrors });
        continue;
      }

      // Move PDF do R2 temp para R2 final via adicionarAnexos (se solicitado)
      if (importarAnexo && r2Key) {
        try {
          const obj = await getFromR2(r2Key);
          const chunks = [];
          for await (const chunk of obj.Body) chunks.push(chunk);
          const buffer = Buffer.concat(chunks);
          const file = {
            originalname: fileName || `laudo-importado-${tempId}.pdf`,
            buffer,
            mimetype: 'application/pdf',
            size: buffer.length,
          };
          await adicionarAnexos({
            resource: 'controleQualidade',
            tenantId, usuarioId,
            entityId: r.data.id,
            files: [file],
          });
        } catch (e) {
          console.error(`[CQ_IMPORT_ANEXO_FAIL] tempId=${tempId}`, e);
          // Nao bloqueia: teste foi criado, anexo eh secundario
        }
      }

      criados.push({ tempId, testeId: r.data.id });

      // Cleanup R2 temp
      if (r2Key) deleteStoredFile(r2Key);
    } catch (e) {
      console.error(`[CQ_IMPORT_FAIL] tempId=${tempId}`, e);
      falhas.push({ tempId, fileName, erro: e.message });
    }
  }

  return { ok: true, criados: criados.length, falhas, detalhes: { criados, falhas } };
}

/**
 * Cleanup explicito (usuario desistiu): remove os R2 temp do lote.
 */
export async function descartarLoteService({ r2Keys }) {
  if (!Array.isArray(r2Keys)) return { ok: true, removidos: 0 };
  for (const k of r2Keys) {
    if (k && k.startsWith('tmp/cq-import/')) deleteStoredFile(k);
  }
  return { ok: true, removidos: r2Keys.length };
}
