import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faMicrochip } from '@fortawesome/free-solid-svg-icons';

import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageState from '../../components/ui/PageState';
import EquipamentoForm from '../../components/equipamentos/EquipamentoForm';

import { addEquipamento, getEquipamentoById, updateEquipamento } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

function SalvarEquipamentoPage() {
  const navigate = useNavigate();
  const { equipamentoId } = useParams();
  const { addToast } = useToast();

  const isEditing = Boolean(equipamentoId);

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState('');

  const carregarEquipamento = useCallback(async () => {
    if (!isEditing) return;

    setLoading(true);
    setError('');

    try {
      const data = await getEquipamentoById(equipamentoId);
      setInitialData(data || null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Erro ao carregar equipamento.'
      );
    } finally {
      setLoading(false);
    }
  }, [equipamentoId, isEditing]);

  useEffect(() => {
    carregarEquipamento();
  }, [carregarEquipamento]);

  const handleSubmit = async (formData) => {
    try {
      if (isEditing) {
        await updateEquipamento(equipamentoId, formData);
        addToast('Equipamento atualizado com sucesso!', 'success');
      } else {
        await addEquipamento(formData);
        addToast('Equipamento cadastrado com sucesso!', 'success');
      }

      navigate('/equipamentos');
    } catch (err) {
      throw err;
    }
  };

  if (loading) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title={isEditing ? 'Editar Equipamento' : 'Novo Equipamento'}
          subtitle="Cadastre e atualize informações do ativo"
          icon={faMicrochip}
        />
        <PageState loading />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title={isEditing ? 'Editar Equipamento' : 'Novo Equipamento'}
          subtitle="Cadastre e atualize informações do ativo"
          icon={faMicrochip}
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
                onClick={() => navigate('/equipamentos')}
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                Voltar para equipamentos
              </button>
            </div>
          }
        />
        <PageState error={error} />
      </PageLayout>
    );
  }

  return (
    <PageLayout background="slate" padded fullHeight>
      <PageHeader
        title={isEditing ? 'Editar Equipamento' : 'Novo Equipamento'}
        subtitle="Cadastre e atualize informações do ativo"
        icon={faMicrochip}
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
              onClick={() => navigate('/equipamentos')}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Voltar para equipamentos
            </button>
          </div>
        }
      />

      <EquipamentoForm
        onSubmit={handleSubmit}
        onCancel={() => navigate('/equipamentos')}
        initialData={initialData}
        isEditing={isEditing}
      />
    </PageLayout>
  );
}

export default SalvarEquipamentoPage;