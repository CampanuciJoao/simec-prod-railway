import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave,
  faBan,
} from '@fortawesome/free-solid-svg-icons';

import DateInput from '../ui/DateInput';
import TimeInput from '../ui/TimeInput';
import { formatarDataHora } from '../../utils/timeUtils';

const getStatusBadgeClassManutencao = (status) => {
  const statusClass = status?.toLowerCase().replace(/ /g, '-') || 'default';
  if (status === 'AguardandoConfirmacao') return 'status-badge status-os-emandamento';
  return `status-badge status-os-${statusClass}`;
};

function InformacoesManutencaoSection({
  manutencao,
  formData,
  onFormChange,
  onSalvarAlteracoes,
  onAbrirCancelamento,
  camposPrincipaisBloqueados,
  isCancelavel,
  submitting,
}) {
  return (
    <section className="page-section">
      <h3 className="text-slate-800 font-bold text-sm uppercase tracking-wider mb-6 border-b border-slate-100 pb-4">
        Informações da Manutenção
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase text-slate-400 mb-1">Equipamento</span>
          <Link to="/equipamentos" className="font-bold text-blue-600 no-underline hover:underline">
            {manutencao.equipamento?.modelo} ({manutencao.equipamento?.tag})
          </Link>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase text-slate-400 mb-1">Tipo / Categoria</span>
          <span className="font-bold text-slate-700">{manutencao.tipo}</span>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase text-slate-400 mb-1">Status da OS</span>
          <span className={getStatusBadgeClassManutencao(manutencao.status)}>
            {manutencao.status}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase text-slate-400 mb-1">Nº do Chamado</span>
          <span className="font-black text-slate-900 text-lg">
            {manutencao.numeroChamado || '---'}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase text-slate-400 mb-1">Previsão Original</span>
          <span className="font-bold text-slate-700">
            {formatarDataHora(manutencao.dataHoraAgendamentoInicio)}
            {manutencao.dataHoraAgendamentoFim && (
              <>
                {' '}às{' '}
                {new Date(manutencao.dataHoraAgendamentoFim).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </>
            )}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase text-slate-400 mb-1">Unidade</span>
          <span className="font-bold text-slate-700">
            {manutencao.equipamento?.unidade?.nomeSistema ||
              manutencao.equipamento?.unidade?.nome ||
              manutencao.unidade?.nomeSistema ||
              '---'}
          </span>
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '20px' }}>
        <label>Descrição do Problema / Serviço:</label>
        <textarea
          name="descricaoProblemaServico"
          value={formData.descricaoProblemaServico}
          onChange={onFormChange}
          rows="3"
          disabled={camposPrincipaisBloqueados}
        />
      </div>

      <div className="info-grid" style={{ marginTop: '15px', alignItems: 'flex-end' }}>
        <div className="form-group">
          <label>Técnico Responsável</label>
          <input
            type="text"
            name="tecnicoResponsavel"
            value={formData.tecnicoResponsavel}
            onChange={onFormChange}
            disabled={camposPrincipaisBloqueados}
          />
        </div>

        <div className="form-group">
          <label>Data Início Real</label>
          <DateInput
            name="dataInicioReal"
            value={formData.dataInicioReal}
            onChange={onFormChange}
            disabled={camposPrincipaisBloqueados}
          />
        </div>

        <div className="form-group">
          <label>Hora Início Real</label>
          <TimeInput
            name="horaInicioReal"
            value={formData.horaInicioReal}
            onChange={onFormChange}
            disabled={camposPrincipaisBloqueados}
          />
        </div>

        <div className="form-group">
          <label>Data Fim Real</label>
          <DateInput
            name="dataFimReal"
            value={formData.dataFimReal}
            onChange={onFormChange}
            disabled={camposPrincipaisBloqueados}
          />
        </div>

        <div className="form-group">
          <label>Hora Fim Real</label>
          <TimeInput
            name="horaFimReal"
            value={formData.horaFimReal}
            onChange={onFormChange}
            disabled={camposPrincipaisBloqueados}
          />
        </div>
      </div>

      {!camposPrincipaisBloqueados && (
        <div className="form-actions" style={{ justifyContent: 'space-between', marginTop: '20px' }}>
          <div>
            {isCancelavel && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={onAbrirCancelamento}
                disabled={submitting}
              >
                <FontAwesomeIcon icon={faBan} /> Cancelar OS
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onSalvarAlteracoes}
            disabled={submitting}
          >
            <FontAwesomeIcon icon={faSave} /> {submitting ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      )}
    </section>
  );
}

export default InformacoesManutencaoSection;