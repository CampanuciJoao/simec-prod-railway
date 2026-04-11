import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSpinner, faWrench } from '@fortawesome/free-solid-svg-icons';

import { useToast } from '../../contexts/ToastContext';
import ManutencaoForm from '../../components/manutencoes/ManutencaoForm';
import {
  getManutencaoById,
  addManutencao,
  updateManutencao,
  getEquipamentos,
  getUnidades,
} from '../../services/api';

import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import PageLayout from '../../components/ui/PageLayout';
import PageSection from '../../components/ui/PageSection';
import PageState from '../../components/ui/PageState';

function SalvarManutencaoPage() {
  const { manutencaoId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const isEditing = !!manutencaoId;

  const [initialData, setInitialData] = useState(null);
  const [todosEquipamentos, setTodosEquipamentos] = useState([]);
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [equipamentosData, unidadesData] = await Promise.all([
        getEquipamentos(),
        getUnidades(),
      ]);

      setTodosEquipamentos(equipamentosData || []);
      setUnidadesDisponiveis(unidadesData || []);

      if (isEditing) {
        const manutencaoData = await getManutencaoById(manutencaoId);
        setInitialData(manutencaoData);
      }
    } catch (err) {
      setError('Falha ao carregar dados necessários.');
      addToast(err.response?.data?.message || 'Falha ao carregar dados.', 'error');
    } finally {
      setLoading(false);
    }
  }, [manutencaoId, isEditing, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (formData) => {
    try {
      if (isEditing) {
        await updateManutencao(manutencaoId, formData);
        addToast('Manutenção atualizada com sucesso!', 'success');
      } else {
        await addManutencao(formData);
        addToast('Manutenção agendada com sucesso!', 'success');
      }

      navigate('/manutencoes', { state: { refresh: true } });
    } catch (err) {
      addToast(err.response?.data?.message || 'Erro ao salvar a manutenção.', 'error');
      throw err;
    }
  };

  if (loading) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageState loading />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title={isEditing ? 'Editar Manutenção' : 'Agendar Nova Manutenção'}
          icon={faWrench}
          actions={
            <Button variant="secondary" onClick={() => navigate('/manutencoes')}>
              <FontAwesomeIcon icon={faArrowLeft} />
              Voltar
            </Button>
          }
        />

        <PageState error={error} />
      </PageLayout>
    );
  }

  if (isEditing && !initialData) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title="Editar Manutenção"
          icon={faWrench}
          actions={
            <Button variant="secondary" onClick={() => navigate('/manutencoes')}>
              <FontAwesomeIcon icon={faArrowLeft} />
              Voltar
            </Button>
          }
        />

        <PageState
          isEmpty
          emptyMessage="Manutenção não encontrada."
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout background="slate" padded fullHeight>
      <PageHeader
        title={
          isEditing
            ? `Editar Manutenção (${initialData?.numeroOS || ''})`
            : 'Agendar Nova Manutenção'
        }
        subtitle={
          isEditing
            ? 'Atualize os dados da ordem de serviço'
            : 'Preencha os dados para criar uma nova ordem de serviço'
        }
        icon={faWrench}
        actions={
          <Button variant="secondary" onClick={() => navigate('/manutencoes')}>
            <FontAwesomeIcon icon={faArrowLeft} />
            Voltar
          </Button>
        }
      />

      <PageSection>
        <ManutencaoForm
          onSubmit={handleSave}
          initialData={initialData}
          isEditing={isEditing}
          todosEquipamentos={todosEquipamentos}
          unidadesDisponiveis={unidadesDisponiveis}
        />
      </PageSection>
    </PageLayout>
  );
}

export default SalvarManutencaoPage;