export { AgendamentoSchema } from './schema.js';
export { extrairCamposComIA } from './iaExtractor.js';
export { extrairCamposHeuristico } from './heuristicaExtractor.js';
export {
  normalizarTipoManutencao,
  normalizarHora,
  normalizarData,
  normalizarObjetoIA,
  mesclarPreferindoIAComFallback,
} from './normalizers.js';