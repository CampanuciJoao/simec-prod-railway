import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useAbrirOsCorretivaPage } from '@/hooks/osCorretiva/useAbrirOsCorretivaPage';
import AbrirOsForm from '@/components/osCorretiva/AbrirOsForm';
import { PageLayout, Button } from '@/components/ui';

function AbrirOsCorretivaPage() {
  const form = useAbrirOsCorretivaPage();

  return (
    <PageLayout padded>
      <div className="mb-6 flex items-center gap-3">
        <Link to="/manutencoes">
          <Button type="button" variant="secondary">
            <FontAwesomeIcon icon={faArrowLeft} />
            Voltar
          </Button>
        </Link>
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
