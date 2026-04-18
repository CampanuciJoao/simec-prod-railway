import React from 'react';

import {
  Button,
  Input,
  PageSection,
  ResponsiveGrid,
} from '@/components/ui';

import { useSeguroForm } from '@/hooks/seguros/useSeguroForm';

function SeguroForm({
  onSubmit,
  initialData,
  isEditing,
  equipamentosDisponiveis,
  onCancel,
}) {
  const {
    formData,
    handleChange,
    coberturaFields,
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
    } catch {
      setError('Erro ao salvar seguro');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <PageSection title="Informações">
        <ResponsiveGrid cols={{ base: 1, md: 2 }}>
          <Input
            label="Número da apólice"
            name="apoliceNumero"
            value={formData.apoliceNumero || ''}
            onChange={handleChange}
          />

          <Input
            label="Seguradora"
            name="seguradora"
            value={formData.seguradora || ''}
            onChange={handleChange}
          />
        </ResponsiveGrid>
      </PageSection>

      <PageSection title="Coberturas">
        <ResponsiveGrid cols={{ base: 1, md: 2, xl: 3 }}>
          {coberturaFields.map((field) => (
            <Input
              key={field}
              label={field}
              name={field}
              value={formData[field] || 0}
              onChange={handleChange}
            />
          ))}
        </ResponsiveGrid>
      </PageSection>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
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
