// Dashboard de Controle de Manutencoes. Duas secoes:
//   1. Equipamentos — com freq preventiva cadastrada
//   2. Prediais     — rotinas regulatorias por unidade
//
// Cada linha mostra: nome + frequencia + ultima realizada + proxima
// prevista + status colorido (em dia / proximo / vencido / sem historico).
// Click no item abre modal com ultimas N manutencoes + download PDF.

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck, faCircleExclamation, faTriangleExclamation,
  faHistory, faWrench, faBuilding, faClock,
} from '@fortawesome/free-solid-svg-icons';

import { Card, LoadingState, InlineEmptyState } from '@/components/ui';
import { formatarDataHora } from '@/utils/timeUtils';
import { useControleManutencoes } from '@/hooks/manutencoes/useControleManutencoes';
import ControleHistoricoModal from './ControleHistoricoModal';

const TIPOS_SERVICO_PREDIAL_LABELS = {
  LimpezaCaixaDagua: 'Limpeza de caixa d’água',
  Dedetizacao:       'Dedetização',
  Extintor:          'Extintor',
  Bebedouro:         'Bebedouro',
  SpdaParaRaios:     'SPDA / para-raios',
  ArtElevador:       'ART do elevador',
};

const FREQUENCIA_LABEL = {
  3: 'Trimestral', 4: 'Quadrimestral', 6: 'Semestral', 12: 'Anual', 24: 'Bienal',
};
const freqLabel = (m) => FREQUENCIA_LABEL[m] || `A cada ${m} meses`;

const STATUS_META = {
  em_dia:        { label: 'Em dia',           cor: 'var(--color-success)', icon: faCircleCheck },
  proximo:       { label: 'Próximo',     cor: 'var(--color-warning)', icon: faCircleExclamation },
  vencido:       { label: 'Vencido',          cor: 'var(--color-danger)',  icon: faTriangleExclamation },
  sem_historico: { label: 'Sem histórico', cor: 'var(--text-muted)',  icon: faClock },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.sem_historico;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider"
          style={{ backgroundColor: `${m.cor}22`, color: m.cor }}>
      <FontAwesomeIcon icon={m.icon} />
      {m.label}
    </span>
  );
}
StatusBadge.propTypes = { status: PropTypes.string };

function ResumoCard({ titulo, resumo }) {
  if (!resumo) return null;
  return (
    <Card className="p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {titulo}
      </p>
      <div className="grid grid-cols-4 gap-3">
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>{resumo.em_dia || 0}</p>
          <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Em dia</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--color-warning)' }}>{resumo.proximo || 0}</p>
          <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Próximo</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--color-danger)' }}>{resumo.vencido || 0}</p>
          <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Vencido</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--text-muted)' }}>{resumo.sem_historico || 0}</p>
          <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Sem hist.</p>
        </div>
      </div>
    </Card>
  );
}
ResumoCard.propTypes = { titulo: PropTypes.string, resumo: PropTypes.object };

function LinhaRotina({ item, onAbrirHistorico }) {
  const ehEquipamento = item.tipo === 'equipamento';
  const nome = ehEquipamento
    ? (item.nome || item.modelo || item.tag || '—')
    : (TIPOS_SERVICO_PREDIAL_LABELS[item.tipoServicoPredial] || item.tipoServicoPredial);
  const sub = ehEquipamento
    ? `${item.tag ? `TAG ${item.tag} · ` : ''}${item.tipoEquipamento || ''} · ${freqLabel(item.frequenciaMeses)}`
    : `${freqLabel(item.frequenciaMeses)}`;

  const proxima = item.proximaPrevistaEm
    ? new Date(item.proximaPrevistaEm).toLocaleDateString('pt-BR')
    : '—';
  const ultima = item.ultimaRealizadaEm
    ? new Date(item.ultimaRealizadaEm).toLocaleDateString('pt-BR')
    : 'Nunca';

  return (
    <button
      type="button"
      onClick={() => onAbrirHistorico(item)}
      className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition hover:bg-[var(--bg-surface-subtle)]"
      style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}
    >
      <FontAwesomeIcon icon={ehEquipamento ? faWrench : faBuilding}
        className="shrink-0 text-lg" style={{ color: 'var(--brand-primary)' }} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {nome}
        </p>
        <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {sub}
        </p>
      </div>

      <div className="hidden min-w-0 shrink-0 text-right sm:block">
        <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Última</p>
        <p className="text-xs" style={{ color: 'var(--text-primary)' }}>{ultima}</p>
      </div>

      <div className="hidden min-w-0 shrink-0 text-right sm:block">
        <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Próxima</p>
        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{proxima}</p>
      </div>

      <div className="shrink-0">
        <StatusBadge status={item.status} />
      </div>

      <FontAwesomeIcon icon={faHistory} className="shrink-0 text-xs"
        style={{ color: 'var(--text-muted)' }} />
    </button>
  );
}
LinhaRotina.propTypes = { item: PropTypes.object.isRequired, onAbrirHistorico: PropTypes.func.isRequired };

