import { faPlus, faTrash, faStar } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function formatMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function InputValor({ value, onChange, isRed, placeholder = '0,00', prefix = 'R$' }) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition-colors focus-within:ring-2"
      style={{
        borderColor: isRed ? 'var(--color-danger)' : 'var(--border-default)',
        backgroundColor: 'var(--bg-input)',
        '--tw-ring-color': isRed ? 'var(--color-danger-soft)' : 'var(--brand-primary-soft)',
      }}
    >
      <span
        className="shrink-0 text-xs font-semibold"
        style={{ color: isRed ? 'var(--color-danger)' : 'var(--text-muted)' }}
      >
        {prefix}
      </span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent text-right text-sm focus:outline-none"
        style={{ color: isRed ? 'var(--color-danger)' : 'var(--text-primary)' }}
      />
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
  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--border-soft)' }}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">

          {/* ── Cabeçalho ── */}
          <thead>
            <tr>
              {/* Coluna descrição */}
              <th
                className="border-b border-r px-4 py-3 text-left align-bottom"
                style={{
                  borderColor: 'var(--border-soft)',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  minWidth: 240,
                  width: '30%',
                }}
              >
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Descrição / Data
                </span>
              </th>

              {/* Colunas de fornecedor */}
              {fornecedores.map((forn, idx) => (
                <th
                  key={forn.id}
                  className="border-b border-r px-3 py-3 text-center"
                  style={{
                    borderColor: 'var(--border-soft)',
                    backgroundColor: 'var(--bg-surface-subtle)',
                    minWidth: 200,
                  }}
                >
                  {/* número da coluna + delete */}
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: 'var(--brand-primary-soft)',
                        color: 'var(--brand-primary)',
                      }}
                    >
                      {idx + 1}
                    </span>
                    {fornecedores.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemoverFornecedor(forn.id)}
                        className="rounded-lg p-1 transition-opacity hover:opacity-100 opacity-50"
                        style={{ color: 'var(--color-danger)' }}
                        title="Remover fornecedor"
                      >
                        <FontAwesomeIcon icon={faTrash} className="text-xs" />
                      </button>
                    )}
                  </div>

                  {/* Nome */}
                  <input
                    type="text"
                    value={forn.nome}
                    onChange={(e) => onAtualizarFornecedor(forn.id, 'nome', e.target.value)}
                    placeholder="Nome do fornecedor"
                    className="mb-1.5 w-full rounded-lg border px-2.5 py-1.5 text-center text-sm font-semibold focus:outline-none focus:ring-2"
                    style={{
                      borderColor: 'var(--border-default)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                    }}
                  />

                  {/* Forma de pagamento */}
                  <input
                    type="text"
                    value={forn.formaPagamento || ''}
                    onChange={(e) => onAtualizarFornecedor(forn.id, 'formaPagamento', e.target.value)}
                    placeholder="Forma de pagamento"
                    className="w-full rounded-lg border px-2.5 py-1 text-center text-xs focus:outline-none"
                    style={{
                      borderColor: 'var(--border-default)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  />
                </th>
              ))}

              {/* Botão adicionar fornecedor */}
              <th
                className="border-b px-3 py-3 align-bottom"
                style={{
                  borderColor: 'var(--border-soft)',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  minWidth: 120,
                }}
              >
                <button
                  type="button"
                  onClick={onAdicionarFornecedor}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: 'var(--brand-primary-soft)',
                    color: 'var(--brand-primary)',
                  }}
                >
                  <FontAwesomeIcon icon={faPlus} />
                  Fornecedor
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {itens.map((item, itemIdx) => (
              <tr
                key={item.id}
                className="border-b transition-colors"
                style={{
                  borderColor: 'var(--border-soft)',
                  backgroundColor: item.isDestaque
                    ? 'color-mix(in srgb, var(--color-danger) 6%, transparent)'
                    : itemIdx % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-subtle)',
                }}
              >
                {/* Célula descrição */}
                <td className="border-r px-3 py-3" style={{ borderColor: 'var(--border-soft)' }}>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.descricao}
                        onChange={(e) => onAtualizarItem(item.id, 'descricao', e.target.value)}
                        placeholder="Descrição do item"
                        className="flex-1 rounded-lg border px-2.5 py-1.5 text-sm font-medium focus:outline-none focus:ring-2"
                        style={{
                          borderColor: item.isDestaque ? 'var(--color-danger)' : 'var(--border-default)',
                          backgroundColor: 'var(--bg-input)',
                          color: item.isDestaque ? 'var(--color-danger)' : 'var(--text-primary)',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => onAtualizarItem(item.id, 'isDestaque', !item.isDestaque)}
                        className="rounded-lg p-1.5 transition-colors"
                        style={{
                          color: item.isDestaque ? 'var(--color-danger)' : 'var(--text-muted)',
                          backgroundColor: item.isDestaque ? 'var(--color-danger-soft)' : 'transparent',
                        }}
                        title={item.isDestaque ? 'Remover destaque' : 'Destacar em vermelho'}
                      >
                        <FontAwesomeIcon icon={faStar} className="text-xs" />
                      </button>
                      {itens.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoverItem(item.id)}
                          className="rounded-lg p-1.5 opacity-40 transition-opacity hover:opacity-100"
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
                      className="w-36 rounded-lg border px-2 py-1 text-xs focus:outline-none"
                      style={{
                        borderColor: 'var(--border-default)',
                        backgroundColor: 'var(--bg-surface-subtle)',
                        color: 'var(--text-secondary)',
                      }}
                    />
                  </div>
                </td>

                {/* Preços por fornecedor */}
                {fornecedores.map((forn) => {
                  const key = `${item.id}_${forn.id}`;
                  const p = precos[key] || { valor: 0, desconto: 0 };
                  return (
                    <td
                      key={forn.id}
                      className="border-r px-3 py-3"
                      style={{ borderColor: 'var(--border-soft)' }}
                    >
                      <div className="flex flex-col gap-1.5">
                        <InputValor
                          value={p.valor}
                          onChange={(val) => onAtualizarPreco(item.id, forn.id, 'valor', val)}
                          isRed={item.isDestaque}
                        />
                        <InputValor
                          value={p.desconto}
                          onChange={(val) => onAtualizarPreco(item.id, forn.id, 'desconto', val)}
                          isRed
                          prefix="Desc"
                          placeholder="0,00"
                        />
                      </div>
                    </td>
                  );
                })}

                <td />
              </tr>
            ))}

            {/* Linha VALOR TOTAL */}
            <tr>
              <td
                className="border-r px-4 py-3 text-right font-bold"
                style={{
                  borderColor: 'var(--border-soft)',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                Valor Total
              </td>
              {fornecedores.map((forn) => {
                const total = calcularTotalFornecedor(forn.id);
                return (
                  <td
                    key={forn.id}
                    className="border-r px-4 py-3 text-right"
                    style={{
                      borderColor: 'var(--border-soft)',
                      backgroundColor: 'color-mix(in srgb, var(--color-danger) 8%, var(--bg-surface-subtle))',
                      color: 'var(--color-danger)',
                      fontWeight: 700,
                      fontSize: '1rem',
                    }}
                  >
                    {formatMoeda(total)}
                  </td>
                );
              })}
              <td style={{ backgroundColor: 'var(--bg-surface-subtle)' }} />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Botão adicionar item */}
      <div
        className="flex items-center gap-2 border-t px-4 py-3"
        style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-subtle)' }}
      >
        <button
          type="button"
          onClick={onAdicionarItem}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
          style={{
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-default)',
          }}
        >
          <FontAwesomeIcon icon={faPlus} className="text-xs" style={{ color: 'var(--brand-primary)' }} />
          Adicionar item
        </button>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Use ★ para destacar itens em vermelho
        </span>
      </div>
    </div>
  );
}

export default OrcamentoBuilderTable;
