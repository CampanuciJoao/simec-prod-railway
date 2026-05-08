import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowsRotate,
  faCircleCheck,
  faCircleExclamation,
  faCircleXmark,
  faHeartPulse,
  faKey,
  faLink,
  faLinkSlash,
  faPenToSquare,
  faRotate,
  faSpinner,
  faTrash,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  InfoCard,
  InlineEmptyState,
  LoadingState,
  PageSection,
  ResponsiveGrid,
} from '@/components/ui';
import { formatarDataHora } from '@/utils/timeUtils';
import { useIntegracoesGehc } from '@/hooks/gerenciamento/useIntegracoesGehc';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ResultBanner({ result, nomeAcao }) {
  if (!result) return null;
  const cor    = result.ok ? 'var(--color-success)' : 'var(--color-danger)';
  const icon   = result.ok ? faCircleCheck : faCircleXmark;
  const titulo = result.ok ? `${nomeAcao} concluído` : `Erro em ${nomeAcao.toLowerCase()}`;

  return (
    <div
      className="flex items-start gap-3 rounded-2xl border px-4 py-3"
      style={{ borderColor: cor, backgroundColor: 'var(--bg-surface-soft)' }}
    >
      <FontAwesomeIcon icon={icon} className="mt-0.5 shrink-0" style={{ color: cor }} />
      <div className="min-w-0 text-sm" style={{ color: 'var(--text-primary)' }}>
        <p className="font-semibold">{titulo}</p>
        {result.error && <p className="mt-0.5" style={{ color: 'var(--text-muted)' }}>{result.error}</p>}
        {result.ok && result.vinculados !== undefined && (
          <p className="mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {result.vinculados} vinculado(s) exatos
            {result.pendentesConfirmacao > 0 && ` · ${result.pendentesConfirmacao} fuzzy (aguardam confirmação)`}
            {' · '}{result.jaVinculados} já vinculado(s) · {result.semMatch} sem match
            {result.modo && <span> · via {result.modo === 'graphql' ? 'API GraphQL' : 'Playwright'}</span>}
          </p>
        )}
        {result.ok && result.total !== undefined && result.vinculados === undefined && (
          <p className="mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {result.total} equipamento(s) sincronizado(s)
          </p>
        )}
        {result.ok && result.mensagem && (
          <p className="mt-0.5" style={{ color: 'var(--text-muted)' }}>{result.mensagem}</p>
        )}
      </div>
    </div>
  );
}

// ─── Formulário de credenciais ────────────────────────────────────────────────

function FormCredenciais({ running, onSalvar }) {
  const [login, setLogin]       = useState('');
  const [password, setPassword] = useState('');

  const inputStyle = {
    borderColor: 'var(--border-soft)',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Informe as credenciais da conta do seu hospital no portal GE Healthcare (gehealthcare.com.br).
        Elas serão armazenadas criptografadas e usadas exclusivamente para esta integração.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            E-mail / Login GE
          </label>
          <input
            type="email"
            autoComplete="off"
            placeholder="usuario@hospital.com.br"
            value={login}
            onChange={e => setLogin(e.target.value)}
            className="w-full rounded-xl border px-3 py-2 text-sm"
            style={inputStyle}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Senha
          </label>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full rounded-xl border px-3 py-2 text-sm"
            style={inputStyle}
          />
        </div>
      </div>
      <Button
        type="button"
        variant="primary"
        disabled={!login.trim() || !password.trim() || running}
        onClick={() => onSalvar(login.trim(), password.trim())}
      >
        <FontAwesomeIcon icon={running ? faSpinner : faKey} spin={running} />
        {running ? 'Salvando...' : 'Salvar credenciais'}
      </Button>
    </div>
  );
}

// ─── Seção: credenciais configuradas ─────────────────────────────────────────

function CredenciaisStatus({ configurado, capturedAt, expiresAt, running, onEditar, onRemover, onAtualizar }) {
  if (!configurado) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-success)' }}>
          <FontAwesomeIcon icon={faCircleCheck} />
          <span className="font-medium">Credenciais configuradas</span>
        </div>
        {capturedAt ? (
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            Autenticado · capturado {formatarDataHora(capturedAt)}
            {expiresAt && ` · expira ${formatarDataHora(expiresAt)}`}
          </p>
        ) : (
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            Tokens ainda não capturados — clique em "Vincular equipamentos" para autenticar automaticamente.
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" disabled={running} onClick={onAtualizar}>
          <FontAwesomeIcon icon={faArrowsRotate} />
          Atualizar
        </Button>
        <Button type="button" variant="secondary" disabled={running} onClick={onEditar}>
          <FontAwesomeIcon icon={faPenToSquare} />
          Editar
        </Button>
        <Button type="button" variant="danger" disabled={running} onClick={onRemover}>
          <FontAwesomeIcon icon={running ? faSpinner : faTrash} spin={running} />
          Remover
        </Button>
      </div>
    </div>
  );
}