// Agrupa itens por unidadeNome, ordenando os grupos alfabeticamente.
// Dentro de cada grupo mantemos a ordem original (ja vem ordenada do
// backend por tipoServicoPredial ou modelo).
function agruparPorUnidade(items) {
  const mapa = new Map();
  for (const it of items) {
    const chave = it.unidadeNome || '—';
    if (!mapa.has(chave)) mapa.set(chave, []);
    mapa.get(chave).push(it);
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    .map(([unidade, rotinas]) => ({ unidade, rotinas }));
}

function resumoDoGrupo(rotinas) {
  const r = { em_dia: 0, proximo: 0, vencido: 0, sem_historico: 0 };
  for (const it of rotinas) r[it.status] = (r[it.status] || 0) + 1;
  return r;
}

function BlocoUnidade({ unidade, rotinas, onAbrirHistorico }) {
  const r = resumoDoGrupo(rotinas);
  return (
    <div className="rounded-xl border p-4"
      style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {unidade}
          <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: 'var(--brand-primary-soft)', color: 'var(--brand-primary)' }}>
            {rotinas.length}
          </span>
        </h4>
        <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {r.vencido > 0 && <span style={{ color: 'var(--color-danger)' }}>{r.vencido} vencido(s)</span>}
          {r.proximo > 0 && <span style={{ color: 'var(--color-warning)' }}>{r.proximo} próximo(s)</span>}
          {r.em_dia > 0 && <span style={{ color: 'var(--color-success)' }}>{r.em_dia} em dia</span>}
          {r.sem_historico > 0 && <span>{r.sem_historico} sem hist.</span>}
        </div>
      </div>
      <div className="space-y-2">
        {rotinas.map((item) => (
          <LinhaRotina
            key={item.equipamentoId || item.rotinaId}
            item={item}
            onAbrirHistorico={onAbrirHistorico}
          />
        ))}
      </div>
    </div>
  );
}
BlocoUnidade.propTypes = {
  unidade: PropTypes.string.isRequired,
  rotinas: PropTypes.array.isRequired,
  onAbrirHistorico: PropTypes.func.isRequired,
};

function Secao({ titulo, icon, items, onAbrirHistorico, resumo }) {
  const grupos = agruparPorUnidade(items);
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={icon} style={{ color: 'var(--brand-primary)' }} />
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{titulo}</h3>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: 'var(--brand-primary-soft)', color: 'var(--brand-primary)' }}>
            {items.length}
          </span>
        </div>
        {resumo && (
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--color-danger)' }}>{resumo.vencido || 0} vencido(s)</span>
            <span style={{ color: 'var(--color-warning)' }}>{resumo.proximo || 0} próximo(s)</span>
            <span style={{ color: 'var(--color-success)' }}>{resumo.em_dia || 0} em dia</span>
          </div>
        )}
      </div>
      {items.length === 0 ? (
        <InlineEmptyState message="Nenhuma rotina cadastrada." />
      ) : (
        <div className="space-y-3">
          {grupos.map(({ unidade, rotinas }) => (
            <BlocoUnidade
              key={unidade}
              unidade={unidade}
              rotinas={rotinas}
              onAbrirHistorico={onAbrirHistorico}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
Secao.propTypes = {
  titulo: PropTypes.string.isRequired,
  icon: PropTypes.object.isRequired,
  items: PropTypes.array.isRequired,
  resumo: PropTypes.object,
  onAbrirHistorico: PropTypes.func.isRequired,
};

export default function ControleManutencoesTab() {
  const { equipamentos, prediais, resumo, loading, erro, refetch } = useControleManutencoes();
  const [historicoItem, setHistoricoItem] = useState(null);

  if (loading) return <LoadingState message="Carregando controle de manutenções..." />;
  if (erro) {
    return (
      <Card className="p-5">
        <p style={{ color: 'var(--color-danger)' }}>{erro}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <ResumoCard titulo="Resumo geral" resumo={resumo?.geral} />

      <Secao
        titulo="Equipamentos"
        icon={faWrench}
        items={equipamentos}
        resumo={resumo?.equipamentos}
        onAbrirHistorico={setHistoricoItem}
      />

      <Secao
        titulo="Rotinas prediais"
        icon={faBuilding}
        items={prediais}
        resumo={resumo?.prediais}
        onAbrirHistorico={setHistoricoItem}
      />

      <ControleHistoricoModal
        item={historicoItem}
        onClose={() => { setHistoricoItem(null); refetch?.(); }}
      />
    </div>
  );
}
