import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faExternalLinkAlt,
  faTrash,
  faFilePdf,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  PageSection,
  PageState,
  Select,
  Input,
  Badge,
  ModalConfirmacao,
  Textarea,
  GlobalFilterBar,
} from '@/components/ui';

import { useControleQualidadeGeral, diasParaVencimento } from '@/hooks/controleQualidade';
import ControleQualidadeKpiGrid from './ControleQualidadeKpiGrid';
import RegistrarTesteForm from './RegistrarTesteForm';

const RESULTADO_BADGES = {
  Aprovado:                { variant: 'green', label: 'Aprovado' },
  AprovadoComRestricoes:   { variant: 'yellow', label: 'Aprov. c/ restr.' },
  Reprovado:               { variant: 'red', label: 'Reprovado' },
};

// Prefixos do código do TipoTesteQualidade → categoria humanizada.
// Códigos seguem o padrão CQ_* (Controle de Qualidade) e LR_* (Levantamento
// Radiométrico) conforme catálogo simplificado em
// prisma/migrations/20260514000004_simplificar_catalogo_cq.
const CATEGORIA_LABELS = {
  CQ: 'Controle de Qualidade',
  LR: 'Levantamento Radiométrico',
};

function categoriaDoTipoTeste(tipoTeste) {
  if (!tipoTeste) return null;
  const codigo = tipoTeste.codigo || '';
  const prefixo = codigo.split('_')[0];
  if (CATEGORIA_LABELS[prefixo]) return CATEGORIA_LABELS[prefixo];
  const nome = tipoTeste.nome || '';
  const antesDoTraco = nome.split('—')[0].trim();
  return antesDoTraco || null;
}

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

