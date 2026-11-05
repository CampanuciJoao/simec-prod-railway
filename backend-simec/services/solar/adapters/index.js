// Registry de adapters por provider. Cada adapter implementa a interface:
//
//   {
//     id: string                    // nome do provider ("foxess", "growatt", "sungrow")
//     label: string                 // nome humano ("FoxESS", "Growatt", "Sungrow")
//     credentialFields: Array<{     // definicao do form de credencial na UI
//       name: string                // chave no objeto credential
//       label: string               // texto do campo
//       type: "password" | "text" | "select"
//       required: boolean
//       help?: string
//       options?: Array<{value, label}>  // para type=select
//     }>
//     defaultApiBase: string
//     apiBaseOptions?: Array<{value, label}>  // dropdown regional (ex: FoxESS tem US/EU/Global)
//
//     validarCredencial(credential, apiBase): Promise<{ok, devices?, erro?}>
//       Testa a credencial batendo numa rota leve da API do fabricante.
//       Retorna devices encontrados pra o admin confirmar que a key pertence
//       a conta correta.
//
//     fetchSnapshot(inverter): Promise<SnapshotResult>
//       Entrada: SolarInverter (com credential descriptografada pelo poller)
//       Saida: {
//         soc, batChargePower, batDischargePower, feedinPower,
//         gridConsumptionPower, epsPower, runningState, currentFault,
//         ambientTempC, inverterTempC, powerKw, generationKwhDay,
//         generationKwhMonth, generationKwhTotal, detalhes: [{...}]
//       }
//       Null em campos que o fabricante/modelo nao reporta.
//
//     fetchFalhas?(inverter): Promise<Array<FalhaNormalizada>>  (opcional)
//       Lista falhas ativas reportadas pela API do fabricante. Usada
//       pelo cron solar-falhas (10min). Shape:
//         {
//           codigoExterno: string,      // chave de dedupe (ex Sungrow fault_code)
//           codigoTipo?: string,        // Fault type (ex "60005")
//           nome: string,               // "Grid Overvoltage"
//           descricao?: string,         // detalhes legiveis
//           nivel: 1|2|3|4,             // 1 fault | 2 alarm | 3 warn | 4 suggestion
//           codigoReason?: string,      // codigo real do equipamento
//           reportadaEm: Date,
//           rawPayload?: object
//         }
//       Adapter que nao suporta: retorna [] (poller trata como "sem falhas
//       novas"). NAO sinaliza erro — apenas ausencia.
//   }
//
// Pra adicionar um novo fabricante no futuro: criar arquivo <nome>Adapter.js
// que exporta esse shape, e registrar aqui em ADAPTERS.

import * as foxessAdapter from './foxessAdapter.js';
import * as growattAdapter from './growattAdapter.js';
import * as sungrowAdapter from './sungrowAdapter.js';

const ADAPTERS = {
  foxess: foxessAdapter,
  growatt: growattAdapter,
  sungrow: sungrowAdapter,
};

export function getAdapter(provider) {
  const adapter = ADAPTERS[provider];
  if (!adapter) {
    throw new Error(`Provider desconhecido: ${provider}. Disponiveis: ${Object.keys(ADAPTERS).join(', ')}`);
  }
  return adapter;
}

export function listAdapters() {
  return Object.values(ADAPTERS).map((a) => ({
    id: a.id,
    label: a.label,
    credentialFields: a.credentialFields,
    defaultApiBase: a.defaultApiBase,
    apiBaseOptions: a.apiBaseOptions || null,
  }));
}
