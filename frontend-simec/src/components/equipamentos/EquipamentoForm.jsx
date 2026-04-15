import React from 'react';
import PropTypes from 'prop-types';

import Input from '@/components/ui/primitives/Input';
import Select from '@/components/ui/primitives/Select';
import DateInput from '@/components/ui/primitives/DateInput';
import Button from '@/components/ui/primitives/Button';

import PageSection from '@/components/ui/layout/PageSection';
import { ResponsiveGrid, FormActions } from '@/components/ui/layout';

import { useEquipamentoForm } from '@/hooks/equipamentos/useEquipamentoForm';

const TIPOS = [
  'Arco Cirúrgico',
  'Tomografia Computadorizada',
  'Ressonância Magnética',
  'Ultrassom',
  'Raio-X',
];

export default function EquipamentoForm({
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(formData);
    } catch (err) {
      setError('Erro ao salvar equipamento.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      <PageSection title="Informações gerais">
        <ResponsiveGrid cols={2}>
          
          <Input
            label="Tag"
            value={formData.tag}
            onChange={(e) => handleChange('tag', e.target.value)}
          />

          <Input
            label="Modelo"
            value={formData.modelo}
            onChange={(e) => handleChange('modelo', e.target.value)}
          />

          <Select
            label="Tipo"
            value={formData.tipo}
            onChange={(e) => handleChange('tipo', e.target.value)}
            options={TIPOS.map((t) => ({ value: t, label: t }))}
          />

          <Select
            label="Unidade"
            value={formData.unidadeId}
            onChange={(e) => handleChange('unidadeId', e.target.value)}
            options={unidades.map((u) => ({
              value: u.id,
              label: u.nomeSistema,
            }))}
            disabled={loadingUnidades}
          />

          <DateInput
            label="Data Instalação"
            value={formData.dataInstalacao}
            onChange={(e) =>
              handleChange('dataInstalacao', e.target.value)
            }
          />

          <Input
            label="Fabricante"
            value={formData.fabricante}
            onChange={(e) =>
              handleChange('fabricante', e.target.value)
            }
          />

          <Input
            label="Ano Fabricação"
            value={formData.anoFabricacao}
            onChange={(e) =>
              handleChange('anoFabricacao', e.target.value)
            }
          />

          <Input
            label="Número Patrimônio"
            value={formData.numeroPatrimonio}
            disabled={semPatrimonio}
            onChange={(e) =>
              handleChange('numeroPatrimonio', e.target.value)
            }
          />

        </ResponsiveGrid>

        <div className="mt-4">
          <label className="text-sm">
            <input
              type="checkbox"
              checked={semPatrimonio}
              onChange={(e) =>
                toggleSemPatrimonio(e.target.checked)
              }
            />
            Sem patrimônio
          </label>
        </div>
      </PageSection>

      <FormActions
        onSubmit={handleSubmit}
        onCancel={onCancel}
        loading={submitting}
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