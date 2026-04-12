import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import SeguroForm from '../../components/seguros/SeguroForm';
import {
  getSeguroById,
  addSeguro,
  updateSeguro,
  getEquipamentos,
  getUnidades,
} from '../../services/api';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faShieldAlt,
} from '@fortawesome/free-solid-svg-icons';

import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageState from '../../components/ui/PageState';

function SalvarSeguroPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const isEditing = Boolean(id);

  const [initialData, setInitialData] = useState(null);
  const [equipamentosDisponiveis, setEquipamentosDisponiveis] = useState([]);
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

      setEquipamentosDisponiveis(equipamentosData || []);
      setUnidadesDisponiveis(unidadesData || []);

      if (isEditing) {
        const seguroData = await getSeguroById(id);
        setInitialData(seguroData || null);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Erro ao carregar dados.'
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
        await updateSeguro(id, formData);
        addToast('Seguro atualizado com sucesso!', 'success');
      } else {
        await addSeguro(formData);
        addToast('Seguro cadastrado com sucesso!', 'success');
      }

      navigate('/seguros');
    } catch (err) {
      throw err;
    }
  };

  if (loading) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title={isEditing ? 'Editar Seguro' : 'Novo Seguro'}
          icon={faShieldAlt}
        />
        <PageState loading />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title="Erro"
          icon={faShieldAlt}
          actions={
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/seguros')}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Voltar
            </button>
          }
        />
        <PageState error={error} />
      </PageLayout>
    );
  }

  return (
    <PageLayout background="slate" padded fullHeight>
      <PageHeader
        title={isEditing ? 'Editar Seguro' : 'Novo Seguro'}
        subtitle="Cadastro e gestão de apólices"
        icon={faShieldAlt}
        actions={
          <div className="flex gap-2">
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/cadastros')}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Cadastros
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => navigate('/seguros')}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Seguros
            </button>
          </div>
        }
      />

      <SeguroForm
        onSubmit={handleSave}
        initialData={initialData}
        isEditing={isEditing}
        equipamentosDisponiveis={equipamentosDisponiveis}
        unidadesDisponiveis={unidadesDisponiveis}
        onCancel={() => navigate('/seguros')}
      />
    </PageLayout>
  );
}

export default SalvarSeguroPage;