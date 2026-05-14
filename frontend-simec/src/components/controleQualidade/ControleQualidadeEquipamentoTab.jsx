import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faRotateRight,
  faTrash,
  faPaperclip,
  faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  PageSection,
  PageState,
  Badge,
  Textarea,
  ModalConfirmacao,
} from '@/components/ui';

import {
  listarTestesPorEquipamento,
  excluirTesteCq,
  atualizarPendenciaCq,
} from '@/services/api';

import ProgramaCard from './ProgramaCard';
import RegistrarTesteForm from './RegistrarTesteForm';

const RESULTADO_BADGES = {
  Aprovado:                { variant: 'green', label: 'Aprovado' },
  AprovadoComRestricoes:   { variant: 'yellow', label: 'Aprovado c/ restrições' },
  Reprovado:               { variant: 'red', label: 'Reprovado' },
};

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

function diasParaVencimento(data) {
  if (!data) return null;
  return Math.ceil((new Date(data).getTime() - Date.now()) / 86_400_000);
}

function calcularStatusEquipamento(grupos) {
  let pior = 'ok';
  for (const g of grupos) {
    const t = g.atual;
    if (t.resultado === 'Reprovado') return 'reprovado';
    if (t.proximoVencimento) {
      const dias = diasParaVencimento(t.proximoVencimento);
      if (dias !== null && dias < 0 && pior !== 'reprovado') pior = 'vencido';
      else if (dias !== null && dias <= 30 && pior === 'ok') pior = 'vencendo';
    }
    if (Array.isArray(t.pendenciasAcao) && t.pendenciasAcao.some((p) => !p.resolvido) && pior === 'ok') {
      pior = 'pendencias_abertas';
    }
  }
  return pior;
}

const STATUS_HEADER = {
  reprovado: { bg: 'var(--color-danger-soft)', fg: 'var(--color-danger)', label: 'Reprovação ativa' },
  vencido: { bg: 'var(--color-danger-soft)', fg: 'var(--color-danger)', label: 'Teste vencido' },
  vencendo: { bg: 'var(--color-warning-soft)', fg: 'var(--color-warning)', label: 'Vencimento próximo' },
  pendencias_abertas: { bg: 'var(--color-warning-soft)', fg: 'var(--color-warning)', label: 'Pendências abertas' },
};

