import React from 'react';

import PageSection from '@/components/ui/layout/PageSection';
import ResponsiveGrid from '@/components/ui/layout/ResponsiveGrid';
import Input from '@/components/ui/primitives/Input';
import Select from '@/components/ui/primitives/Select';
import DateInput from '@/components/ui/primitives/DateInput';
import Button from '@/components/ui/primitives/Button';

import { useSeguroForm } from '@/hooks/seguros/useSeguroForm';

function SeguroForm({
  onSubmit,
  initialData,
  isEditing,
  equipamentosDisponiveis,
  unidadesDisponiveis,
  onCancel,
}) {
  const {
    formData,
    handleChange,
    coberturaFields,
    equipamentosFiltrados,
    isSubmitting,
    setIsSubmitting,
    error,
    setError,
    buildPayload,
  } = useSeguroForm({
    initialData,
    isEditing,
    equipamentosDisponiveis,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setIsSubmitting(true);

      const payload = buildPayload();

      await onSubmit(payload);
    } catch (err) {
      setError('Erro ao salvar seguro');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="text-red-500">{error}</div>}

      <PageSection title="Informações">
        <ResponsiveGrid cols={2}>
          <Input
            name="apoliceNumero"
            value={formData.apoliceNumero || ''}
            onChange={handleChange}
          />

          <Input
            name="seguradora"
            value={formData.seguradora || ''}
            onChange={handleChange}
          />
        </ResponsiveGrid>
      </PageSection>

      <PageSection title="Coberturas">
        <ResponsiveGrid cols={3}>
          {coberturaFields.map((field) => (
            <Input
              key={field}
              name={field}
              value={formData[field] || 0}
              onChange={handleChange}
            />
          ))}
        </ResponsiveGrid>
      </PageSection>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}

export default SeguroForm;