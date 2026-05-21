// Logo customizado por tenant. Armazenado em R2; metadata (path) em
// Tenant.logoPath. Cache em memória de 60s para evitar bater no R2 a
// cada PDF gerado.
//
// Pipeline:
//   uploadLogo()     — recebe Buffer + mimetype, salva no R2, atualiza
//                       Tenant.logoPath, apaga o logo anterior.
//   removerLogo()    — apaga do R2 + zera Tenant.logoPath.
//   obterLogoBuffer()— lê do R2 (com cache), retorna Buffer ou null se
//                       o tenant não tem logo.
//
// Uso nos PDF services:
//   const logoBuffer = await obterLogoBuffer(tenantId);
//   if (logoBuffer) doc.image(logoBuffer, x, y, { fit: [42, 42] });
//   else if (fs.existsSync(logoSimecPath)) doc.image(logoSimecPath, ...);

import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../prismaService.js';
import { uploadToR2, getFromR2, deleteFromR2 } from './fileStorageService.js';

const MIMES_PERMITIDOS = new Set(['image/png', 'image/jpeg', 'image/jpg']);
const TAMANHO_MAX_BYTES = 2 * 1024 * 1024;
const CACHE_TTL_MS = 60_000;

// Map<tenantId, { buffer, mimetype, expiresAt }>
const cache = new Map();

function cacheKey(tenantId) {
  return tenantId;
}

function getCached(tenantId) {
  const entry = cache.get(cacheKey(tenantId));
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(cacheKey(tenantId));
    return null;
  }
  return entry;
}

function setCached(tenantId, buffer, mimetype) {
  cache.set(cacheKey(tenantId), {
    buffer,
    mimetype,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function invalidarCache(tenantId) {
  cache.delete(cacheKey(tenantId));
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function validar({ buffer, mimetype, originalname }) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { ok: false, message: 'Arquivo vazio ou inválido.' };
  }
  if (buffer.length > TAMANHO_MAX_BYTES) {
    return {
      ok: false,
      message: `Arquivo muito grande (${(buffer.length / 1024 / 1024).toFixed(2)} MB). Máximo: 2 MB.`,
    };
  }
  if (!MIMES_PERMITIDOS.has(mimetype)) {
    return {
      ok: false,
      message: `Formato não suportado (${mimetype}). Use PNG ou JPG.`,
    };
  }
  const ext = path.extname(String(originalname || '')).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
    return {
      ok: false,
      message: 'Extensão do arquivo deve ser .png, .jpg ou .jpeg.',
    };
  }
  return { ok: true };
}

function gerarPath(tenantId, originalname) {
  const ext = path.extname(String(originalname || '.png')).toLowerCase() || '.png';
  return `uploads/tenants/${tenantId}/logo-${uuidv4()}${ext}`;
}

export async function uploadLogo({ tenantId, file }) {
  const validacao = validar({
    buffer: file?.buffer,
    mimetype: file?.mimetype,
    originalname: file?.originalname,
  });
  if (!validacao.ok) {
    return { ok: false, status: 400, message: validacao.message };
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return { ok: false, status: 404, message: 'Tenant não encontrado.' };
  }

  const logoPathAntigo = tenant.logoPath;
  const novoPath = gerarPath(tenantId, file.originalname);

  await uploadToR2(novoPath, file.buffer, file.mimetype);

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { logoPath: novoPath },
  });

  invalidarCache(tenantId);

  // Apaga o anterior só DEPOIS de salvar o novo (operação segura: se R2
  // do antigo falhar, o novo já está no DB e operante).
  if (logoPathAntigo && logoPathAntigo !== novoPath) {
    try {
      await deleteFromR2(logoPathAntigo);
    } catch (err) {
      console.warn('[TENANT_LOGO] Falha ao remover logo anterior:', err.message);
    }
  }

  return {
    ok: true,
    status: 200,
    data: {
      logoPath: novoPath,
      mimetype: file.mimetype,
      bytes: file.buffer.length,
    },
  };
}

export async function removerLogo({ tenantId }) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return { ok: false, status: 404, message: 'Tenant não encontrado.' };
  }
  if (!tenant.logoPath) {
    return { ok: true, status: 200, data: { removido: false } };
  }

  const pathAntigo = tenant.logoPath;
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { logoPath: null },
  });

  invalidarCache(tenantId);

  try {
    await deleteFromR2(pathAntigo);
  } catch (err) {
    console.warn('[TENANT_LOGO] Falha ao remover logo do R2:', err.message);
  }

  return { ok: true, status: 200, data: { removido: true } };
}

// Lê do R2 com cache em memória. Retorna { buffer, mimetype } ou null
// se o tenant não tem logo configurado. NUNCA lança erro — em qualquer
// falha de leitura/R2 cai pra null e os PDFs caem no logo SIMEC default.
export async function obterLogoBuffer(tenantId) {
  if (!tenantId) return null;

  const cached = getCached(tenantId);
  if (cached) return cached;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { logoPath: true },
    });

    if (!tenant?.logoPath) {
      return null;
    }

    const obj = await getFromR2(tenant.logoPath);
    const buffer = await streamToBuffer(obj.Body);
    const mimetype = obj.ContentType || 'image/png';

    setCached(tenantId, buffer, mimetype);
    return { buffer, mimetype };
  } catch (err) {
    console.warn(`[TENANT_LOGO] Falha ao ler logo do tenant ${tenantId}: ${err.message}`);
    return null;
  }
}

// Para o endpoint GET /api/tenant/logo — devolve raw + content-type pro
// frontend exibir como <img src>. Igual ao obterLogoBuffer mas exposto
// como API separada caso queiramos uma versão sem cache no futuro.
export async function obterLogoParaStream(tenantId) {
  return obterLogoBuffer(tenantId);
}
