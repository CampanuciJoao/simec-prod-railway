import React from 'react';
import PropTypes from 'prop-types';

import {
  Checkbox,
  DateInput,
  FormActions,
  Input,
  PageSection,
  ResponsiveGrid,
  Select,
} from '@/components/ui';

import { useEquipamentoForm } from '@/hooks/equipamentos/useEquipamentoForm';

const TIPOS = [
  'Arco Cirúrgico',
  'Tomografia Computadorizada',
  'Ressonância Magnética',
  'Ultrassom',
  'Raio-X',
];

function EquipamentoForm({
  onSubmit,
  onCancel,
  initialData,
  isEditing,
}) {
  const {
    formData,
    unidades,
    loadingUnidades,
    submitting,
    error,
    semPatrimonio,
    setSubmitting,
    setError,
    handleChange,
    toggleSemPatrimonio,
    validate,
  } = useEquipamentoForm({ initialData, isEditing });

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(formData);
    } catch {
      setError('Erro ao salvar equipamento.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div
          className="rounded-2xl border px-4 py-3 text-sm"
          style={{
            borderColor: 'var(--color-danger-soft)',
            backgroundColor: 'var(--color-danger-soft)',
            color: 'var(--color-danger)',
          }}
        >
          {error}
        </div>
      ) : null}

      <PageSection
        title="Informações gerais"
        description="Preencha os dados principais do equipamento."
      >
        <div className="space-y-5">
          <ResponsiveGrid preset="form">
            <Input
              label="Tag"
              value={formData.tag}
              onChange={(e) => handleChange('tag', e.target.value)}
              placeholder="Ex: RX-1024"
              required
            />

            <Input
              label="Modelo"
              value={formData.modelo}
              onChange={(e) => handleChange('modelo', e.target.value)}
              placeholder="Ex: Aquilion CT"
              required
            />

            <Select
              label="Tipo"
              value={formData.tipo}
              onChange={(e) => handleChange('tipo', e.target.value)}
              options={TIPOS.map((tipo) => ({
                value: tipo,
                label: tipo,
              }))}
              placeholder="Selecione o tipo"
              required
            />

            <Select
              label="Unidade"
              value={formData.unidadeId}
              onChange={(e) => handleChange('unidadeId', e.target.value)}
              options={unidades.map((unidade) => ({
                value: unidade.id,
                label: unidade.nomeSistema,
              }))}
              placeholder={loadingUnidades ? 'Carregando unidades...' : 'Selecione a unidade'}
              disabled={loadingUnidades}
              required
            />

            <DateInput
              label="Data de instalação"
              value={formData.dataInstalacao}
              onChange={(e) => handleChange('dataInstalacao', e.target.value)}
            />

            <Input
              label="Fabricante"
              value={formData.fabricante}
              onChange={(e) => handleChange('fabricante', e.target.value)}
              placeholder="Ex: Siemens"
            />

            <Input
              label="Ano de fabricação"
              value={formData.anoFabricacao}
              onChange={(e) => handleChange('anoFabricacao', e.target.value)}
              placeholder="Ex: 2021"
            />

            <Input
              label="Número de patrimônio"
              value={formData.numeroPatrimonio}
              disabled={semPatrimonio}
              onChange={(e) => handleChange('numeroPatrimonio', e.target.value)}
              placeholder={semPatrimonio ? 'Patrimônio desabilitado' : 'Informe o patrimônio'}
              hint={semPatrimonio ? 'Marcado como sem patrimônio.' : undefined}
            />
          </ResponsiveGrid>

          <Checkbox
            label="Sem patrimônio"
            description="Marque esta opção quando o equipamento não possuir número patrimonial."
            checked={semPatrimonio}
            onChange={(e) => toggleSemPatrimonio(e.target.checked)}
          />
        </div>
      </PageSection>

      <FormActions
        loading={submitting}
        onCancel={onCancel}
        submitLabel={
          isEditing ? 'Salvar alterações' : 'Cadastrar equipamento'
        }
      />
    </form>
  );
}

EquipamentoForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
  initialData: PropTypes.object,
  isEditing: PropTypes.bool,
};

export default EquipamentoForm;