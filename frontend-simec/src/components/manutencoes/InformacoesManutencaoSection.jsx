import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faBan } from '@fortawesome/free-solid-svg-icons';

import DateInput from '../ui/DateInput';
import TimeInput from '../ui/TimeInput';
import { formatarDataHora } from '../../utils/timeUtils';

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
    <div className="card space-y-6">

      {/* HEADER */}
      <div className="border-b pb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Informações da Manutenção
        </h3>
      </div>

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">

        <div>
          <span className="text-xs font-bold uppercase text-slate-400">Equipamento</span>
          <Link to="/equipamentos" className="block font-semibold text-blue-600 hover:underline">
            {manutencao.equipamento?.modelo} ({manutencao.equipamento?.tag})
          </Link>
        </div>

        <div>
          <span className="text-xs font-bold uppercase text-slate-400">Tipo</span>
          <p className="font-semibold">{manutencao.tipo}</p>
        </div>

        <div>
          <span className="text-xs font-bold uppercase text-slate-400">Status</span>
          <span className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-bold">
            {manutencao.status}
          </span>
        </div>

        <div>
          <span className="text-xs font-bold uppercase text-slate-400">Chamado</span>
          <p className="font-bold text-lg">
            {manutencao.numeroChamado || '---'}
          </p>
        </div>

        <div>
          <span className="text-xs font-bold uppercase text-slate-400">Previsão</span>
          <p className="font-medium">
            {formatarDataHora(manutencao.dataHoraAgendamentoInicio)}
          </p>
        </div>

        <div>
          <span className="text-xs font-bold uppercase text-slate-400">Unidade</span>
          <p className="font-medium">
            {manutencao.equipamento?.unidade?.nomeSistema || '---'}
          </p>
        </div>

      </div>

      {/* DESCRIÇÃO */}
      <div>
        <label className="label">Descrição</label>
        <textarea
          name="descricaoProblemaServico"
          value={formData.descricaoProblemaServico}
          onChange={onFormChange}
          disabled={camposPrincipaisBloqueados}
          className="input min-h-[100px]"
        />
      </div>

      {/* CAMPOS DE EXECUÇÃO */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

        <div>
          <label className="label">Técnico</label>
          <input
            name="tecnicoResponsavel"
            value={formData.tecnicoResponsavel}
            onChange={onFormChange}
            disabled={camposPrincipaisBloqueados}
            className="input"
          />
        </div>

        <div>
          <label className="label">Data Início</label>
          <DateInput
            name="dataInicioReal"
            value={formData.dataInicioReal}
            onChange={onFormChange}
            className="input"
          />
        </div>

        <div>
          <label className="label">Hora Início</label>
          <TimeInput
            name="horaInicioReal"
            value={formData.horaInicioReal}
            onChange={onFormChange}
            className="input"
          />
        </div>

        <div>
          <label className="label">Data Fim</label>
          <DateInput
            name="dataFimReal"
            value={formData.dataFimReal}
            onChange={onFormChange}
            className="input"
          />
        </div>

        <div>
          <label className="label">Hora Fim</label>
          <TimeInput
            name="horaFimReal"
            value={formData.horaFimReal}
            onChange={onFormChange}
            className="input"
          />
        </div>

      </div>

      {/* AÇÕES */}
      {!camposPrincipaisBloqueados && (
        <div className="flex justify-between items-center pt-4 border-t">

          <div>
            {isCancelavel && (
              <button
                className="btn btn-danger flex items-center gap-2"
                onClick={onAbrirCancelamento}
                disabled={submitting}
              >
                <FontAwesomeIcon icon={faBan} />
                Cancelar OS
              </button>
            )}
          </div>

          <button
            className="btn btn-primary flex items-center gap-2"
            onClick={onSalvarAlteracoes}
            disabled={submitting}
          >
            <FontAwesomeIcon icon={faSave} />
            {submitting ? 'Salvando...' : 'Salvar'}
          </button>

        </div>
      )}

    </div>
  );
}

export default InformacoesManutencaoSection;