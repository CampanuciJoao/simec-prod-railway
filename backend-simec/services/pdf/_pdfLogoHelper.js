// Resolve recursos visuais para PDFs gerados pelo SIMEC.
//
//   resolverLogoSimec() — sempre retorna o logo SIMEC (plataforma).
//                          Usado no header de todos os PDFs.
//   prepararTenantInfo(tenantId) — retorna {nome, contatoNome,
//                          contatoEmail, contatoTelefone, logoBuffer}
//                          do tenant para o bloco "Dados da Empresa"
//                          do cliente abaixo do header. Inspirado no
//                          padrão IBM Maximo: header carrega o vendor
//                          (SIMEC) e o cliente fica em seção dedicada.

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

export async function prepararTenantInfo(tenantId) {
  if (!tenantId) return null;
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        nome: true,
        contatoNome: true,
        contatoEmail: true,
        contatoTelefone: true,
        kind: true,
      },
    });

    // Tenant System (plano de controle) não tem identidade própria a
    // exibir em PDFs — esses documentos sempre representam um cliente.
    // Em impersonação, req.tenantContext já aponta pro tenant alvo,
    // então este caminho só rolaria se algum PDF for gerado fora de
    // contexto de cliente — caso em que omitir o bloco é o certo.
    if (!tenant || tenant.kind === 'SYSTEM') return null;

    const logoTenant = await obterLogoBuffer(tenantId);

    return {
      nome: tenant.nome,
      contatoNome: tenant.contatoNome,
      contatoEmail: tenant.contatoEmail,
      contatoTelefone: tenant.contatoTelefone,
      logoBuffer: logoTenant?.buffer || null,
    };
  } catch (err) {
    console.warn(`[PDF_TENANT_INFO] Falha ao preparar info do tenant ${tenantId}: ${err.message}`);
    return null;
  }
}

// Desenha o bloco "Dados da Empresa" do cliente abaixo do header.
// Layout: [logo 36px] [nome em bold] · [contato] · [telefone]
// Discreto: ocupa ~36px de altura, uma linha de texto.
// Se tenantInfo for null, é no-op (PDF segue como se não houvesse).
export function drawTenantInfoBlock(doc, tenantInfo, opts = {}) {
  if (!tenantInfo) return;

  const { x = 50, width = doc.page.width - 100 } = opts;
  const y = doc.y;
  const blockHeight = 38;

  // Caixa sutil
  doc.save();
  doc.roundedRect(x, y, width, blockHeight, 4)
    .lineWidth(0.5)
    .strokeColor('#cbd5e1')
    .fillColor('#f8fafc')
    .fillAndStroke();
  doc.restore();

  const padding = 6;
  let cursorX = x + padding;

  // Logo do cliente (se houver)
  if (tenantInfo.logoBuffer) {
    try {
      doc.image(tenantInfo.logoBuffer, cursorX, y + padding, { fit: [26, 26] });
      cursorX += 30;
    } catch (err) {
      console.warn('[PDF_TENANT_BLOCK] Falha ao renderizar logo:', err.message);
    }
  }

  // Nome em destaque
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a');
  const nomeY = y + padding + 1;
  doc.text(tenantInfo.nome || '', cursorX, nomeY, {
    width: width - (cursorX - x) - padding,
    lineBreak: false,
    ellipsis: true,
  });

  // Linha de contatos abaixo do nome
  const detalhes = [
    tenantInfo.contatoNome ? `Contato: ${tenantInfo.contatoNome}` : null,
    tenantInfo.contatoEmail,
    tenantInfo.contatoTelefone,
  ].filter(Boolean);

  if (detalhes.length > 0) {
    doc.font('Helvetica').fontSize(8).fillColor('#475569');
    doc.text(detalhes.join(' · '), cursorX, nomeY + 13, {
      width: width - (cursorX - x) - padding,
      lineBreak: false,
      ellipsis: true,
    });
  }

  // Avança o cursor pra baixo do bloco para que o conteúdo seguinte
  // não sobreponha.
  doc.y = y + blockHeight + 10;
}
