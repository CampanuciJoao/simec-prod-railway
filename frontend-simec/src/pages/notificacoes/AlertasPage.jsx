// Ficheiro: src/pages/AlertasPage.jsx
// VERSÃO 11.0 - MODERNIZADA COM TAILWIND CSS, SKELETONS E UI DE ALTA PERFORMANCE

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAlertas } from '../../contexts/AlertasContext';
import GlobalFilterBar from '../../components/ui/GlobalFilterBar';
import SkeletonCard from '../../components/ui/SkeletonCard'; // <<< IMPORTADO
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSpinner, 
    faEye, 
    faCheck, 
    faEyeSlash, 
    faBellSlash, 
    faBell,
    faClock,
    faExclamationTriangle,
    faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

/**
 * @component AlertaItem
 * @description Componente de apresentação moderno para um único alerta.
 */
const AlertaItem = ({ alerta, onUpdateStatus, onDismiss }) => {
  const prioridadeMap = {
    'Alta': { border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-700', icon: '#ef4444' },
    'Media': { border: 'border-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700', icon: '#f59e0b' },
    'Baixa': { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', icon: '#3b82f6' }
  };
  
  const style = prioridadeMap[alerta.prioridade] || { border: 'border-slate-300', bg: 'bg-slate-50', text: 'text-slate-700', icon: '#64748b' };
  const dataFormatada = new Date(alerta.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

  const handleViewDetails = () => {
    if (alerta.status === 'NaoVisto') onUpdateStatus(alerta.id, 'Visto');
  };

  return (
    <div className={`group bg-white border-l-[8px] ${style.border} rounded-xl shadow-sm hover:shadow-md transition-all mb-4 overflow-hidden ${alerta.status === 'Visto' ? 'opacity-60' : ''}`}>
      <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex items-start gap-4 flex-1">
          <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${style.bg}`} style={{ color: style.icon }}>
            <FontAwesomeIcon icon={alerta.prioridade === 'Alta' ? faExclamationTriangle : faInfoCircle} />
          </div>
          
          <div className="flex flex-col gap-1">
            <h4 className="font-bold text-slate-800 text-lg leading-tight">{alerta.titulo}</h4>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              <span className="font-medium">{alerta.subtitulo}</span>
              <span className="flex items-center gap-1 text-xs"><FontAwesomeIcon icon={faClock} /> {dataFormatada}</span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${style.bg} ${style.text}`}>{alerta.tipo}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:border-l md:border-slate-100 md:pl-6 shrink-0">
          <Link to={alerta.link || '#'} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs hover:bg-blue-600 hover:text-white transition-all no-underline" onClick={handleViewDetails}>
            <FontAwesomeIcon icon={faEye} /> Detalhes
          </Link>
          
          {alerta.status === 'Visto' ? (
            <button onClick={() => onUpdateStatus(alerta.id, 'NaoVisto')} className="w-9 h-9 flex items-center justify-center bg-slate-100 text-slate-500 rounded-lg hover:bg-yellow-100 hover:text-yellow-600 transition-colors border-none cursor-pointer" title="Marcar como não visto">
              <FontAwesomeIcon icon={faEyeSlash} />
            </button>
          ) : (
            <>
              <button onClick={() => onUpdateStatus(alerta.id, 'Visto')} className="w-9 h-9 flex items-center justify-center bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-colors border-none cursor-pointer" title="Marcar como visto">
                <FontAwesomeIcon icon={faCheck} />
              </button>
              <button onClick={() => onDismiss(alerta.id)} className="w-9 h-9 flex items-center justify-center bg-slate-50 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors border-none cursor-pointer" title="Dispensar alerta">
                <FontAwesomeIcon icon={faBellSlash} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function AlertasPage() {
  const { alertas = [], loading, updateStatus, dismissAlerta } = useAlertas();
  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros] = useState({ tipo: '', status: 'NaoVisto' });

  const alertasFiltrados = useMemo(() => {
    return alertas.filter(alerta => {
      const termoBusca = searchTerm.toLowerCase();
      const matchSearch = alerta.titulo.toLowerCase().includes(termoBusca) || (alerta.subtitulo && alerta.subtitulo.toLowerCase().includes(termoBusca));
      const matchTipo = !filtros.tipo || alerta.tipo === filtros.tipo;
      const matchStatus = !filtros.status || alerta.status === filtros.status;
      return matchSearch && matchTipo && matchStatus;
    });
  }, [alertas, searchTerm, filtros]);

  const tiposOptions = useMemo(() => [...new Set(alertas.map(a => a.tipo))].map(t => ({ value: t, label: t })), [alertas]);
  const statusOptions = [{ value: 'NaoVisto', label: 'Não Visto' }, { value: 'Visto', label: 'Visto' }];

  const selectFiltersConfig = [
    { id: 'tipo', value: filtros.tipo, onChange: (v) => setFiltros(f => ({ ...f, tipo: v })), options: tiposOptions, defaultLabel: 'Todos os Tipos' },
    { id: 'status', value: filtros.status, onChange: (v) => setFiltros(f => ({ ...f, status: v })), options: statusOptions, defaultLabel: 'Todos os Status' }
  ];

  // ==========================================================================
  // >> ESTADO DE CARREGAMENTO (SKELETONS MODERNOS) <<
  // ==========================================================================
  if (loading && alertas.length === 0) {
    return (
        <div className="page-content-wrapper">
          <div className="page-title-card bg-slate-800 border-none shadow-xl"><h1 className="page-title-internal">Centro de Notificações</h1></div>
          <div className="space-y-4 mt-8 px-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
    );
  }

  return (
    <div className="page-content-wrapper pb-20">
      <div className="page-title-card shadow-xl bg-slate-800 border-none mb-8">
        <h1 className="page-title-internal flex items-center gap-3">
          <FontAwesomeIcon icon={faBell} className="text-yellow-400" />
          Alertas do Sistema
        </h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8 mx-1">
        <GlobalFilterBar
          searchTerm={searchTerm}
          onSearchChange={(e) => setSearchTerm(e.target.value)}
          searchPlaceholder="Filtrar por equipamento, OS ou descrição..."
          selectFilters={selectFiltersConfig}
        />
      </div>

      <div className="px-1">
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-slate-800 font-bold text-lg flex items-center gap-2">
                Ocorrências Encontradas 
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{alertasFiltrados.length}</span>
            </h3>
        </div>

        <div className="flex flex-col">
          {alertasFiltrados.length > 0 ? (
            alertasFiltrados.map(alerta => (
              <AlertaItem 
                key={alerta.id} 
                alerta={alerta} 
                onUpdateStatus={updateStatus} 
                onDismiss={dismissAlerta} 
              />
            ))
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
                <FontAwesomeIcon icon={faCheck} className="text-green-300 text-4xl mb-4" />
                <p className="text-slate-400 font-medium text-lg">Nenhum alerta pendente para estes critérios. Bom trabalho!</p>
            </div>
          )}
        </div>

        <div className="mt-10 p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
          <h4 className="text-blue-800 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
            <FontAwesomeIcon icon={faInfoCircle} /> Instruções de Gerenciamento
          </h4>
          <ul className="text-sm text-blue-700/80 space-y-2 list-none p-0">
            <li className="flex gap-2"><strong>Filtro Inicial:</strong> Por padrão, exibimos apenas o que ainda não foi visto por você.</li>
            <li className="flex gap-2"><strong>Dispensar:</strong> Remove o alerta da sua lista pessoal e marca como tratado no sistema.</li>
            <li className="flex gap-2"><strong>Status "Visto":</strong> Use o filtro de status para consultar alertas históricos ou finalizados.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AlertasPage;