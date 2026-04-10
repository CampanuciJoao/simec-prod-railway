import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  faInfoCircle,
  faHdd,
  faPaperclip,
  faHistory,
} from '@fortawesome/free-solid-svg-icons';
import { useEquipamentoDetalhes } from './useEquipamentoDetalhes';

export function useDetalhesEquipamentoPage() {
  const { equipamentoId } = useParams();
  const [abaAtiva, setAbaAtiva] = useState('detalhes');

  const {
    equipamento,
    loading,
    error,
    refetch: refetchEquipamento,
  } = useEquipamentoDetalhes(equipamentoId);

  const abas = useMemo(() => ([
    { id: 'detalhes', label: 'Cadastro', icon: faInfoCircle },
    { id: 'acessorios', label: 'Acessórios', icon: faHdd },
    { id: 'anexos', label: 'Anexos', icon: faPaperclip },
    { id: 'historico', label: 'Histórico', icon: faHistory },
  ]), []);

  return {
    equipamentoId,
    equipamento,
    loading,
    error,
    refetchEquipamento,
    abaAtiva,
    setAbaAtiva,
    abas,
  };
}