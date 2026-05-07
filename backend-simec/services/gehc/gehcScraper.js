import { chromium } from 'playwright';

const GEHC_BASE = 'https://www.gehealthcare.com.br';
const GEHC_LOGIN = `${GEHC_BASE}/account`;

const SELECTORS = {
  heliumLevel:      'text=Nível de hélio',
  heliumPressure:   'text=Pressão do hélio',
  compressor:       'text=Compressor',
  coolantFlow:      'text=Fluxo e temperatura do resfriador',
  cryocooler:       'text=Eficiência do criorrefregerador',
  equipmentOnline:  'text=Equipamento on-line',
  magnetOnline:     'text=Magneto on-line',
  saudeTab:         'text=Saúde',
};

function parseFloat_(val) {
  if (!val) return null;
  const n = parseFloat(String(val).replace(',', '.').replace(/[^\d.-]/g, ''));
  return isNaN(n) ? null : n;
}

function parseStatus(val) {
  if (!val) return null;
  return String(val).trim().toUpperCase();
}

async function extrairMetrica(page, labelText) {
  try {
    const row = page.locator(`[class*="card"], [class*="row"], div`).filter({ hasText: labelText }).first();
    const text = await row.innerText({ timeout: 3000 });
    const parts = text.split('\n').map(s => s.trim()).filter(Boolean);
    return parts[parts.length - 1] ?? null;
  } catch {
    return null;
  }
}

export async function scrapeEquipamentoSaude({ gehcAssetUrl, gehcLogin, gehcPassword }) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(GEHC_LOGIN, { waitUntil: 'networkidle', timeout: 30000 });

    const loginField = page.locator('input[name="username"], input[type="email"], input[name="un"]').first();
    const passField  = page.locator('input[name="password"], input[type="password"], input[name="pw"]').first();

    await loginField.fill(gehcLogin);
    await passField.fill(gehcPassword);
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 });

    await page.goto(gehcAssetUrl, { waitUntil: 'networkidle', timeout: 20000 });

    const saudeBtn = page.locator(SELECTORS.saudeTab).first();
    await saudeBtn.click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    const [
      heliumLevelRaw,
      heliumPressureRaw,
      compressorRaw,
      coolantRaw,
      cryocoolerRaw,
    ] = await Promise.all([
      extrairMetrica(page, 'Nível de hélio'),
      extrairMetrica(page, 'Pressão do hélio'),
      extrairMetrica(page, 'Compressor'),
      extrairMetrica(page, 'Fluxo e temperatura do resfriador'),
      extrairMetrica(page, 'Eficiência do criorrefregerador'),
    ]);

    const equipmentOnline = await page.locator('text=Equipamento on-line').count() > 0;
    const magnetOnline    = await page.locator('text=Magneto on-line').count() > 0;

    // "2.3 GPM 12°C" → separa fluxo e temperatura
    let coolantFlowGpm = null;
    let coolantTempC = null;
    if (coolantRaw) {
      const gpmMatch  = coolantRaw.match(/([\d.,]+)\s*GPM/i);
      const tempMatch = coolantRaw.match(/([\d.,]+)\s*[°ºC]/i);
      if (gpmMatch)  coolantFlowGpm = parseFloat_(gpmMatch[1]);
      if (tempMatch) coolantTempC   = parseFloat_(tempMatch[1]);
    }

    return {
      heliumLevelPct:    parseFloat_(heliumLevelRaw),
      heliumPressurePsi: parseFloat_(heliumPressureRaw),
      compressorStatus:  parseStatus(compressorRaw),
      coolantFlowGpm,
      coolantTempC,
      cryocoolerStatus:  parseStatus(cryocoolerRaw),
      magnetOnline,
      equipmentOnline,
      rawJson: JSON.stringify({
        heliumLevelRaw, heliumPressureRaw, compressorRaw,
        coolantRaw, cryocoolerRaw, equipmentOnline, magnetOnline,
      }),
    };
  } finally {
    await browser.close();
  }
}
