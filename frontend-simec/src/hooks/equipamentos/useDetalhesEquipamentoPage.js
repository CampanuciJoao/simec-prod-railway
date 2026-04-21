import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  faChartLine,
  faFileMedical,
  faHistory,
  faPaperclip,
  faShieldAlt,
} from '@fortawesome/free-solid-svg-icons';

import { useEquipamentoDetalhes } from './useEquipamentoDetalhes';

export function useDetalhesEquipamentoPage() {
  const { equipamentoId } = useParams();
  const [abaAtiva, setAbaAtiva] = useState('visaoGeral');

  const {
    equipamento,
    loading,
    error,
    refetch: refetchEquipamento,
  } = useEquipamentoDetalhes(equipamentoId);

  const abas = useMemo(
    () => [
      { id: 'visaoGeral', label: 'Visao geral', icon: faChartLine },
      { id: 'historico', label: 'Historico', icon: faHistory },
      { id: 'fichaTecnica', label: 'Ficha tecnica', icon: faFileMedical },
      { id: 'anexos', label: 'Anexos', icon: faPaperclip },
      { id: 'cobertura', label: 'Cobertura', icon: faShieldAlt },
    ],
    []
  );

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
