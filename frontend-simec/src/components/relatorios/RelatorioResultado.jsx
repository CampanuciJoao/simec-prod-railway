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

function RelatorioResultado({ resultado }) {
  if (!resultado || !Array.isArray(resultado.dados) || resultado.dados.length === 0) {
    return <EmptyState />;
  }

  const { tipoRelatorio, dados } = resultado;

  if (tipoRelatorio === 'inventarioEquipamentos') {
    const headers = [
      { key: 'modelo', label: 'Modelo', align: 'left' },
      { key: 'tag', label: 'N Serie / Tag', align: 'center' },
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
