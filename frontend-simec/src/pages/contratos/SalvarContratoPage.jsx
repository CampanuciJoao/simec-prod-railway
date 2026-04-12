import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import ContratoForm from '../../components/contratos/ContratoForm';
import {
  getContratoById,
  addContrato,
  updateContrato,
  getEquipamentos,
  getUnidades,
} from '../../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faArrowLeft,
  faFileContract,
} from '@fortawesome/free-solid-svg-icons';

import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageState from '../../components/ui/PageState';

function SalvarContratoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const isEditing = Boolean(id);

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

      setTodosEquipamentos(Array.isArray(equipamentosData) ? equipamentosData : []);
      setUnidadesDisponiveis(Array.isArray(unidadesData) ? unidadesData : []);

      if (isEditing) {
        const contratoData = await getContratoById(id);
        setInitialData(contratoData || null);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao carregar dados necessários para o formulário.'
      );
      addToast('Falha ao carregar dados.', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, isEditing, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (formData) => {
    try {
      if (isEditing) {
        await updateContrato(id, formData);
        addToast('Contrato atualizado com sucesso!', 'success');
      } else {
        await addContrato(formData);
        addToast('Contrato adicionado com sucesso!', 'success');
      }

      navigate('/contratos');
    } catch (err) {
      throw err;
    }
  };

  if (loading) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title={isEditing ? 'Editar Contrato' : 'Novo Contrato'}
          subtitle="Cadastre e atualize contratos de manutenção"
          icon={faFileContract}
        />
        <PageState loading />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title={isEditing ? 'Editar Contrato' : 'Novo Contrato'}
          subtitle="Cadastre e atualize contratos de manutenção"
          icon={faFileContract}
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/cadastros')}
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                Voltar ao menu de cadastros
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/contratos')}
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                Voltar para contratos
              </button>
            </div>
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
          title="Editar Contrato"
          subtitle="Cadastre e atualize contratos de manutenção"
          icon={faFileContract}
        />
        <PageState isEmpty emptyMessage="Contrato não encontrado." />
      </PageLayout>
    );
  }

  return (
    <PageLayout background="slate" padded fullHeight>
      <PageHeader
        title={
          isEditing
            ? `Editar Contrato (${initialData?.numeroContrato || ''})`
            : 'Novo Contrato'
        }
        subtitle="Cadastre e atualize contratos de manutenção"
        icon={faFileContract}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/cadastros')}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Voltar ao menu de cadastros
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/contratos')}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Voltar para contratos
            </button>
          </div>
        }
      />

      <ContratoForm
        onSubmit={handleSave}
        initialData={initialData}
        isEditing={isEditing}
        todosEquipamentos={todosEquipamentos}
        unidadesDisponiveis={unidadesDisponiveis}
        onCancel={() => navigate('/contratos')}
      />
    </PageLayout>
  );
}

export default SalvarContratoPage;