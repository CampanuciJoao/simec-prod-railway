import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function formatMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function OrcamentoTabelaVisualizacao({ orcamento, calcularTotalFornecedor }) {
  const fornecedores = orcamento.fornecedores || [];
  const itens = orcamento.itens || [];
  const aprovadoId = orcamento.fornecedorAprovadoId || null;

  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-soft)' }}>
      <table className="w-full border-collapse text-sm">
        <thead>
          {/* Linha dos números e nomes */}
          <tr>
            <th
              rowSpan={2}
              className="border-b border-r px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider"
              style={{
                borderColor: 'var(--border-soft)',
                backgroundColor: 'var(--bg-surface-subtle)',
                color: 'var(--text-muted)',
                minWidth: 200,
              }}
            >
              DESCRIÇÃO
            </th>
            <th
              rowSpan={2}
              className="border-b border-r px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider"
              style={{
                borderColor: 'var(--border-soft)',
                backgroundColor: 'var(--bg-surface-subtle)',
                color: 'var(--text-muted)',
                minWidth: 100,
              }}
            >
              Data
            </th>
            {fornecedores.map((f, i) => {
              const isAprv = f.id === aprovadoId;
              return (
                <th
                  key={f.id}
                  className="border-b border-r px-3 py-1.5 text-center text-xs"
                  style={{
                    borderColor: 'var(--border-soft)',
                    backgroundColor: isAprv
                      ? 'color-mix(in srgb, #16a34a 10%, transparent)'
                      : 'var(--bg-surface-subtle)',
                    minWidth: 140,
                  }}
                >
                  <div
                    className="font-bold text-base flex items-center justify-center gap-1"
                    style={{ color: isAprv ? '#16a34a' : 'var(--text-primary)' }}
                  >
                    {isAprv && <FontAwesomeIcon icon={faCheck} className="text-xs" />}
                    {i + 1}
                  </div>
                  <div
                    className="font-semibold text-sm"
                    style={{ color: isAprv ? '#16a34a' : 'var(--text-secondary)' }}
                  >
                    {f.nome}
                  </div>
                </th>
              );
            })}
          </tr>
          {/* Linha de forma de pagamento */}
          <tr>
            {fornecedores.map((f) => {
              const isAprv = f.id === aprovadoId;
              return (
                <th
                  key={f.id}
                  className="border-b border-r px-3 py-1 text-center text-xs"
                  style={{
                    borderColor: 'var(--border-soft)',
                    backgroundColor: isAprv
                      ? 'color-mix(in srgb, #16a34a 10%, transparent)'
                      : 'var(--bg-surface-subtle)',
                    color: isAprv ? '#16a34a' : 'var(--text-muted)',
                  }}
                >
                  {f.formaPagamento || '—'}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {itens.map((item) => (
            <tr
              key={item.id}
              className="border-b"
              style={{
                borderColor: 'var(--border-soft)',
                backgroundColor: item.isDestaque ? 'var(--color-danger-soft)' : 'var(--bg-surface)',
              }}
            >
              <td
                className="border-r px-4 py-2 font-medium"
                style={{
                  borderColor: 'var(--border-soft)',
                  color: item.isDestaque ? 'var(--color-danger)' : 'var(--text-primary)',
                }}
              >
                {item.descricao}
              </td>
              <td
                className="border-r px-3 py-2 text-center"
                style={{ borderColor: 'var(--border-soft)', color: 'var(--text-secondary)' }}
              >
                {item.data ? new Date(item.data).toLocaleDateString('pt-BR') : '—'}
              </td>
              {fornecedores.map((forn) => {
                const isAprv = forn.id === aprovadoId;
                const preco = (item.precos || []).find((p) => p.fornecedorId === forn.id);
                const valor = preco ? Number(preco.valor || 0) : 0;
                const desconto = preco ? Number(preco.desconto || 0) : 0;
                const liquido = valor - desconto;

                return (
                  <td
                    key={forn.id}
                    className="border-r px-3 py-2 text-center"
                    style={{
                      borderColor: 'var(--border-soft)',
                      backgroundColor: isAprv
                        ? 'color-mix(in srgb, #16a34a 6%, transparent)'
                        : 'transparent',
                      color: item.isDestaque
                        ? 'var(--color-danger)'
                        : isAprv
                        ? '#16a34a'
                        : 'var(--text-primary)',
                    }}
                  >
                    {valor > 0 ? (
                      <div>
                        <span className="font-medium">{formatMoeda(liquido)}</span>
                        {desconto > 0 && (
                          <div className="text-xs" style={{ color: 'var(--color-danger)' }}>
                            - {formatMoeda(desconto)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}

          {/* Linha Valor Total */}
          <tr style={{ backgroundColor: 'var(--bg-surface-subtle)' }}>
            <td
              colSpan={2}
              className="border-r px-4 py-2 text-right font-bold"
              style={{ borderColor: 'var(--border-soft)', color: 'var(--text-primary)' }}
            >
              Valor Total
            </td>
            {fornecedores.map((forn) => {
              const isAprv = forn.id === aprovadoId;
              return (
                <td
                  key={forn.id}
                  className="border-r px-3 py-2 text-center font-bold text-base"
                  style={{
                    borderColor: 'var(--border-soft)',
                    backgroundColor: isAprv
                      ? 'color-mix(in srgb, #16a34a 10%, transparent)'
                      : 'transparent',
                    color: isAprv ? '#16a34a' : 'var(--color-danger)',
                  }}
                >
                  {formatMoeda(calcularTotalFornecedor(forn.id))}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default OrcamentoTabelaVisualizacao;
