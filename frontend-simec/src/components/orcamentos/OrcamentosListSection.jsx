import { Card, InlineEmptyState } from '@/components/ui';
import OrcamentoRow from './OrcamentoRow';

function OrcamentosListSection({ orcamentos, onVerDetalhes, onEditar, onExcluir }) {
  if (orcamentos.length === 0) {
    return (
      <InlineEmptyState
        title="Nenhum orçamento encontrado"
        description="Crie seu primeiro orçamento clicando em 'Novo Orçamento'."
      />
    );
  }

  return (
    <Card className="overflow-hidden rounded-3xl" padded={false}>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr
              className="border-b text-xs font-semibold uppercase tracking-wider"
              style={{
                borderColor: 'var(--border-soft)',
                backgroundColor: 'var(--bg-surface-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Fornecedores</th>
              <th className="px-4 py-3">Criado por</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {orcamentos.map((orc) => (
              <OrcamentoRow
                key={orc.id}
                orcamento={orc}
                onVerDetalhes={onVerDetalhes}
                onEditar={onEditar}
                onExcluir={onExcluir}
              />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default OrcamentosListSection;
