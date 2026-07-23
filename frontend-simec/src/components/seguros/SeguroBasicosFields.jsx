import React from 'react';
import PropTypes from 'prop-types';

import { TIPO_SEGURO_OPTIONS } from '@/utils/seguros';
import {
  CurrencyInput,
  DateInput,
  FormSection,
  Input,
  ResponsiveGrid,
  Select,
} from '@/components/ui';
import { equipamentoLabel, equipamentoSortKey } from '@/utils/equipamentos/equipamentoLabel';

import FieldExtraido from './FieldExtraido';

const OPCOES_STATUS = [
  { value: 'Ativo', label: 'Ativo' },
  { value: 'Expirado', label: 'Expirado' },
  { value: 'Cancelado', label: 'Cancelado' },
];

function SeguroBasicosFields({
  formData,
  onChange,
  camposExtraidos,
  unidadesDisponiveis,
  equipamentosFiltrados,
}) {
  const isAuto = formData.tipoSeguro === 'AUTO';

  // Placa e' sempre em maiusculas. Normaliza no onChange pra evitar 'abc-1234'.
  const handlePlacaChange = (e) => {
    const upper = String(e.target.value || '').toUpperCase();
    onChange({ target: { name: e.target.name, value: upper } });
  };

  return (
    <>
      <FormSection
        title="Informações da apólice"
        description="Identificação, vigência e seguradora."
      >
        <ResponsiveGrid preset="form">
          <FieldExtraido extraido={camposExtraidos.has('tipoSeguro')}>
            <Select
              label="Tipo de seguro"
              name="tipoSeguro"
              value={formData.tipoSeguro || ''}
              onChange={onChange}
              options={TIPO_SEGURO_OPTIONS}
              placeholder="Selecione o tipo"
            />
          </FieldExtraido>

          <FieldExtraido extraido={camposExtraidos.has('apoliceNumero')}>
            <Input
              label="Número da apólice"
              name="apoliceNumero"
              value={formData.apoliceNumero || ''}
              onChange={onChange}
              placeholder="Ex.: APL-2024-001"
              required
            />
          </FieldExtraido>

          <FieldExtraido extraido={camposExtraidos.has('seguradora')}>
            <Input
              label="Seguradora"
              name="seguradora"
              value={formData.seguradora || ''}
              onChange={onChange}
              placeholder="Ex.: Porto Seguro"
              required
            />
          </FieldExtraido>

          <FieldExtraido extraido={camposExtraidos.has('premioTotal')}>
            <CurrencyInput
              label="Prêmio total (R$)"
              name="premioTotal"
              value={formData.premioTotal}
              onChange={onChange}
              placeholder="R$ 0,00"
            />
          </FieldExtraido>

          <FieldExtraido extraido={camposExtraidos.has('dataInicio')}>
            <DateInput
              label="Início da vigência"
              name="dataInicio"
              value={formData.dataInicio || ''}
              onChange={onChange}
              required
            />
          </FieldExtraido>

          <FieldExtraido extraido={camposExtraidos.has('dataFim')}>
            <DateInput
              label="Fim da vigência"
              name="dataFim"
              value={formData.dataFim || ''}
              onChange={onChange}
              min={formData.dataInicio || undefined}
              hint="Não pode ser anterior ao início."
              required
            />
          </FieldExtraido>

          <Select
            label="Status"
            name="status"
            value={formData.status || 'Ativo'}
            onChange={onChange}
            options={OPCOES_STATUS}
          />
        </ResponsiveGrid>
      </FormSection>

      <FormSection
        title="Vínculo"
        description={
          isAuto
            ? 'Unidade responsável e dados do veículo coberto por esta apólice.'
            : 'Unidade e equipamento cobertos por esta apólice.'
        }
      >
        <ResponsiveGrid preset="form">
          <FieldExtraido extraido={camposExtraidos.has('unidadeId')}>
            <Select
              label="Unidade"
              name="unidadeId"
              value={formData.unidadeId || ''}
              onChange={onChange}
              options={unidadesDisponiveis.map((u) => ({
                value: u.id,
                label: u.nomeSistema,
              }))}
              placeholder="Selecione a unidade"
            />
          </FieldExtraido>

          {/* Seguro AUTO: placa + modelo do veículo. Equipamento nao se
              aplica nesse caso — escondido. Backend faz upsert de veiculo
              por (tenantId, placa). */}
          {isAuto ? (
            <>
              <FieldExtraido extraido={camposExtraidos.has('veiculoPlaca')}>
                <Input
                  label="Placa do veículo"
                  name="veiculoPlaca"
                  value={formData.veiculoPlaca || ''}
                  onChange={handlePlacaChange}
                  placeholder="Ex.: ABC-1234"
                  maxLength={10}
                  required
                />
              </FieldExtraido>
              <FieldExtraido extraido={camposExtraidos.has('veiculoModelo')}>
                <Input
                  label="Modelo do veículo"
                  name="veiculoModelo"
                  value={formData.veiculoModelo || ''}
                  onChange={onChange}
                  placeholder="Ex.: Fiat Strada 1.4"
                  required
                />
              </FieldExtraido>
            </>
          ) : (
            <FieldExtraido extraido={camposExtraidos.has('equipamentoId')}>
              <Select
                label="Equipamento"
                name="equipamentoId"
                value={formData.equipamentoId || ''}
                onChange={onChange}
                options={[...equipamentosFiltrados]
                  .sort((a, b) => equipamentoSortKey(a).localeCompare(equipamentoSortKey(b), 'pt-BR'))
                  .map((eq) => ({ value: eq.id, label: equipamentoLabel(eq) }))}
                placeholder={
                  !formData.unidadeId
                    ? 'Selecione a unidade primeiro'
                    : 'Selecione o equipamento (opcional)'
                }
                disabled={!formData.unidadeId}
              />
            </FieldExtraido>
          )}
        </ResponsiveGrid>
      </FormSection>
    </>
  );
}

SeguroBasicosFields.propTypes = {
  formData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  camposExtraidos: PropTypes.instanceOf(Set).isRequired,
  unidadesDisponiveis: PropTypes.array.isRequired,
  equipamentosFiltrados: PropTypes.array.isRequired,
};

export default SeguroBasicosFields;
