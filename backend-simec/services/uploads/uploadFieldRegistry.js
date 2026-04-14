// Ficheiro: backend-simec/services/uploads/uploadFieldRegistry.js
// Registro central dos uploads do SIMEC.

export const DEFAULT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export const DEFAULT_MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB
export const DEFAULT_MAX_FILE_COUNT = 10;

export const UPLOAD_FIELD_REGISTRY = {
  equipamentos: {
    resource: 'equipamentos',
    fieldName: 'file',
    folder: 'equipamentos',
    maxCount: DEFAULT_MAX_FILE_COUNT,
    maxFileSize: DEFAULT_MAX_FILE_SIZE,
    allowedMimeTypes: DEFAULT_ALLOWED_MIME_TYPES,
    logEntity: 'Equipamento',
    relationField: 'equipamentoId',
  },

  contratos: {
    resource: 'contratos',
    fieldName: 'file',
    folder: 'contratos',
    maxCount: DEFAULT_MAX_FILE_COUNT,
    maxFileSize: DEFAULT_MAX_FILE_SIZE,
    allowedMimeTypes: DEFAULT_ALLOWED_MIME_TYPES,
    logEntity: 'Contrato',
    relationField: 'contratoId',
  },

  seguros: {
    resource: 'seguros',
    fieldName: 'file',
    folder: 'seguros',
    maxCount: DEFAULT_MAX_FILE_COUNT,
    maxFileSize: DEFAULT_MAX_FILE_SIZE,
    allowedMimeTypes: DEFAULT_ALLOWED_MIME_TYPES,
    logEntity: 'Seguro',
    relationField: 'seguroId',
  },

  unidades: {
    resource: 'unidades',
    fieldName: 'file',
    folder: 'unidades',
    maxCount: DEFAULT_MAX_FILE_COUNT,
    maxFileSize: DEFAULT_MAX_FILE_SIZE,
    allowedMimeTypes: DEFAULT_ALLOWED_MIME_TYPES,
    logEntity: 'Unidade',
    relationField: 'unidadeId',
  },

  manutencoes: {
    resource: 'manutencoes',
    fieldName: 'file',
    folder: 'manutencoes',
    maxCount: DEFAULT_MAX_FILE_COUNT,
    maxFileSize: DEFAULT_MAX_FILE_SIZE,
    allowedMimeTypes: DEFAULT_ALLOWED_MIME_TYPES,
    logEntity: 'Manutenção',
    relationField: 'manutencaoId',
  },
};

export function getUploadResourceConfig(resource) {
  return UPLOAD_FIELD_REGISTRY[resource] || null;
}