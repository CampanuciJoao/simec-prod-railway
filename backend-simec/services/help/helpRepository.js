import prisma from '../prismaService.js';

export function listarHelpArticles({ categoria, audience, published = true }) {
  return prisma.helpArticle.findMany({
    where: {
      published,
      ...(categoria ? { categoria } : {}),
      ...(audience ? { audience: { in: [audience, 'all'] } } : {}),
    },
    orderBy: [{ categoria: 'asc' }, { titulo: 'asc' }],
  });
}

export function listarHelpArticlesAdmin() {
  return prisma.helpArticle.findMany({
    orderBy: [{ categoria: 'asc' }, { titulo: 'asc' }],
  });
}

export function buscarHelpArticlePorSlug(slug) {
  return prisma.helpArticle.findUnique({
    where: { slug },
  });
}

export function criarHelpArticle(data) {
  return prisma.helpArticle.create({ data });
}

export function atualizarHelpArticle(id, data) {
  return prisma.helpArticle.update({
    where: { id },
    data,
  });
}