function ControleQualidadeGeralTab() {
  const {
    loading,
    error,
    metricas,
    equipamentos,
    unidades,
    filtros,
    setFiltro,
    modalidades,
    activeKpi,
    testesFiltrados,
    handleSelectKpi,
    drawerOpen,
    drawerEquipamentoId,
    abrirDrawer,
    fecharDrawer,
    excluirModal,
    setExcluirModal,
    handleExcluir,
    pdfModal,
    setPdfModal,
    handleExportarPdf,
    recarregar,
  } = useControleQualidadeGeral();

  if (loading) {
    return <PageSection><PageState loading /></PageSection>;
  }

  if (error) {
    return <PageSection><PageState error={error} /></PageSection>;
  }

  return (
    <div className="space-y-6">
      <ControleQualidadeKpiGrid
        metricas={metricas}
        activeKpi={activeKpi}
        onSelectKpi={handleSelectKpi}
      />

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() => setPdfModal({ open: true, unidadeId: '', responsavel: '', exportando: false })}
          disabled={unidades.length === 0}
          title="Gera PDF de conformidade ANVISA RDC 611/2022 por unidade"
        >
          <FontAwesomeIcon icon={faFilePdf} />
          <span className="ml-2">Exportar PDF</span>
        </Button>
        <Button onClick={() => abrirDrawer(null)}>
          <FontAwesomeIcon icon={faPlus} />
          <span className="ml-2">Registrar CQ</span>
        </Button>
      </div>

      <GlobalFilterBar
        searchTerm={filtros.search}
        onSearchChange={(e) => setFiltro('search', e.target.value)}
        searchPlaceholder="Modelo, tag, laudo, responsável..."
        selectFilters={[
          {
            id: 'modalidade',
            label: 'Modalidade',
            value: filtros.modalidade,
            onChange: (v) => setFiltro('modalidade', v),
            options: modalidades.map((m) => ({ value: m, label: m })),
          },
          {
            id: 'resultado',
            label: 'Resultado',
            value: filtros.resultado,
            onChange: (v) => setFiltro('resultado', v),
            options: [
              { value: 'Aprovado', label: 'Aprovado' },
              { value: 'AprovadoComRestricoes', label: 'Aprov. c/ restrições' },
              { value: 'Reprovado', label: 'Reprovado' },
            ],
          },
          {
            id: 'statusVencimento',
            label: 'Vencimento',
            value: filtros.statusVencimento,
            onChange: (v) => setFiltro('statusVencimento', v),
            options: [
              { value: 'vencido', label: 'Vencido' },
              { value: 'vencendo', label: 'Vencendo (≤30d)' },
              { value: 'em_dia', label: 'Em dia' },
            ],
          },
        ]}
      />

      <PageSection title="Testes registrados">
        {testesFiltrados.length === 0 ? (
          <PageState
            isEmpty
            emptyMessage="Nenhum teste de qualidade encontrado com os filtros atuais."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }} className="text-left text-xs uppercase">
                  <th className="px-3 py-2">Equipamento</th>
                  <th className="px-3 py-2">Unidade</th>
                  <th className="px-3 py-2">Modalidade</th>
                  <th className="px-3 py-2">Tipo de teste</th>
                  <th className="px-3 py-2">Última execução</th>
                  <th className="px-3 py-2">Próx. vencimento</th>
                  <th className="px-3 py-2">Resultado</th>
                  <th className="px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {testesFiltrados.map((t) => {
                  const dias = diasParaVencimento(t.proximoVencimento);
                  const badge = RESULTADO_BADGES[t.resultado];
                  const eq = t.equipamento;
                  const nomePrincipal = eq?.apelido || eq?.modelo || '—';
                  const linhaSecundaria = [
                    eq?.apelido ? eq?.modelo : null,
                    eq?.tag,
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  const categoria = categoriaDoTipoTeste(t.tipoTeste);
                  return (
                    <tr key={t.id} style={{ borderTop: '1px solid var(--border-soft)' }}>
                      <td className="px-3 py-2">
                        <div className="font-semibold">{nomePrincipal}</div>
                        {linhaSecundaria ? (
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {linhaSecundaria}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{eq?.unidade?.nomeSistema || '—'}</td>
                      <td className="px-3 py-2">{t.tipoTeste?.modalidade || '—'}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{categoria || t.tipoTeste?.codigo || '—'}</div>
                      </td>
                      <td className="px-3 py-2">{fmt(t.dataExecucao)}</td>
                      <td className="px-3 py-2">
                        <span>{fmt(t.proximoVencimento)}</span>
                        {dias !== null ? (
                          <div
                            className="text-xs"
                            style={{
                              color:
                                dias < 0
                                  ? 'var(--color-danger)'
                                  : dias <= 30
                                  ? 'var(--color-warning)'
                                  : 'var(--text-muted)',
                            }}
                          >
                            {dias < 0
                              ? `Vencido há ${Math.abs(dias)}d`
                              : dias === 0
                              ? 'Vence hoje'
                              : `Em ${dias}d`}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : <Badge variant="slate">Pendente</Badge>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          {eq?.id ? (
                            <Link
                              to={`/equipamentos/detalhes/${eq.id}`}
                              state={{ tab: 'controleQualidade' }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded border"
                              style={{ borderColor: 'var(--border-soft)' }}
                              title="Abrir ficha do equipamento"
                            >
                              <FontAwesomeIcon icon={faExternalLinkAlt} className="text-xs" />
                            </Link>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setExcluirModal({ open: true, teste: t, motivo: '' })}
                            className="inline-flex h-8 w-8 items-center justify-center rounded border"
                            style={{ borderColor: 'var(--border-soft)', color: 'var(--color-danger)' }}
                            title="Excluir (com justificativa)"
                          >
                            <FontAwesomeIcon icon={faTrash} className="text-xs" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      <RegistrarTesteForm
        open={drawerOpen}
        onClose={fecharDrawer}
        equipamentos={equipamentos}
        equipamentoIdInicial={drawerEquipamentoId}
        onCreated={recarregar}
      />

      <ModalConfirmacao
        isOpen={pdfModal.open}
        onClose={() => setPdfModal({ open: false, unidadeId: '', responsavel: '', exportando: false })}
        onConfirm={handleExportarPdf}
        title="Exportar PDF de Conformidade ANVISA"
        message="O PDF consolida todos os equipamentos regulados da unidade selecionada (Mamografia, TC, RX, Densitometria, RM, US) com status de conformidade RDC 611/2022 e pendências abertas."
        confirmText={pdfModal.exportando ? 'Gerando...' : 'Gerar PDF'}
        confirmDisabled={!pdfModal.unidadeId || pdfModal.exportando}
      >
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Unidade *
            </label>
            <Select
              value={pdfModal.unidadeId}
              onChange={(e) => setPdfModal((s) => ({ ...s, unidadeId: e.target.value }))}
            >
              <option value="">Selecione a unidade...</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>{u.nomeSistema}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Responsável técnico (opcional)
            </label>
            <Input
              value={pdfModal.responsavel}
              onChange={(e) => setPdfModal((s) => ({ ...s, responsavel: e.target.value }))}
              placeholder="Nome e registro do físico médico responsável"
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Aparece acima da linha de assinatura no rodapé do PDF.
            </p>
          </div>
        </div>
      </ModalConfirmacao>

      <ModalConfirmacao
        isOpen={excluirModal.open}
        onClose={() => setExcluirModal({ open: false, teste: null, motivo: '' })}
        onConfirm={handleExcluir}
        title="Excluir teste de qualidade"
        message="Esta ação registra exclusão na auditoria com a justificativa abaixo. O laudo PDF permanece arquivado por 5 anos."
        isDestructive
        confirmDisabled={excluirModal.motivo.trim().length < 10}
        confirmText="Confirmar exclusão"
      >
        <div className="mt-3">
          <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Justificativa (mín. 10 caracteres) *
          </label>
          <Textarea
            rows={3}
            value={excluirModal.motivo}
            onChange={(e) => setExcluirModal((s) => ({ ...s, motivo: e.target.value }))}
            placeholder="Ex: PDF anexado ao equipamento errado, vou recadastrar."
          />
        </div>
      </ModalConfirmacao>
    </div>
  );
}

export default ControleQualidadeGeralTab;
