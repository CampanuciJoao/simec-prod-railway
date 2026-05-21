// Resolve recursos visuais para PDFs gerados pelo SIMEC.
//
//   resolverLogoSimec()  — sempre retorna o logo SIMEC (plataforma).
//   prepararEntidadeInfo({ unidadeId, tenantId }) — retorna info da
//          entidade exibida no bloco "Dados da Empresa":
//            - Se unidadeId: usa dados da Unidade (CNPJ, endereço,
//              cidade/UF) + logo do tenant da unidade.
//            - Se só tenantId: fallback para Tenant.nome + contatos.
//            - Tenant System: null (sem identidade exibível).
//   drawEntidadeInfoBlock(doc, info, opts) — desenha caixa com logo
//          do cliente + linhas de informação. Padrão IBM Maximo:
//          identidade fiscal real do site, não da conta SaaS.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../prismaService.js';
import { obterLogoBuffer } from '../uploads/tenantLogoService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_SIMEC_PATH = path.resolve(__dirname, '../../assets/logo-simec.png');

export function resolverLogoSimec() {
  if (fs.existsSync(LOGO_SIMEC_PATH)) return LOGO_SIMEC_PATH;
  return null;
}

function formatarCnpj(cnpj) {
  if (!cnpj) return null;
  const d = String(cnpj).replace(/\D/g, '');
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function formatarCep(cep) {
  if (!cep) return null;
  const d = String(cep).replace(/\D/g, '');
  if (d.length !== 8) return cep;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function montarEnderecoCompleto(u) {
  const linha1 = [u.logradouro, u.numero, u.complemento].filter(Boolean).join(', ');
  const linha2 = [
    u.bairro,
    [u.cidade, u.estado].filter(Boolean).join('/'),
    formatarCep(u.cep),
  ].filter(Boolean).join(' · ');
  return { linha1, linha2 };
}

export async function prepararEntidadeInfo({ unidadeId, tenantId } = {}) {
  try {
    // Caminho preferencial: dados da Unidade. Tem CNPJ, endereço fiscal
    // completo, contatos por filial — o que importa em documento formal.
    if (unidadeId) {
      const unidade = await prisma.unidade.findUnique({
        where: { id: unidadeId },
        include: {
          tenant: {
            select: {
              nome: true,
              kind: true,
              contatoNome: true,
              contatoEmail: true,
              contatoTelefone: true,
            },
          },
        },
      });

      if (unidade && unidade.tenant?.kind !== 'SYSTEM') {
        const endereco = montarEnderecoCompleto(unidade);
        const logoTenant = await obterLogoBuffer(unidade.tenantId);
        return {
          nomePrincipal: unidade.nomeFantasia || unidade.nomeSistema,
          nomeAlternativo: unidade.nomeFantasia ? unidade.nomeSistema : null,
          cnpj: formatarCnpj(unidade.cnpj),
          enderecoLinha1: endereco.linha1 || null,
          enderecoLinha2: endereco.linha2 || null,
          contatoNome: unidade.tenant.contatoNome,
          contatoEmail: unidade.tenant.contatoEmail,
          contatoTelefone: unidade.tenant.contatoTelefone,
          logoBuffer: logoTenant?.buffer || null,
        };
      }
    }

    // Fallback: sem unidadeId, ou unidade não encontrada — usa Tenant.
    if (tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          nome: true,
          kind: true,
          contatoNome: true,
          contatoEmail: true,
          contatoTelefone: true,
        },
      });
      if (!tenant || tenant.kind === 'SYSTEM') return null;
      const logoTenant = await obterLogoBuffer(tenantId);
      return {
        nomePrincipal: tenant.nome,
        nomeAlternativo: null,
        cnpj: null,
        enderecoLinha1: null,
        enderecoLinha2: null,
        contatoNome: tenant.contatoNome,
        contatoEmail: tenant.contatoEmail,
        contatoTelefone: tenant.contatoTelefone,
        logoBuffer: logoTenant?.buffer || null,
      };
    }

    return null;
  } catch (err) {
    console.warn(`[PDF_ENTIDADE] Falha ao preparar info: ${err.message}`);
    return null;
  }
}

