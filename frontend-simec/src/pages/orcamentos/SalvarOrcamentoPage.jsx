import {
  PageLayout,
  PageHeader,
  FormSection,
  FormActions,
  Input,
  Select,
  Textarea,
  LoadingState,
} from '@/components/ui';
import { faFileInvoiceDollar } from '@fortawesome/free-solid-svg-icons';
import { OrcamentoBuilderTable } from '@/components/orcamentos';
import { useSalvarOrcamento } from '@/hooks/orcamentos/useSalvarOrcamento';

const TIPO_OPTIONS = [
  { value: 'PRODUTO', label: 'Produto' },
  { value: 'SERVICO', label: 'Serviço' },
  { value: 'MISTO', label: 'Misto' },
];

function SalvarOrcamentoPage() {
  const p = useSalvarOrcamento();

  if (p.loadingData) {
    return <LoadingState />;
  }

  return (
    <PageLayout padded>
      <div className="flex flex-col gap-5">
        <PageHeader
          icon={faFileInvoiceDollar}
          title={p.isEditing ? 'Editar Orçamento' : 'Novo Orçamento'}
          subtitle="Preencha os dados e monte a tabela comparativa de fornecedores"
        />

        {/* ── Informações gerais ── */}
        <FormSection
          title="Informações Gerais"
          description="Identifique o orçamento e o tipo de itens"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2">
              <Input
                label="Título do Orçamento"
                required
                value={p.titulo}
                onChange={(e) => p.setTitulo(e.target.value)}
                error={p.errors.titulo}
                placeholder="Ex: Reboco muro estacionamento"
              />
            </div>

            <Select
              label="Tipo"
              required
              value={p.tipo}
              onChange={(e) => p.setTipo(e.target.value)}
              options={TIPO_OPTIONS}
            />

            <Input
              label="Local"
              value={p.local}
              onChange={(e) => p.setLocal(e.target.value)}
              placeholder="Ex: Sede, Santa Ana - Naviraí"
            />
          </div>
        </FormSection>

        {/* ── Tabela de itens e fornecedores ── */}
        <FormSection
          title="Itens e Fornecedores"
          description="Adicione fornecedores como colunas e itens como blocos. Use ★ para destacar itens em vermelho (ex: mão de obra)."
        >
          {p.errors.fornecedores && (
            <p className="mb-3 text-sm" style={{ color: 'var(--color-danger)' }}>
              {p.errors.fornecedores}
            </p>
          )}
          {p.errors.itens && (
            <p className="mb-3 text-sm" style={{ color: 'var(--color-danger)' }}>
              {p.errors.itens}
            </p>
          )}

          <OrcamentoBuilderTable
            fornecedores={p.fornecedores}
            itens={p.itens}
            precos={p.precos}
            onAtualizarFornecedor={p.atualizarFornecedor}
            onRemoverFornecedor={p.removerFornecedor}
            onAdicionarFornecedor={p.adicionarFornecedor}
            onAtualizarItem={p.atualizarItem}
            onRemoverItem={p.removerItem}
            onAdicionarItem={p.adicionarItem}
            onAtualizarPreco={p.atualizarPreco}
            calcularTotalFornecedor={p.calcularTotalFornecedor}
          />
        </FormSection>

        {/* ── Justificativa ── */}
        <FormSection
          title="Justificativa / Observação"
          description="Descreva o motivo do orçamento e detalhes importantes para a diretoria"
        >
          <Textarea
            label="Observação"
            value={p.observacao}
            onChange={(e) => p.setObservacao(e.target.value)}
            placeholder="Ex: Orçamento referente a fazer o reboco da parede do fundo do estacionamento..."
            rows={4}
          />
        </FormSection>

        <FormActions
          onCancel={p.cancelar}
          onSubmit={p.salvar}
          submitLabel={p.isEditing ? 'Salvar Alterações' : 'Criar Orçamento'}
          loading={p.loading}
        />
      </div>
    </PageLayout>
  );
}

export default SalvarOrcamentoPage;
