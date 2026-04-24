import { PageLayout, PageState, ModalConfirmacao, GlobalFilterBar } from '@/components/ui';
import {
  OrcamentosPageHeader,
  OrcamentosKpiSection,
  OrcamentosListSection,
} from '@/components/orcamentos';
import { useOrcamentosPage } from '@/hooks/orcamentos/useOrcamentosPage';

const TIPO_OPTIONS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'PRODUTO', label: 'Produto' },
  { value: 'SERVICO', label: 'Serviço' },
  { value: 'MISTO', label: 'Misto' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'REJEITADO', label: 'Rejeitado' },
];

function OrcamentosPage() {
  const page = useOrcamentosPage();

  const isLoading = page.loading;
  const hasError = !!page.error;
  const isEmpty = !isLoading && !hasError && page.orcamentos.length === 0;

  return (
    <PageLayout padded>
      <div className="flex flex-col gap-5">
        <OrcamentosPageHeader onNovo={page.irParaNovo} />

        <OrcamentosKpiSection
          metricas={page.metricas}
          filtrarPorStatus={(s) => {
            page.setFiltroStatus(s);
            page.setBusca('');
          }}
          limparFiltro={() => {
            page.setFiltroStatus('');
            page.setFiltroTipo('');
            page.setBusca('');
          }}
        />

        <GlobalFilterBar
          searchTerm={page.busca}
          onSearchChange={(e) => page.setBusca(e.target.value)}
          searchPlaceholder="Buscar por título ou fornecedor..."
          selectFilters={[
            {
              id: 'status',
              label: 'Todos os status',
              value: page.filtroStatus,
              onChange: page.setFiltroStatus,
              options: STATUS_OPTIONS.filter((o) => o.value !== ''),
            },
            {
              id: 'tipo',
              label: 'Todos os tipos',
              value: page.filtroTipo,
              onChange: page.setFiltroTipo,
              options: TIPO_OPTIONS.filter((o) => o.value !== ''),
            },
          ]}
        />

        {isLoading || hasError || isEmpty ? (
          <PageState
            loading={isLoading}
            error={hasError ? page.error : null}
            empty={isEmpty}
            emptyTitle="Nenhum orçamento cadastrado"
            emptyDescription="Clique em 'Novo Orçamento' para começar."
          />
        ) : (
          <OrcamentosListSection
            orcamentos={page.orcamentos}
            onVerDetalhes={page.irParaDetalhes}
            onEditar={page.irParaEditar}
            onExcluir={(orc) => page.deleteModal.openModal(orc)}
          />
        )}

        <ModalConfirmacao
          isOpen={page.deleteModal.isOpen}
          onClose={page.deleteModal.closeModal}
          onConfirm={page.confirmarExclusao}
          title="Excluir orçamento"
          message={`Deseja excluir o orçamento "${page.deleteModal.modalData?.titulo}"? Esta ação não pode ser desfeita.`}
          isDestructive
        />
      </div>
    </PageLayout>
  );
}

export default OrcamentosPage;
