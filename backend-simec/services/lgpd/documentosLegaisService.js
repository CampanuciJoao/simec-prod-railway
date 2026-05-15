// Servico de documentos legais (Politica de Privacidade, Termos de Uso).
// Os textos vigentes ficam versionados em docs/lgpd/ no repo (markdown com
// frontmatter). Aqui lemos no boot, extraimos versao + conteudo e expomos
// via API. Atualizar versao = editar arquivo + bumpar 'versao' no
// frontmatter + redeploy.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Os arquivos vivem em backend-simec/docs/lgpd/ — 2 niveis acima de
// backend-simec/services/lgpd/. Antes era 3 niveis (referenciava docs/ na
// raiz do repo), mas o build context do Railway eh backend-simec/, entao
// os arquivos da raiz nao entram na imagem.
const DOCS_DIR = path.resolve(__dirname, '..', '..', 'docs', 'lgpd');

const ARQUIVO_POR_DOC = {
  politica_privacidade: 'POLITICA_DE_PRIVACIDADE.md',
  termos_uso:           'TERMOS_DE_USO.md',
};

function parseFrontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const meta = {};
  for (const line of match[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: match[2] };
}

const cache = new Map();

function carregarDocumento(documento) {
  if (cache.has(documento)) return cache.get(documento);

  const arquivo = ARQUIVO_POR_DOC[documento];
  if (!arquivo) throw new Error(`documento_legal_invalido: ${documento}`);

  const caminho = path.join(DOCS_DIR, arquivo);
  const raw = fs.readFileSync(caminho, 'utf-8');
  const { meta, body } = parseFrontmatter(raw);

  if (!meta.versao) {
    throw new Error(`documento ${documento} sem 'versao' no frontmatter`);
  }

  const doc = {
    documento,
    versao: meta.versao,
    vigenteDesde: meta.vigenteDesde || null,
    conteudoMarkdown: body.trim(),
  };
  cache.set(documento, doc);
  return doc;
}

export function listarDocumentosVigentes() {
  return Object.keys(ARQUIVO_POR_DOC).map((doc) => carregarDocumento(doc));
}

export function obterDocumentoVigente(documento) {
  return carregarDocumento(documento);
}

// Util para invalidar cache em hot-reload (testes/dev). Em prod o servidor
// reinicia a cada deploy, entao nao precisa.
export function _limparCacheParaTestes() {
  cache.clear();
}
