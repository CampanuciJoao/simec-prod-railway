import { useMemo, useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  faChartLine,
  faClipboardCheck,
  faFileMedical,
  faHeartPulse,
  faHistory,
  faPaperclip,
  faShieldAlt,
} from '@fortawesome/free-solid-svg-icons';

const MODALIDADES_COM_CQ = new Set([
  'Mamografia',
  'Tomografia Computadorizada',
  'Raio-X',
  'Densitometro Osseo',
  'Ressonancia Magnetica',
  'Ressonância Magnética',
  'Ultrassom',
  'Ultrassonografia',
]);

import { useEquipamentoDetalhes } from './useEquipamentoDetalhes';

export function useDetalhesEquipamentoPage() {
  const { equipamentoId } = useParams();
  const location = useLocation();
  const [abaAtiva, setAbaAtiva] = useState(location.state?.tab || 'visaoGeral');

  useEffect(() => {
    if (location.state?.tab) setAbaAtiva(location.state.tab);
  }, [location.state?.tab]);

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
    if (equipamento?.tipo && MODALIDADES_COM_CQ.has(equipamento.tipo)) {
      base.push({ id: 'controleQualidade', label: 'Controle de Qualidade', icon: faClipboardCheck });
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