// Desenha o bloco "Dados da Empresa" do cliente abaixo do header.
// Layout (até 3 linhas de texto + logo à esquerda):
//   Linha 1: Nome Principal (bold)
//   Linha 2: CNPJ · Endereço, número
//   Linha 3: Bairro · Cidade/UF · CEP · Contato/email/telefone
//
// Cada linha sem conteúdo é omitida e o bloco se encolhe.
export function drawEntidadeInfoBlock(doc, info, opts = {}) {
  if (!info) return;

  const { x = 50, width = doc.page.width - 100 } = opts;
  const y = doc.y;

  const linhas = [];

  // Linha 1: nome principal (sempre)
  linhas.push({ tipo: 'titulo', texto: info.nomePrincipal });

  // Linha 2: CNPJ + endereço linha 1
  const linha2Items = [
    info.cnpj ? `CNPJ ${info.cnpj}` : null,
    info.enderecoLinha1,
  ].filter(Boolean);
  if (linha2Items.length) {
    linhas.push({ tipo: 'detalhe', texto: linha2Items.join(' · ') });
  }

  // Linha 3: cidade/UF/CEP + contatos
  const linha3Items = [
    info.enderecoLinha2,
    info.contatoNome ? `Contato: ${info.contatoNome}` : null,
    info.contatoEmail,
    info.contatoTelefone,
  ].filter(Boolean);
  if (linha3Items.length) {
    linhas.push({ tipo: 'detalhe', texto: linha3Items.join(' · ') });
  }

  const padding = 8;
  const alturaTitulo = 14;
  const alturaDetalhe = 11;
  const alturaContent = linhas.reduce(
    (acc, l) => acc + (l.tipo === 'titulo' ? alturaTitulo : alturaDetalhe),
    0
  );
  const blockHeight = alturaContent + padding * 2;
  const logoSize = Math.min(36, blockHeight - padding * 2);

  // Caixa sutil
  doc.save();
  doc.roundedRect(x, y, width, blockHeight, 4)
    .lineWidth(0.5)
    .strokeColor('#cbd5e1')
    .fillColor('#f8fafc')
    .fillAndStroke();
  doc.restore();

  let cursorX = x + padding;

  // Logo do cliente à esquerda
  if (info.logoBuffer) {
    try {
      const logoY = y + (blockHeight - logoSize) / 2;
      doc.image(info.logoBuffer, cursorX, logoY, { fit: [logoSize, logoSize] });
      cursorX += logoSize + padding;
    } catch (err) {
      console.warn('[PDF_ENTIDADE_BLOCK] Falha ao renderizar logo:', err.message);
    }
  }

  // Texto à direita do logo
  const textoWidth = width - (cursorX - x) - padding;
  let textoY = y + padding;

  for (const linha of linhas) {
    if (linha.tipo === 'titulo') {
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#0f172a');
      doc.text(linha.texto, cursorX, textoY, {
        width: textoWidth,
        lineBreak: false,
        ellipsis: true,
      });
      textoY += alturaTitulo;
    } else {
      doc.font('Helvetica').fontSize(8).fillColor('#475569');
      doc.text(linha.texto, cursorX, textoY, {
        width: textoWidth,
        lineBreak: false,
        ellipsis: true,
      });
      textoY += alturaDetalhe;
    }
  }

  doc.y = y + blockHeight + 10;
}

// Aliases mantidos para retrocompatibilidade durante a transição.
// Código novo deve usar prepararEntidadeInfo + drawEntidadeInfoBlock.
export const prepararTenantInfo = async (tenantId) =>
  prepararEntidadeInfo({ tenantId });
export const drawTenantInfoBlock = drawEntidadeInfoBlock;
