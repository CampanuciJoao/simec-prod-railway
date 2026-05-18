import React from 'react';
import { useAbrirOsCorretivaPage } from '@/hooks/osCorretiva/useAbrirOsCorretivaPage';
import AbrirOsForm from '@/components/osCorretiva/AbrirOsForm';
import { PageLayout, BackButton } from '@/components/ui';

function AbrirOsCorretivaPage() {
  const form = useAbrirOsCorretivaPage();

  return (
    <PageLayout padded>
      <div className="mb-6 flex items-center gap-3">
        <BackButton fallbackTo="/manutencoes">Voltar</BackButton>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Registrar Ocorrência
        </h1>
      </div>

      <AbrirOsForm
        form={form.form}
        submitting={form.submitting}
        fieldErrors={form.fieldErrors}
        statusOptions={form.statusOptions}
        onChange={form.handleChange}
        onSubmit={form.handleSubmit}
      />
    </PageLayout>
  );
}

export default AbrirOsCorretivaPage;