function ControleQualidadeEquipamentoTab({ equipamento }) {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [testeBase, setTesteBase] = useState(null);
  const [excluirModal, setExcluirModal] = useState({ open: false, teste: null, motivo: '' });

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listarTestesPorEquipamento(equipamento.id);
      setGrupos(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Erro ao carregar testes.');
    } finally {
      setLoading(false);
    }
  }, [equipamento.id]);

  useEffect(() => { carregar(); }, [carregar]);

  const status = calcularStatusEquipamento(grupos);
  const headerInfo = STATUS_HEADER[status];

  const handleTogglePendencia = async (testeId, indice, atual) => {
    try {
      await atualizarPendenciaCq(testeId, indice, { resolvido: !atual });
      carregar();
    } catch (e) {
      alert(e?.response?.data?.message || 'Erro ao atualizar pendência.');
    }
  };

  const handleExcluir = async () => {
    const teste = excluirModal.teste;
    const motivo = excluirModal.motivo.trim();
    if (!teste || motivo.length < 10) return;
    try {
      await excluirTesteCq(teste.id, motivo);
      setExcluirModal({ open: false, teste: null, motivo: '' });
      carregar();
    } catch (e) {
      alert(e?.response?.data?.message || 'Erro ao excluir.');
    }
  };

  if (loading) {
    return <PageSection><PageState loading /></PageSection>;
  }

  if (error) {
    return <PageSection><PageState error={error} /></PageSection>;
  }

  const semPrograma = grupos.length === 0;

  return (
    <div className="space-y-4">
      {headerInfo ? (
        <div
          className="rounded-2xl px-4 py-3 text-sm font-semibold"
          style={{ backgroundColor: headerInfo.bg, color: headerInfo.fg }}
        >
          {headerInfo.label}
        </div>
      ) : null}

      {semPrograma ? (
        <ProgramaCard
          equipamentoId={equipamento.id}
          equipamentoTipo={equipamento.tipo}
          onAtivado={() => carregar()}
        />
      ) : (
        <PageSection>
          <div className="flex justify-end">
            <Button onClick={() => { setTesteBase(null); setDrawerOpen(true); }}>
              <FontAwesomeIcon icon={faPlus} />
              <span className="ml-2">Registrar nova execução</span>
            </Button>
          </div>
        </PageSection>
      )}

      {grupos.map((g) => {
        const atual = g.atual;
        const dias = diasParaVencimento(atual.proximoVencimento);
        const badge = RESULTADO_BADGES[atual.resultado];
        const pendencias = Array.isArray(atual.pendenciasAcao) ? atual.pendenciasAcao : [];
        const pendenciasAbertas = pendencias.filter((p) => !p.resolvido).length;

        return (
          <PageSection key={g.tipoTeste.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {g.tipoTeste.nome}
                </h4>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {g.tipoTeste.codigo} · {g.tipoTeste.modalidade}
                  {g.tipoTeste.normaReferencia ? ` · ${g.tipoTeste.normaReferencia}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { setTesteBase(atual); setDrawerOpen(true); }}
                >
                  <FontAwesomeIcon icon={faRotateRight} />
                  <span className="ml-2">Renovar</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setExcluirModal({ open: true, teste: atual, motivo: '' })}
                  className="inline-flex h-8 w-8 items-center justify-center rounded border"
                  style={{ borderColor: 'var(--border-soft)', color: 'var(--color-danger)' }}
                  title="Excluir (com justificativa)"
                >
                  <FontAwesomeIcon icon={faTrash} className="text-xs" />
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Info label="Última execução" value={fmt(atual.dataExecucao)} />
              <Info
                label="Próximo vencimento"
                value={
                  <span>
                    {fmt(atual.proximoVencimento)}
                    {dias !== null ? (
                      <span
                        className="ml-2 text-xs"
                        style={{
                          color:
                            dias < 0
                              ? 'var(--color-danger)'
                              : dias <= 30
                              ? 'var(--color-warning)'
                              : 'var(--text-muted)',
                        }}
                      >
                        ({dias < 0 ? `vencido há ${Math.abs(dias)}d` : `em ${dias}d`})
                      </span>
                    ) : null}
                  </span>
                }
              />
              <Info
                label="Resultado"
                value={badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : '—'}
              />
            </div>

            {atual.numeroLaudo || atual.empresaExecutora || atual.responsavelNome ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-3 text-sm">
                {atual.numeroLaudo ? <Info label="Nº laudo" value={atual.numeroLaudo} /> : null}
                {atual.empresaExecutora ? <Info label="Empresa" value={atual.empresaExecutora} /> : null}
                {atual.responsavelNome ? (
                  <Info
                    label="Responsável"
                    value={`${atual.responsavelNome}${atual.responsavelRegistro ? ` (${atual.responsavelRegistro})` : ''}`}
                  />
                ) : null}
              </div>
            ) : null}

            {pendencias.length > 0 ? (
              <div
                className="mt-3 rounded-xl px-3 py-2"
                style={{ backgroundColor: 'var(--bg-surface-soft)' }}
              >
                <p className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
                  Pendências do laudo · {pendenciasAbertas} aberta(s) / {pendencias.length}
                </p>
                <ul className="mt-2 space-y-1">
                  {pendencias.map((p, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!p.resolvido}
                        onChange={() => handleTogglePendencia(atual.id, idx, p.resolvido)}
                        className="mt-0.5"
                      />
                      <span
                        className={p.resolvido ? 'line-through' : ''}
                        style={{ color: p.resolvido ? 'var(--text-muted)' : 'var(--text-primary)' }}
                      >
                        {p.descricao}
                        {p.resolvido && p.dataResolucao ? (
                          <span className="ml-2 text-xs">
                            (resolvida em {fmt(p.dataResolucao)})
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {Array.isArray(atual.anexos) && atual.anexos.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
                  Anexos
                </p>
                <ul className="mt-1 space-y-1 text-sm">
                  {atual.anexos.map((a) => (
                    <li key={a.id} className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faPaperclip} className="text-xs" />
                      <a
                        href={`/api/uploads/${a.id}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--brand-primary)' }}
                      >
                        {a.nomeOriginal}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {g.historico && g.historico.length > 0 ? (
              <details className="mt-3 text-sm">
                <summary
                  className="cursor-pointer font-semibold"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Histórico ({g.historico.length})
                </summary>
                <ul className="mt-2 space-y-1">
                  {g.historico.map((h) => (
                    <li key={h.id} style={{ color: 'var(--text-muted)' }}>
                      <FontAwesomeIcon icon={faCheckCircle} className="mr-2 text-xs" />
                      {fmt(h.dataExecucao)} — {h.resultado || 'Pendente'}
                      {h.proximoVencimento ? ` · vencia ${fmt(h.proximoVencimento)}` : ''}
                      {h.numeroLaudo ? ` · ${h.numeroLaudo}` : ''}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </PageSection>
        );
      })}

      <RegistrarTesteForm
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        equipamentos={[equipamento]}
        equipamentoIdInicial={equipamento.id}
        modalidadeInicial={equipamento.tipo}
        testeBase={testeBase}
        onCreated={() => carregar()}
      />

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

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{value || '—'}</p>
    </div>
  );
}

ControleQualidadeEquipamentoTab.propTypes = {
  equipamento: PropTypes.shape({
    id: PropTypes.string.isRequired,
    tipo: PropTypes.string,
  }).isRequired,
};

export default ControleQualidadeEquipamentoTab;
