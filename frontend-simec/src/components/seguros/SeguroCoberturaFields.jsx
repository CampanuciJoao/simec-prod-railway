import React from 'react';
import PropTypes from 'prop-types';

import { COBERTURA_FIELDS } from '@/utils/seguros';
import { CurrencyInput, FormSection, ResponsiveGrid } from '@/components/ui';

import FieldExtraido from './FieldExtraido';

function SeguroCoberturaFields({
  formData,
  onChange,
  camposExtraidos,
  coberturaFields,
}) {
  if (coberturaFields.length === 0) return null;

  return (
    <FormSection
      title="Coberturas (LMI)"
      description="Limite Máximo de Indenização por cobertura."
    >
      <ResponsiveGrid preset="form">
        {coberturaFields.map((fieldKey) => {
          const config = COBERTURA_FIELDS[fieldKey];
          if (!config) return null;

          return (
            <FieldExtraido key={fieldKey} extraido={camposExtraidos.has(fieldKey)}>
              <CurrencyInput
                label={`${config.label} (R$)`}
                name={fieldKey}
                value={formData[fieldKey]}
                onChange={onChange}
                placeholder="R$ 0,00"
              />
            </FieldExtraido>
          );
        })}
      </ResponsiveGrid>
    </FormSection>
  );
}

SeguroCoberturaFields.propTypes = {
  formData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  camposExtraidos: PropTypes.instanceOf(Set).isRequired,
  coberturaFields: PropTypes.array.isRequired,
};

export default SeguroCoberturaFields;
