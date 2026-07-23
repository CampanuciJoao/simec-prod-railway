import React from 'react';
import PropTypes from 'prop-types';

import { StatusBadge } from '@/components/ui';
import { formatarDataHora } from '../../utils/timeUtils';
import { formatarDowntime } from '../../utils/bi/downtimeUtils';

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
      Nenhum resultado encontrado para os filtros selecionados.
    </div>
  );
}

function TableShell({ headers, rows }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((header) => (
              <th
                key={header.key}
                className={[
                  'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500',
                  header.align === 'left' ? 'text-left' : 'text-center',
                ].join(' ')}
              >
                {header.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white">
          {rows}
        </tbody>
      </table>
    </div>
  );
}

TableShell.propTypes = {
  headers: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      align: PropTypes.oneOf(['left', 'center']),
    })
  ).isRequired,
  rows: PropTypes.node.isRequired,
};

// ─── Relatório de Seguros — cards ────────────────────────────────────────────

const SEGURO_TIPO_LABEL = {
  EQUIPAMENTO: 'Equipamento',
  PREDIAL: 'Predial',
  AUTO: 'Automotivo',
  RESPONSABILIDADE_CIVIL: 'Resp. Civil',
  OUTRO: 'Outro',
};

const SEGURO_LMI_CAMPOS = [
  ['lmiResponsabilidadeCivil', 'RC'],
  ['lmiIncendio', 'Incêndio'],
  ['lmiRoubo', 'Roubo'],
  ['lmiVidros', 'Vidros'],
  ['lmiVendaval', 'Vendaval'],
  ['lmiColisao', 'Colisão'],
  ['lmiDanosEletricos', 'Danos elétricos'],
  ['lmiDanosMateriais', 'Danos materiais'],
  ['lmiDanosCausaExterna', 'Danos causa externa'],
  ['lmiDanosCorporais', 'Danos corporais'],
  ['lmiDanosMorais', 'Danos morais'],
  ['lmiAPP', 'APP'],
  ['lmiPerdaLucroBruto', 'Perda lucro'],
  ['lmiVazamentoTanques', 'Vazamento tanques'],
];

function fmtBRL(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return 'R$ 0,00';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
}

function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('pt-BR');
}

