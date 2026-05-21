// Resolve qual logo usar no header de PDFs gerados pelo SIMEC.
//   1. Se o tenant tem logo customizado salvo (Tenant.logoPath), usa esse
//      Buffer (lido do R2 com cache).
//   2. Caso contrário, cai no logo SIMEC default que vive em /assets.
//   3. Caso o logo SIMEC tampouco exista (cenário improvável de build
//      quebrado), retorna null e o PDF é renderizado sem logo.
//
// O retorno é o que `doc.image(...)` do PDFKit aceita diretamente
// — string (path) ou Buffer.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { obterLogoBuffer } from '../uploads/tenantLogoService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_SIMEC_PATH = path.resolve(__dirname, '../../assets/logo-simec.png');

export async function resolverLogoParaPdf(tenantId) {
  if (tenantId) {
    const logoTenant = await obterLogoBuffer(tenantId);
    if (logoTenant?.buffer) return logoTenant.buffer;
  }
  if (fs.existsSync(LOGO_SIMEC_PATH)) return LOGO_SIMEC_PATH;
  return null;
}
