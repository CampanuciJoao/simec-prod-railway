import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  faChartLine,
  faFileMedical,
  faHeartPulse,
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

  const abas = useMemo(() => {
    const base = [
      { id: 'visaoGeral',  label: 'Visao geral',   icon: faChartLine  },
      { id: 'historico',   label: 'Historico',      icon: faHistory    },
      { id: 'fichaTecnica',label: 'Ficha tecnica',  icon: faFileMedical },
      { id: 'anexos',      label: 'Anexos',         icon: faPaperclip  },
      { id: 'cobertura',   label: 'Cobertura',      icon: faShieldAlt  },
    ];
    if (equipamento?.gehcAssetId) {
      base.push({ id: 'saudeGehc', label: 'Saúde GE', icon: faHeartPulse });
    }
    return base;
  }, [equipamento]);

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
