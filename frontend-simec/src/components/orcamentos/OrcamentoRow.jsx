import { faEye, faPencil, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import OrcamentoStatusBadge from './OrcamentoStatusBadge';

const TIPO_LABEL = { PRODUTO: 'Produto', SERVICO: 'Serviço', MISTO: 'Misto' };

function OrcamentoRow({ orcamento, onVerDetalhes, onEditar, onExcluir }) {
  const fornecedoresNomes = (orcamento.fornecedores || [])
    .map((f) => f.nome)
    .join(', ');

  const dataFormatada = new Date(orcamento.createdAt).toLocaleDateString('pt-BR');

  return (
    <tr
      className="border-b transition-colors hover:cursor-pointer"
      style={{ borderColor: 'var(--border-soft)' }}
      onClick={() => onVerDetalhes(orcamento.id)}
    >
      <td className="px-4 py-3">
        <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
          {orcamento.titulo}
        </p>
        {orcamento.local && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {orcamento.local}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {TIPO_LABEL[orcamento.tipo] || orcamento.tipo}
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {fornecedoresNomes || '—'}
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {orcamento.criadoPor?.nome || '—'}
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
        {dataFormatada}
      </td>
      <td className="px-4 py-3">
        <OrcamentoStatusBadge status={orcamento.status} />
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onVerDetalhes(orcamento.id)}
            className="rounded-lg p-1.5 transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title="Ver detalhes"
          >
            <FontAwesomeIcon icon={faEye} />
          </button>
          {orcamento.status === 'RASCUNHO' && (
            <button
              type="button"
              onClick={() => onEditar(orcamento.id)}
              className="rounded-lg p-1.5 transition-colors"
              style={{ color: 'var(--text-muted)' }}
              title="Editar"
            >
              <FontAwesomeIcon icon={faPencil} />
            </button>
          )}
          {orcamento.status === 'RASCUNHO' && (
            <button
              type="button"
              onClick={() => onExcluir(orcamento)}
              className="rounded-lg p-1.5 transition-colors"
              style={{ color: 'var(--color-danger)' }}
              title="Excluir"
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default OrcamentoRow;
