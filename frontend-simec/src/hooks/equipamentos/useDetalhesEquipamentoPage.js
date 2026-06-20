import { useMemo, useState, useEffect } from 'react';
import { useParams, useLocation, useSearchParams } from 'react-router-dom';
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

// Ressonâncias recebem a aba "Saúde" sempre — mesmo sem integração GE
// ativa (estado vazio orienta o usuario). Outros tipos só ganham a aba
// se houver gehcAssetId casado.
const TIPOS_RESSONANCIA = new Set([
  'Ressonancia Magnetica',
  'Ressonância Magnética',
]);

import { useEquipamentoDetalhes } from './useEquipamentoDetalhes';

export function useDetalhesEquipamentoPage() {
  const { equipamentoId } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Prioridade: querystring (deep-link de alerta) > location.state (nav interna) > default
  const tabInicial = searchParams.get('tab') || location.state?.tab || 'visaoGeral';
  const [abaAtiva, setAbaAtiva] = useState(tabInicial);

  useEffect(() => {
    const fromQuery = searchParams.get('tab');
    if (fromQuery) {
      setAbaAtiva(fromQuery);
      return;
    }
    if (location.state?.tab) setAbaAtiva(location.state.tab);
  }, [location.state?.tab, searchParams]);

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
    const eRessonancia = equipamento?.tipo && TIPOS_RESSONANCIA.has(equipamento.tipo);
    // Ressonância sempre tem aba Saúde (com estado vazio quando nao tem
    // integracao). Outros equipamentos só ganham se houver gehcAssetId.
    if (eRessonancia || equipamento?.gehcAssetId) {
      base.push({ id: 'saudeGehc', label: 'Saúde', icon: faHeartPulse });
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
