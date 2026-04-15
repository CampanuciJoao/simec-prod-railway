import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faBuilding } from '@fortawesome/free-solid-svg-icons';

import PageLayout from '../../components/ui/layout/PageLayout';
import PageHeader from '../../components/ui/layout/PageHeader';
import PageState from '../../components/ui/feedback/PageState';
import Button from '../../components/ui/primitives/Button';
import UnidadeForm from '../../components/unidades/UnidadeForm';

import { addUnidade, getUnidadeById, updateUnidade } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

function SalvarUnidadePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { addToast } = useToast();

  const isEditing = Boolean(id);

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState('');

  const carregarUnidade = useCallback(async () => {
    if (!isEditing) return;

    setLoading(true);
    setError('');

    try {
      const data = await getUnidadeById(id);
      setInitialData(data || null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Erro ao carregar unidade.'
      );
    } finally {
      setLoading(false);
    }
  }, [id, isEditing]);

  useEffect(() => {
    carregarUnidade();
  }, [carregarUnidade]);

  const handleSubmit = async (formData) => {
    try {
      if (isEditing) {
        await updateUnidade(id, formData);
        addToast('Unidade atualizada com sucesso!', 'success');
      } else {
        await addUnidade(formData);
        addToast('Unidade cadastrada com sucesso!', 'success');
      }

      navigate('/cadastros/unidades');
    } catch (err) {
      throw err;
    }
  };

  const headerActions = (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={() => navigate('/cadastros')}
      >
        <FontAwesomeIcon icon={faArrowLeft} />
        Voltar ao menu de cadastros
      </Button>

      <Button
        type="button"
        variant="secondary"
        onClick={() => navigate('/cadastros/unidades')}
      >
        <FontAwesomeIcon icon={faArrowLeft} />
        Voltar para unidades
      </Button>
    </div>
  );

  if (loading) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title={isEditing ? 'Editar Unidade' : 'Nova Unidade'}
          subtitle="Cadastre e gerencie informações da unidade"
          icon={faBuilding}
        />
        <PageState loading />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title={isEditing ? 'Editar Unidade' : 'Nova Unidade'}
          subtitle="Cadastre e gerencie informações da unidade"
          icon={faBuilding}
          actions={headerActions}
        />
        <PageState error={error} />
      </PageLayout>
    );
  }

  return (
    <PageLayout background="slate" padded fullHeight>
      <PageHeader
        title={isEditing ? 'Editar Unidade' : 'Nova Unidade'}
        subtitle="Cadastre e gerencie informações da unidade"
        icon={faBuilding}
        actions={headerActions}
      />

      <UnidadeForm
        onSubmit={handleSubmit}
        initialData={initialData}
        isEditing={isEditing}
        onCancel={() => navigate('/cadastros/unidades')}
      />
    </PageLayout>
  );
}

export default SalvarUnidadePage;