// ─── Seção: pendentes de confirmação (fuzzy) ──────────────────────────────────

function PendentesConfirmacao({ lista, vincularState, onConfirmar, onRejeitar }) {
  if (!lista?.length) return null;
  return (
    <div className="space-y-2">
      {lista.map((eq) => {
        const state = vincularState[eq.simecId] ?? {};
        return (
          <div
            key={eq.simecId}
            className="rounded-2xl border px-4 py-3"
            style={{ borderColor: 'var(--color-warning)', backgroundColor: 'var(--bg-surface-soft)' }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faTriangleExclamation} style={{ color: 'var(--color-warning)' }} className="shrink-0" />
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{eq.tag}</p>
                </div>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Serial GE: <strong>{eq.serialGe ?? eq.gehcAssetId}</strong>
                  {' · '}Modelo GE: {eq.modelo ?? '—'}
                  {' · '}Distância: {eq.distancia}
                </p>
                {state.error && <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{state.error}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button type="button" variant="primary" disabled={state.running} onClick={() => onConfirmar(eq.simecId, eq.gehcAssetId)}>
                  <FontAwesomeIcon icon={state.running ? faSpinner : faCircleCheck} spin={state.running} />
                  Confirmar
                </Button>
                <Button type="button" variant="danger" disabled={state.running} onClick={() => onRejeitar(eq.simecId)}>
                  <FontAwesomeIcon icon={faLinkSlash} />
                  Rejeitar
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Seção: equipamentos sem match ────────────────────────────────────────────

function ListaSemVinculo({ lista, vincularState, onVincular }) {
  const [inputs, setInputs] = useState({});

  if (!lista?.length) return <InlineEmptyState message="Todos os equipamentos GE estão vinculados." />;

  return (
    <div className="space-y-2">
      {lista.map((eq) => {
        const id    = eq.simecId ?? eq.id;
        const state = vincularState[id] ?? {};
        const assetId = inputs[id] ?? '';
        return (
          <div key={id} className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{eq.apelido || eq.tag}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tag: {eq.tag} · {eq.modelo || 'modelo não informado'}</p>
              </div>
              <FontAwesomeIcon icon={faLinkSlash} style={{ color: 'var(--color-warning)' }} />
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                placeholder="Asset ID do portal GE"
                value={assetId}
                onChange={e => setInputs(s => ({ ...s, [id]: e.target.value }))}
                className="flex-1 rounded-xl border px-3 py-1.5 text-sm"
                style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              />
              <Button type="button" variant="secondary" disabled={!assetId.trim() || state.running} onClick={() => onVincular(id, assetId.trim())}>
                <FontAwesomeIcon icon={state.running ? faSpinner : faLink} spin={state.running} />
                Vincular
              </Button>
            </div>
            {state.error && <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{state.error}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Seção: equipamentos já vinculados ────────────────────────────────────────

function ListaVinculados({ lista, vincularState, onDesvincular }) {
  if (!lista?.length) return <InlineEmptyState message="Nenhum equipamento vinculado ainda." />;
  return (
    <div className="space-y-2">
      {lista.map((eq) => {
        const state = vincularState[eq.simecId] ?? {};
        return (
          <div key={eq.simecId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{eq.tag}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Asset ID: {eq.gehcAssetId}</p>
              {state.error && <p className="mt-0.5 text-xs" style={{ color: 'var(--color-danger)' }}>{state.error}</p>}
            </div>
            <Button type="button" variant="ghost" disabled={state.running} onClick={() => onDesvincular(eq.simecId)}>
              <FontAwesomeIcon icon={state.running ? faSpinner : faLinkSlash} spin={state.running} />
              Desvincular
            </Button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Seção: últimos snapshots ─────────────────────────────────────────────────

function UltimosSnapshots({ snapshots }) {
  if (!snapshots?.length) return <InlineEmptyState message="Nenhum snapshot capturado ainda." />;
  return (
    <div className="space-y-2">
      {snapshots.map((s, i) => (
        <div key={i} className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.equipamento}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatarDataHora(s.capturedAt)}</p>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            {s.heliumLevelPct != null && (
              <span style={{ color: s.heliumLevelPct < 30 ? 'var(--color-danger)' : s.heliumLevelPct < 70 ? 'var(--color-warning)' : 'var(--color-success)', fontWeight: 600 }}>
                Hélio: {s.heliumLevelPct}%
              </span>
            )}
            {s.heliumPressurePsi != null && <span>Pressão: {s.heliumPressurePsi} PSI</span>}
            {s.compressorStatus && <span>Compressor: {s.compressorStatus}</span>}
            {s.coolantTempC != null && <span>Temp: {s.coolantTempC}°C</span>}
            <span style={{ color: s.equipmentOnline ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {s.equipmentOnline === true ? 'Online' : s.equipmentOnline === false ? 'Offline' : ''}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

function IntegracoesPage() {
  const {
    status, loading, error, carregarStatus,
    salvarCredenciais, excluirCredenciais, runningCredenciais, resultCredenciais,
    rodarDiscovery, runningDiscovery, resultDiscovery,
    rodarSync,      runningSync,      resultSync,
    rodarMonitor,   runningMonitor,   resultMonitor,
    vincularEquipamento, desvincularEquipamento, vincularState,
  } = useIntegracoesGehc();

  const [editandoCredenciais, setEditandoCredenciais] = useState(false);

  if (loading) return <LoadingState message="Carregando status da integração GE..." />;

  if (error && !status) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border px-4 py-4" style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}>
        <FontAwesomeIcon icon={faCircleExclamation} className="mt-0.5" style={{ color: 'var(--color-warning)' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Não foi possível carregar o status</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{error}</p>
        </div>
      </div>
    );
  }

  const anyRunning  = runningDiscovery || runningSync || runningMonitor;
  const credConfiguradas = status?.credenciais?.configurado;
  const mostrarForm = !credConfiguradas || editandoCredenciais;

  const pendentesConfirmacao = resultDiscovery?.ok ? (resultDiscovery.detalhes?.pendentesConfirmacao ?? []) : [];
  const semMatchDiscovery    = resultDiscovery?.ok ? (resultDiscovery.detalhes?.semMatch ?? []) : [];
  const jaVinculados         = resultDiscovery?.ok ? (resultDiscovery.detalhes?.jaVinculados ?? []) : [];
  const semVinculoLista      = status?.rmsSeVinculo ?? [];

  return (
    <div className="space-y-6">

      {/* ── KPIs ── */}
      <ResponsiveGrid cols={{ base: 1, md: 2, xl: 4 }}>
        <InfoCard icon={faHeartPulse} label="RMs GE cadastradas"    value={status?.rmsGe?.total ?? 0} />
        <InfoCard icon={faLink}       label="Vinculadas ao portal GE" value={status?.rmsGe?.vinculadas ?? 0} />
        <InfoCard icon={faLinkSlash}  label="Sem vínculo"             value={status?.rmsGe?.semVinculo ?? 0} />
        <InfoCard icon={faHeartPulse} label="Alertas ativos (GE)"    value={status?.alertasAtivos ?? 0} />
      </ResponsiveGrid>

      {/* ── Credenciais e ações ── */}
      <PageSection
        title="GE Health Cloud"
        description="Gerencie a conexão com o portal MyEquipment 360 da GE Healthcare."
      >
        <div className="space-y-4">

          {/* Credenciais */}
          <div className="rounded-2xl border px-4 py-4 space-y-3" style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Credenciais do portal GE
            </p>

            {mostrarForm ? (
              <>
                <FormCredenciais
                  running={runningCredenciais}
                  onSalvar={async (l, p) => {
                    await salvarCredenciais(l, p);
                    setEditandoCredenciais(false);
                  }}
                />
                {editandoCredenciais && (
                  <Button type="button" variant="ghost" onClick={() => setEditandoCredenciais(false)}>
                    Cancelar
                  </Button>
                )}
              </>
            ) : (
              <CredenciaisStatus
                configurado={credConfiguradas}
                capturedAt={status?.auth?.capturedAt}
                expiresAt={status?.auth?.expiresAt}
                running={runningCredenciais}
                onEditar={() => setEditandoCredenciais(true)}
                onRemover={excluirCredenciais}
                onAtualizar={carregarStatus}
              />
            )}

            <ResultBanner result={resultCredenciais} nomeAcao="Credenciais" />
          </div>

          {/* Botões de ação — só aparecem se credenciais estiverem configuradas */}
          {credConfiguradas && (
            <>
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="primary" onClick={rodarDiscovery} disabled={anyRunning}>
                  <FontAwesomeIcon icon={runningDiscovery ? faSpinner : faLink} spin={runningDiscovery} />
                  {runningDiscovery ? 'Vinculando...' : 'Vincular equipamentos'}
                </Button>
                <Button type="button" variant="secondary" onClick={rodarSync} disabled={anyRunning}>
                  <FontAwesomeIcon icon={runningSync ? faSpinner : faRotate} spin={runningSync} />
                  {runningSync ? 'Sincronizando...' : 'Sincronizar dados'}
                </Button>
                <Button type="button" variant="secondary" onClick={rodarMonitor} disabled={anyRunning}>
                  <FontAwesomeIcon icon={runningMonitor ? faSpinner : faHeartPulse} spin={runningMonitor} />
                  {runningMonitor ? 'Capturando...' : 'Capturar saúde agora'}
                </Button>
              </div>

              <div className="rounded-2xl px-4 py-2 text-xs" style={{ backgroundColor: 'var(--bg-surface-soft)', color: 'var(--text-muted)' }}>
                <strong>Vincular equipamentos</strong> — conecta as RMs GE do SIMEC ao portal MyEquipment 360 por número de série.
                {' '}<strong>Sincronizar dados</strong> — importa contratos, histórico de OS e utilização mensal.
                {' '}<strong>Capturar saúde</strong> — força leitura imediata de hélio, pressão e compressor (automático a cada 2h).
              </div>

              <ResultBanner result={resultDiscovery} nomeAcao="Discovery" />
              <ResultBanner result={resultSync}      nomeAcao="Sync" />
              <ResultBanner result={resultMonitor}   nomeAcao="Monitoramento" />
            </>
          )}
        </div>
      </PageSection>

      {/* ── Pendentes de confirmação (fuzzy) ── */}
      {pendentesConfirmacao.length > 0 && (
        <PageSection
          title={`Correspondências para confirmar (${pendentesConfirmacao.length})`}
          description="O discovery encontrou estes equipamentos por similaridade de serial (fuzzy). Confirme se o vínculo está correto ou rejeite para desvincular."
        >
          <PendentesConfirmacao
            lista={pendentesConfirmacao}
            vincularState={vincularState}
            onConfirmar={(id, assetId) => vincularEquipamento(id, assetId)}
            onRejeitar={(id) => desvincularEquipamento(id)}
          />
        </PageSection>
      )}

      {/* ── Sem match: vinculação manual ── */}
      {(semMatchDiscovery.length > 0 || semVinculoLista.length > 0) && (
        <PageSection
          title={`Equipamentos sem vínculo (${semVinculoLista.length || semMatchDiscovery.length})`}
          description="RMs GE cadastradas no SIMEC que não foram localizadas no portal. Informe o Asset ID manualmente para vincular."
        >
          <ListaSemVinculo
            lista={semVinculoLista.length ? semVinculoLista : semMatchDiscovery}
            vincularState={vincularState}
            onVincular={(id, assetId) => vincularEquipamento(id, assetId)}
          />
        </PageSection>
      )}

      {/* ── Equipamentos já vinculados (gerenciar) ── */}
      {jaVinculados.length > 0 && (
        <PageSection
          title={`Equipamentos vinculados (${jaVinculados.length})`}
          description="Equipamentos já conectados ao portal GE. Você pode desvincular caso precise corrigir o Asset ID."
        >
          <ListaVinculados
            lista={jaVinculados}
            vincularState={vincularState}
            onDesvincular={(id) => desvincularEquipamento(id)}
          />
        </PageSection>
      )}

      {/* ── Últimos snapshots ── */}
      <PageSection
        title="Últimas capturas de saúde"
        description={`${status?.snapshots?.total ?? 0} snapshot(s) no total. Exibindo os 10 mais recentes.`}
      >
        <UltimosSnapshots snapshots={status?.ultimosSnapshots} />
      </PageSection>

    </div>
  );
}

export default IntegracoesPage;