function diasParaVencer(dataFim) {
  if (!dataFim) return null;
  const ms = new Date(dataFim).getTime() - Date.now();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function corDiasVencer(dias) {
  if (dias === null) return 'text-slate-500';
  if (dias < 0) return 'text-slate-500';
  if (dias < 30) return 'text-red-600 font-semibold';
  if (dias < 90) return 'text-amber-600 font-semibold';
  return 'text-emerald-600';
}

function unidadeLabel(s) {
  return s.unidade?.nomeSistema
      || s.equipamento?.unidade?.nomeSistema
      || s.veiculo?.unidade?.nomeSistema
      || (s.tipoAlvo === 'EMPRESARIAL_GERAL' ? 'Todas' : '—');
}

function vinculoLabel(s) {
  if (s.equipamento) {
    const nome = s.equipamento.apelido || s.equipamento.modelo || '—';
    const tag  = s.equipamento.tag ? ` (${s.equipamento.tag})` : '';
    return `${nome}${tag}`;
  }
  if (s.veiculo) {
    const modelo = s.veiculo.modelo ? ` ${s.veiculo.modelo}` : '';
    return `${s.veiculo.placa || 'Veículo'}${modelo}`;
  }
  return null;
}

function SegurosCards({ apolices }) {
  return (
    <div className="space-y-4">
      {apolices.map((s) => {
        const dias = diasParaVencer(s.dataFim);
        const lmis = SEGURO_LMI_CAMPOS
          .map(([campo, label]) => ({ label, valor: Number(s[campo] || 0) }))
          .filter((x) => x.valor > 0);
        const vinculo = vinculoLabel(s);

        return (
          <div
            key={s.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            {/* Header: dados principais */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-lg font-bold text-slate-900">
                  Nº {s.apoliceNumero || '—'}
                </span>
                <span className="text-sm text-slate-600">
                  {s.seguradora || '—'}
                </span>
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  {SEGURO_TIPO_LABEL[s.tipoSeguro] || s.tipoSeguro}
                </span>
              </div>
              <StatusBadge value={s.status} />
            </div>

            {/* Metadata: unidade, vinculo, datas */}
            <div className="grid grid-cols-1 gap-y-2 gap-x-6 py-3 text-sm text-slate-700 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Unidade
                </span>
                <div>{unidadeLabel(s)}</div>
              </div>

              {vinculo && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Vinculado a
                  </span>
                  <div>{vinculo}</div>
                </div>
              )}

              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Início
                </span>
                <div>{fmtDate(s.dataInicio)}</div>
              </div>

              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Vencimento
                </span>
                <div>
                  {fmtDate(s.dataFim)}
                  {dias !== null && (
                    <span className={`ml-2 text-xs ${corDiasVencer(dias)}`}>
                      {dias >= 0 ? `${dias} dia(s)` : `venceu há ${Math.abs(dias)} dia(s)`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Coberturas */}
            {s.cobertura && (
              <div className="border-t border-slate-100 pt-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Coberturas
                </div>
                <div className="text-sm text-slate-700">{s.cobertura}</div>
              </div>
            )}

            {/* LMIs — chips inline */}
            {lmis.length > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Limites máximos de indenização (LMIs)
                </div>
                <div className="flex flex-wrap gap-2">
                  {lmis.map((lmi) => (
                    <span
                      key={lmi.label}
                      className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                    >
                      <strong className="mr-1">{lmi.label}:</strong> {fmtBRL(lmi.valor)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Rodapé: prêmio total */}
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
              <span className="text-slate-500">Prêmio total</span>
              <span className="font-semibold text-slate-900">{fmtBRL(s.premioTotal)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

SegurosCards.propTypes = {
  apolices: PropTypes.array.isRequired,
};

function RelatorioResultado({ resultado }) {
  if (!resultado || !Array.isArray(resultado.dados) || resultado.dados.length === 0) {
    return <EmptyState />;
  }

  const { tipoRelatorio, dados } = resultado;

  if (tipoRelatorio === 'inventarioEquipamentos') {
    const headers = [
      { key: 'modelo', label: 'Modelo', align: 'left' },
      { key: 'tag', label: 'Número de série', align: 'center' },
      { key: 'fabricante', label: 'Fabricante', align: 'center' },
      { key: 'anvisa', label: 'Registro ANVISA', align: 'center' },
      { key: 'status', label: 'Status', align: 'center' },
      { key: 'unidade', label: 'Unidade', align: 'left' },
    ];

    const rows = dados.map((item, index) => (
      <tr
        key={`${item.id || item.tag || item.modelo}-${index}`}
        className="hover:bg-slate-50"
      >
        <td className="px-4 py-3 text-left font-medium text-slate-900">
          {item.modelo || 'N/A'}
        </td>
        <td className="px-4 py-3 text-center text-slate-700">
          {item.tag || 'N/A'}
        </td>
        <td className="px-4 py-3 text-center text-slate-700">
          {item.fabricante || 'N/A'}
        </td>
        <td className="px-4 py-3 text-center text-slate-700">
          {item.registroAnvisa || 'N/A'}
        </td>
        <td className="px-4 py-3 text-center">
          <StatusBadge value={item.status} />
        </td>
        <td className="px-4 py-3 text-left text-slate-700">
          {item.unidade?.nomeSistema || 'N/A'}
        </td>
      </tr>
    ));

    return <TableShell headers={headers} rows={rows} />;
  }

  if (tipoRelatorio === 'manutencoesRealizadas') {
    const headers = [
      { key: 'os', label: 'N OS / Chamado', align: 'center' },
      { key: 'conclusao', label: 'Conclusao', align: 'center' },
      { key: 'equipamento', label: 'Equipamento / Unidade', align: 'left' },
      { key: 'responsavel', label: 'Responsavel', align: 'center' },
      { key: 'descricao', label: 'Descricao do Servico', align: 'left' },
    ];

    const rows = dados.map((item, index) => (
      <tr
        key={`${item.id || item.numeroOS}-${index}`}
        className="hover:bg-slate-50"
      >
        <td className="px-4 py-3 text-center">
          <div className="font-semibold text-slate-900">
            {item.numeroOS || '-'}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {item.numeroChamado ? `Chamado: ${item.numeroChamado}` : '-'}
          </div>
        </td>

        <td className="px-4 py-3 text-center text-slate-700">
          {formatarDataHora(item.dataConclusao)}
        </td>

        <td className="px-4 py-3 text-left">
          <div className="font-semibold text-slate-900">
            {item.equipamento?.modelo || 'N/A'} ({item.equipamento?.tag || 'N/A'})
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Unidade: {item.equipamento?.unidade?.nomeSistema || 'N/A'}
          </div>
        </td>

        <td className="px-4 py-3 text-center text-slate-700">
          {item.tecnicoResponsavel || 'N/A'}
        </td>

        <td className="px-4 py-3 text-left text-sm leading-6 text-slate-700">
          {item.descricaoProblemaServico || '-'}
        </td>
      </tr>
    ));

    return <TableShell headers={headers} rows={rows} />;
  }

  if (tipoRelatorio === 'orcamentoCq') {
    const headers = [
      { key: 'unidade', label: 'Unidade', align: 'left' },
      { key: 'cnpj', label: 'CNPJ', align: 'center' },
      { key: 'modalidade', label: 'Modalidade', align: 'left' },
      { key: 'modelo', label: 'Modelo', align: 'left' },
      { key: 'fabricante', label: 'Fabricante', align: 'center' },
      { key: 'numeroSerie', label: 'Nº Série (TAG)', align: 'center' },
    ];

    const rows = dados.map((item, index) => (
      <tr key={`${item.numeroSerie || item.modelo}-${index}`} className="hover:bg-slate-50">
        <td className="px-4 py-3 text-left">
          <div className="font-semibold text-slate-900">{item.unidade || '—'}</div>
          {item.cidadeUf ? (
            <div className="mt-1 text-xs text-slate-500">{item.cidadeUf}</div>
          ) : null}
        </td>
        <td className="px-4 py-3 text-center font-mono text-xs text-slate-700">
          {item.cnpj || '—'}
        </td>
        <td className="px-4 py-3 text-left text-slate-700">{item.modalidade || '—'}</td>
        <td className="px-4 py-3 text-left font-medium text-slate-900">{item.modelo || '—'}</td>
        <td className="px-4 py-3 text-center text-slate-700">{item.fabricante || '—'}</td>
        <td className="px-4 py-3 text-center font-mono text-xs text-slate-700">
          {item.numeroSerie || '—'}
        </td>
      </tr>
    ));

    return <TableShell headers={headers} rows={rows} />;
  }

  if (tipoRelatorio === 'inventarioSeguros') {
    return <SegurosCards apolices={dados} />;
  }

  if (tipoRelatorio === 'tempoParada') {
    const headers = [
      { key: 'equipamento', label: 'Equipamento', align: 'left' },
      { key: 'os', label: 'N OS', align: 'center' },
      { key: 'inicio', label: 'Inicio', align: 'center' },
      { key: 'fim', label: 'Fim', align: 'center' },
      { key: 'total', label: 'Total parado', align: 'center' },
    ];

    const rows = dados.map((item, index) => (
      <tr
        key={`${item.numeroOS || item.equipamentoId}-${index}`}
        className="hover:bg-slate-50"
      >
        <td className="px-4 py-3 text-left font-medium text-slate-900">
          {item.equipamentoNome || 'N/A'} ({item.equipamentoId || 'N/A'})
        </td>
        <td className="px-4 py-3 text-center text-slate-700">
          {item.numeroOS || '-'}
        </td>
        <td className="px-4 py-3 text-center text-slate-700">
          {formatarDataHora(item.dataInicio)}
        </td>
        <td className="px-4 py-3 text-center text-slate-700">
          {formatarDataHora(item.dataFim)}
        </td>
        <td className="px-4 py-3 text-center font-bold text-red-600">
          {formatarDowntime(item.tempoParadaHoras)}
        </td>
      </tr>
    ));

    return <TableShell headers={headers} rows={rows} />;
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
      Tipo de relatorio nao implementado.
    </div>
  );
}

RelatorioResultado.propTypes = {
  resultado: PropTypes.shape({
    tipoRelatorio: PropTypes.string,
    dados: PropTypes.array,
  }),
};

export default RelatorioResultado;
