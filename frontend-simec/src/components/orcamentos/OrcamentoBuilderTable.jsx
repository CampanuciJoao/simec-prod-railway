import { faPlus, faTrash, faStar } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function formatMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function CelulaPreco({ valor, desconto, onChange }) {
  return (
    <div className="flex flex-col gap-1 p-1">
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
          R$
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={valor || ''}
          onChange={(e) => onChange('valor', e.target.value)}
          placeholder="0,00"
          className="w-full rounded border px-1.5 py-0.5 text-right text-sm focus:outline-none focus:ring-1"
          style={{
            borderColor: 'var(--border-default)',
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-primary)',
          }}
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px]" style={{ color: 'var(--color-danger)' }}>
          Desc
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={desconto || ''}
          onChange={(e) => onChange('desconto', e.target.value)}
          placeholder="0,00"
          className="w-full rounded border px-1.5 py-0.5 text-right text-sm focus:outline-none focus:ring-1"
          style={{
            borderColor: 'var(--border-default)',
            backgroundColor: 'var(--bg-input)',
            color: 'var(--color-danger)',
          }}
        />
      </div>
    </div>
  );
}

function OrcamentoBuilderTable({
  fornecedores,
  itens,
  precos,
  onAtualizarFornecedor,
  onRemoverFornecedor,
  onAdicionarFornecedor,
  onAtualizarItem,
  onRemoverItem,
  onAdicionarItem,
  onAtualizarPreco,
  calcularTotalFornecedor,
}) {
  const MIN_COL_W = 160;

  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-soft)' }}>
      <table className="w-full border-collapse text-sm">
        {/* ── Cabeçalho com número da coluna e nome do fornecedor ── */}
        <thead>
          <tr>
            {/* Coluna DESCRIÇÃO */}
            <th
              className="border-b border-r px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider"
              style={{
                borderColor: 'var(--border-soft)',
                backgroundColor: 'var(--bg-surface-subtle)',
                color: 'var(--text-muted)',
                minWidth: 220,
              }}
            >
              DESCRIÇÃO / Data
            </th>

            {/* Colunas de fornecedor */}
            {fornecedores.map((forn, idx) => (
              <th
                key={forn.id}
                className="border-b border-r px-2 py-2 text-center"
                style={{
                  borderColor: 'var(--border-soft)',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  minWidth: MIN_COL_W,
                }}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className="text-xs font-bold"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {idx + 1}
                    </span>
                    {fornecedores.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemoverFornecedor(forn.id)}
                        className="rounded p-0.5 transition-colors"
                        style={{ color: 'var(--color-danger)' }}
                        title="Remover fornecedor"
                      >
                        <FontAwesomeIcon icon={faTrash} className="text-xs" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={forn.nome}
                    onChange={(e) => onAtualizarFornecedor(forn.id, 'nome', e.target.value)}
                    placeholder="Nome do fornecedor"
                    className="w-full rounded border px-2 py-1 text-center text-sm font-semibold focus:outline-none focus:ring-1"
                    style={{
                      borderColor: 'var(--border-default)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <input
                    type="text"
                    value={forn.formaPagamento || ''}
                    onChange={(e) =>
                      onAtualizarFornecedor(forn.id, 'formaPagamento', e.target.value)
                    }
                    placeholder="Forma de pagamento"
                    className="w-full rounded border px-2 py-1 text-center text-xs focus:outline-none"
                    style={{
                      borderColor: 'var(--border-default)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-secondary)',
                    }}
                  />
                </div>
              </th>
            ))}

            {/* Botão adicionar fornecedor */}
            <th
              className="border-b px-2 py-2"
              style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-subtle)' }}
            >
              <button
                type="button"
                onClick={onAdicionarFornecedor}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--brand-primary-soft)',
                  color: 'var(--brand-primary)',
                }}
                title="Adicionar fornecedor"
              >
                <FontAwesomeIcon icon={faPlus} />
                <span>Fornecedor</span>
              </button>
            </th>
          </tr>
        </thead>

        <tbody>
          {itens.map((item) => (
            <tr
              key={item.id}
              className="border-b transition-colors"
              style={{
                borderColor: 'var(--border-soft)',
                backgroundColor: item.isDestaque
                  ? 'var(--color-danger-soft)'
                  : 'var(--bg-surface)',
              }}
            >
              {/* Célula de descrição */}
              <td
                className="border-r px-3 py-2"
                style={{ borderColor: 'var(--border-soft)' }}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={item.descricao}
                      onChange={(e) => onAtualizarItem(item.id, 'descricao', e.target.value)}
                      placeholder="Descrição do item"
                      className="flex-1 rounded border px-2 py-1 text-sm font-medium focus:outline-none focus:ring-1"
                      style={{
                        borderColor: 'var(--border-default)',
                        backgroundColor: 'var(--bg-input)',
                        color: item.isDestaque ? 'var(--color-danger)' : 'var(--text-primary)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => onAtualizarItem(item.id, 'isDestaque', !item.isDestaque)}
                      className="rounded p-1 transition-colors"
                      style={{
                        color: item.isDestaque ? 'var(--color-danger)' : 'var(--text-muted)',
                      }}
                      title={item.isDestaque ? 'Remover destaque' : 'Marcar como destaque (vermelho)'}
                    >
                      <FontAwesomeIcon icon={faStar} className="text-xs" />
                    </button>
                    {itens.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemoverItem(item.id)}
                        className="rounded p-1 transition-colors"
                        style={{ color: 'var(--color-danger)' }}
                        title="Remover item"
                      >
                        <FontAwesomeIcon icon={faTrash} className="text-xs" />
                      </button>
                    )}
                  </div>
                  <input
                    type="date"
                    value={item.data || ''}
                    onChange={(e) => onAtualizarItem(item.id, 'data', e.target.value)}
                    className="w-36 rounded border px-2 py-0.5 text-xs focus:outline-none"
                    style={{
                      borderColor: 'var(--border-default)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-secondary)',
                    }}
                  />
                </div>
              </td>

              {/* Células de preço por fornecedor */}
              {fornecedores.map((forn) => {
                const key = `${item.id}_${forn.id}`;
                const p = precos[key] || { valor: 0, desconto: 0 };
                return (
                  <td
                    key={forn.id}
                    className="border-r px-1 py-1"
                    style={{ borderColor: 'var(--border-soft)' }}
                  >
                    <CelulaPreco
                      valor={p.valor}
                      desconto={p.desconto}
                      onChange={(campo, val) => onAtualizarPreco(item.id, forn.id, campo, val)}
                    />
                  </td>
                );
              })}

              <td />
            </tr>
          ))}

          {/* Linha VALOR TOTAL */}
          <tr style={{ backgroundColor: 'var(--bg-surface-subtle)' }}>
            <td
              className="border-r px-3 py-2 text-right text-sm font-bold"
              style={{
                borderColor: 'var(--border-soft)',
                color: 'var(--text-primary)',
              }}
            >
              Valor Total
            </td>
            {fornecedores.map((forn) => (
              <td
                key={forn.id}
                className="border-r px-3 py-2 text-right"
                style={{
                  borderColor: 'var(--border-soft)',
                  color: 'var(--color-danger)',
                  fontWeight: 700,
                }}
              >
                {formatMoeda(calcularTotalFornecedor(forn.id))}
              </td>
            ))}
            <td />
          </tr>
        </tbody>
      </table>

      {/* Botão adicionar item */}
      <div
        className="border-t px-3 py-2"
        style={{ borderColor: 'var(--border-soft)' }}
      >
        <button
          type="button"
          onClick={onAdicionarItem}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <FontAwesomeIcon icon={faPlus} />
          Adicionar item
        </button>
      </div>
    </div>
  );
}

export default OrcamentoBuilderTable;
