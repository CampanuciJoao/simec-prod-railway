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

function ehRmGe(equipamento) {
  if (!equipamento) return false;
  const fabricante = (equipamento.fabricante ?? '').toUpperCase();
  const tipo       = (equipamento.tipo ?? '').toUpperCase();
  return fabricante.includes('GE') && tipo.includes('RM');
}

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

    if (ehRmGe(equipamento)) {
      base.push({ id: 'saudeGehc', label: 'Saude GE', icon: faHeartPulse });
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
