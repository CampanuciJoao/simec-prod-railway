import {
  atualizarHelpArticle,
  buscarHelpArticlePorSlug,
  criarHelpArticle,
  listarHelpArticles,
  listarHelpArticlesAdmin,
} from './helpRepository.js';

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');
}

function sanitizeArticlePayload(payload = {}) {
  return {
    categoria: String(payload.categoria || '').trim(),
    titulo: String(payload.titulo || '').trim(),
    resumo: payload.resumo ? String(payload.resumo).trim() : null,
    conteudoMarkdown: String(payload.conteudoMarkdown || '').trim(),
    audience: String(payload.audience || 'all').trim(),
    published: payload.published !== false,
    slug: normalizeSlug(payload.slug || payload.titulo),
  };
}

export async function listarHelpArticlesService({ categoria, role }) {
  const audience = role === 'superadmin' ? 'superadmin' : role === 'admin' ? 'admin' : 'user';
  return listarHelpArticles({ categoria, audience, published: true });
}

export async function detalharHelpArticleService(slug, role) {
  const article = await buscarHelpArticlePorSlug(slug);

  if (!article || !article.published) {
    return {
      ok: false,
      status: 404,
      message: 'Artigo nao encontrado.',
    };
  }

  const allowed =
    article.audience === 'all' ||
    article.audience === role ||
    (role === 'superadmin' && ['admin', 'user'].includes(article.audience)) ||
    (role === 'admin' && article.audience === 'user');

  if (!allowed) {
    return {
      ok: false,
      status: 403,
      message: 'Artigo indisponivel para este perfil.',
    };
  }

  return {
    ok: true,
    status: 200,
    data: article,
  };
}

export async function listarHelpArticlesAdminService() {
  return listarHelpArticlesAdmin();
}

export async function criarHelpArticleService(payload) {
  const data = sanitizeArticlePayload(payload);

  if (!data.categoria || !data.titulo || !data.conteudoMarkdown || !data.slug) {
    return {
      ok: false,
      status: 400,
      message: 'Categoria, titulo e conteudo sao obrigatorios.',
    };
  }

  const article = await criarHelpArticle(data);
  return {
    ok: true,
    status: 201,
    data: article,
  };
}

export async function atualizarHelpArticleService(id, payload) {
  const data = sanitizeArticlePayload(payload);

  if (!data.categoria || !data.titulo || !data.conteudoMarkdown || !data.slug) {
    return {
      ok: false,
      status: 400,
      message: 'Categoria, titulo e conteudo sao obrigatorios.',
    };
  }

  const article = await atualizarHelpArticle(id, data);
  return {
    ok: true,
    status: 200,
    data: article,
  };
}
