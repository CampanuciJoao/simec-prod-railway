export const TIPO_SEGURO = {
  EQUIPAMENTO: 'EQUIPAMENTO',
  PREDIAL: 'PREDIAL',
  AUTO: 'AUTO',
  RESPONSABILIDADE_CIVIL: 'RESPONSABILIDADE_CIVIL',
  OUTRO: 'OUTRO',
};

export const TIPO_SEGURO_OPTIONS = [
  { value: TIPO_SEGURO.EQUIPAMENTO, label: 'Equipamento / Máquinas' },
  { value: TIPO_SEGURO.PREDIAL, label: 'Predial / Empresarial' },
  { value: TIPO_SEGURO.AUTO, label: 'Auto' },
  { value: TIPO_SEGURO.RESPONSABILIDADE_CIVIL, label: 'Responsabilidade Civil' },
  { value: TIPO_SEGURO.OUTRO, label: 'Outro' },
];

export const COBERTURA_FIELDS = {
  lmiColisao: {
    key: 'lmiColisao',
    label: 'Colisão',
  },
  lmiIncendio: {
    key: 'lmiIncendio',
    label: 'Incêndio / raio / explosão',
  },
  lmiDanosEletricos: {
    key: 'lmiDanosEletricos',
    label: 'Danos elétricos',
  },
  lmiRoubo: {
    key: 'lmiRoubo',
    label: 'Roubo / furto',
  },
  lmiVidros: {
    key: 'lmiVidros',
    label: 'Vidros',
  },
  lmiResponsabilidadeCivil: {
    key: 'lmiResponsabilidadeCivil',
    label: 'Responsabilidade civil',
  },
  lmiDanosMateriais: {
    key: 'lmiDanosMateriais',
    label: 'Danos materiais',
  },
  lmiDanosCorporais: {
    key: 'lmiDanosCorporais',
    label: 'Danos corporais',
  },
  lmiDanosMorais: {
    key: 'lmiDanosMorais',
    label: 'Danos morais',
  },
  lmiAPP: {
    key: 'lmiAPP',
    label: 'APP',
  },
  lmiVendaval: {
    key: 'lmiVendaval',
    label: 'Vendaval / impacto de veículos',
  },
  lmiDanosCausaExterna: {
    key: 'lmiDanosCausaExterna',
    label: 'Danos de causa externa',
  },
  lmiPerdaLucroBruto: {
    key: 'lmiPerdaLucroBruto',
    label: 'Lucros cessantes',
  },
  lmiVazamentoTanques: {
    key: 'lmiVazamentoTanques',
    label: 'Vazamento de tanques',
  },
};

export const COBERTURAS_POR_TIPO = {
  [TIPO_SEGURO.EQUIPAMENTO]: [
    'lmiDanosCausaExterna',
    'lmiIncendio',
    'lmiDanosEletricos',
    'lmiPerdaLucroBruto',
    'lmiResponsabilidadeCivil',
  ],

  [TIPO_SEGURO.PREDIAL]: [
    'lmiIncendio',
    'lmiDanosEletricos',
    'lmiVazamentoTanques',
    'lmiPerdaLucroBruto',
    'lmiVidros',
    'lmiVendaval',
    'lmiRoubo',
    'lmiResponsabilidadeCivil',
  ],

  [TIPO_SEGURO.AUTO]: [
    'lmiColisao',
    'lmiIncendio',
    'lmiRoubo',
    'lmiVidros',
    'lmiDanosMateriais',
    'lmiDanosCorporais',
    'lmiDanosMorais',
    'lmiAPP',
    'lmiResponsabilidadeCivil',
  ],

  [TIPO_SEGURO.RESPONSABILIDADE_CIVIL]: [
    'lmiResponsabilidadeCivil',
    'lmiDanosMateriais',
    'lmiDanosCorporais',
    'lmiDanosMorais',
  ],

  [TIPO_SEGURO.OUTRO]: Object.keys(COBERTURA_FIELDS),
};

export function getCoberturaFieldsByTipo(tipoSeguro) {
  return COBERTURAS_POR_TIPO[tipoSeguro] || COBERTURAS_POR_TIPO[TIPO_SEGURO.OUTRO];
}

export function getCoberturasAtivas(seguro = {}) {
  const allowedFields = getCoberturaFieldsByTipo(
    seguro.tipoSeguro || TIPO_SEGURO.OUTRO
  );

  return allowedFields
    .map((fieldKey) => {
      const config = COBERTURA_FIELDS[fieldKey];
      const value = Number(seguro?.[fieldKey] || 0);

      return {
        key: fieldKey,
        label: config.label,
        value,
      };
    })
    .filter((item) => item.value > 0);
}

export function sanitizeCoberturasByTipo(payload = {}) {
  const tipoSeguro = payload.tipoSeguro || TIPO_SEGURO.OUTRO;
  const allowedFields = new Set(getCoberturaFieldsByTipo(tipoSeguro));

  const next = { ...payload };

  Object.keys(COBERTURA_FIELDS).forEach((fieldKey) => {
    next[fieldKey] = allowedFields.has(fieldKey)
      ? Number(next[fieldKey] || 0)
      : 0;
  });

  return next;
}
