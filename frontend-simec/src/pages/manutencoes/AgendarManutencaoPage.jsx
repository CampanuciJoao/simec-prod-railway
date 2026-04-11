import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faWrench } from '@fortawesome/free-solid-svg-icons';

import ManutencaoForm from '../../components/manutencoes/ManutencaoForm';
import { agendarManutencao } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

import Button from '../../components/ui/Button';
import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/ui/PageSection';

function AgendarManutencaoPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleAgendar = async (formData) => {
    try {
      await agendarManutencao(formData);
      addToast('Manutenção agendada com sucesso!', 'success');

      setTimeout(() => {
        navigate('/manutencoes');
      }, 1500);
    } catch (error) {
      console.error('Falha ao agendar manutenção na página:', error);
      throw error;
    }
  };

  return (
    <PageLayout background="slate" padded fullHeight>
      <PageHeader
        title="Agendar Nova Manutenção"
        subtitle="Crie uma nova ordem de serviço para o equipamento"
        icon={faWrench}
        actions={
          <Button variant="secondary" onClick={() => navigate('/manutencoes')}>
            <FontAwesomeIcon icon={faArrowLeft} />
            Voltar
          </Button>
        }
      />

      <PageSection>
        <ManutencaoForm onSubmit={handleAgendar} isEditing={false} />
      </PageSection>
    </PageLayout>
  );
}

export default AgendarManutencaoPage;