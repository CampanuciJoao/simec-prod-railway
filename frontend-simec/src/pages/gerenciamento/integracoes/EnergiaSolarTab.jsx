// Gerenciamento > Integracoes > Energia Solar
// CRUD generico de plantas solares e inverters (multi-provider).
// Admin unico que configura — operador consulta em /monitoramento.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faTrash, faPen, faMicrochip, faBolt, faSolarPanel,
  faCheck, faXmark, faShieldHalved, faStethoscope,
} from '@fortawesome/free-solid-svg-icons';

import {
  Card, Button, Input, SelectMenu, Drawer, LoadingState, InlineEmptyState,
  ModalConfirmacao,
} from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { getUnidades } from '@/services/api/unidadesApi';
import {
  getSolarPlants, getSolarProviders, salvarSolarPlant, desativarSolarPlant,
  adicionarInverter, editarInverter, removerInverter,
  adicionarBateria, removerBateria, validarCredencialSolar,
  sungrowAuthorizeUrl, sungrowAuthStatus, diagnosticarInversor, backfillInversor,
  purgarAgregadosPlanta,
  getSolarSnapshotsStats,
  purgarSnapshotsCorrompidos,
} from '@/services/api/solarApi';

// ─── Modal de nova/editar planta (dados basicos) ────────────────────────────
function PlantaModal({ open, onClose, plant, unidades, onSalvar }) {
  const [form, setForm] = useState({
    unidadeId: '', nome: '', localFisico: '',
    capacidadeKwp: '', tarifaKwh: '', temBateria: false, autonomiaHoras: '',
    alertaOfflineMinutos: '',
  });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (plant) {
      setForm({
        unidadeId: plant.unidadeId || '',
        nome: plant.nome || '',
        localFisico: plant.localFisico || '',
        capacidadeKwp: plant.capacidadeKwp ?? '',
        tarifaKwh: plant.tarifaKwh ?? '',
        temBateria: !!plant.temBateria,
        autonomiaHoras: plant.autonomiaHoras ?? '',
        alertaOfflineMinutos: plant.alertaOfflineMinutos ?? '',
      });
    } else {
      setForm({ unidadeId: '', nome: '', localFisico: '', capacidadeKwp: '', tarifaKwh: '', temBateria: false, autonomiaHoras: '', alertaOfflineMinutos: '' });
    }
  }, [plant, open]);

  const salvar = async (e) => {
    e?.preventDefault?.();
    if (!form.unidadeId || !form.nome) return;
    setSalvando(true);
    try {
      await onSalvar({
        ...(plant?.id ? { id: plant.id } : {}),
        unidadeId: form.unidadeId,
        nome: form.nome,
        localFisico: form.localFisico || null,
        capacidadeKwp: form.capacidadeKwp === '' ? null : Number(form.capacidadeKwp),
        tarifaKwh: form.tarifaKwh === '' ? null : Number(form.tarifaKwh),
        temBateria: form.temBateria,
        autonomiaHoras: form.autonomiaHoras === '' ? null : Number(form.autonomiaHoras),
        alertaOfflineMinutos: form.alertaOfflineMinutos === '' ? null : Number(form.alertaOfflineMinutos),
      });
      onClose();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={plant ? 'Editar planta solar' : 'Nova planta solar'}>
      <div className="px-5 py-4">
      <form onSubmit={salvar} className="space-y-3">
        <SelectMenu
          label="Unidade beneficiária"
          required
          value={form.unidadeId}
          onChange={(v) => setForm((f) => ({ ...f, unidadeId: v }))}
          placeholder="Selecione"
          options={unidades.map((u) => ({ value: u.id, label: u.nomeSistema }))}
        />
        <Input
          label="Nome"
          required
          placeholder="Ex: Usina Rancho Terra — Sede"
          value={form.nome}
          onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
        />
        <Input
          label="Local físico (opcional)"
          hint="Preencha se a planta não fica dentro da unidade beneficiária (ex: Fazenda Rancho Terra)"
          value={form.localFisico}
          onChange={(e) => setForm((f) => ({ ...f, localFisico: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Capacidade (kWp)"
            type="number"
            step="0.1"
            value={form.capacidadeKwp}
            onChange={(e) => setForm((f) => ({ ...f, capacidadeKwp: e.target.value }))}
          />
          <Input
            label="Tarifa (R$/kWh)"
            type="number"
            step="0.01"
            value={form.tarifaKwh}
            onChange={(e) => setForm((f) => ({ ...f, tarifaKwh: e.target.value }))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.temBateria}
            onChange={(e) => setForm((f) => ({ ...f, temBateria: e.target.checked }))}
          />
          Possui bateria (sistema híbrido — habilita alertas de queda de energia)
        </label>
        {form.temBateria && (
          <Input
            label="Autonomia típica (horas)"
            type="number"
            step="0.5"
            value={form.autonomiaHoras}
            onChange={(e) => setForm((f) => ({ ...f, autonomiaHoras: e.target.value }))}
          />
        )}
        <Input
          label="Alerta offline (minutos)"
          type="number"
          min="15"
          max="720"
          placeholder="60"
          hint="Minutos sem leitura antes de disparar alerta (Telegram). Deixe vazio para usar o padrão de 60min."
          value={form.alertaOfflineMinutos}
          onChange={(e) => setForm((f) => ({ ...f, alertaOfflineMinutos: e.target.value }))}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={salvando || !form.unidadeId || !form.nome}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
      </div>
    </Drawer>
  );
}

// ─── Modal de novo/editar inverter ──────────────────────────────────────────
function InverterModal({ open, onClose, inverter, providers, onSalvar }) {
  const isEdit = !!inverter;
  const [provider, setProvider] = useState('');
  const [form, setForm] = useState({
    nome: '', inverterSn: '', modeloInversor: '', capacidadeKw: '', apiBase: '',
    credential: {},
  });
  const [trocarCredencial, setTrocarCredencial] = useState(false);
  const [validando, setValidando] = useState(false);
  const [resultadoValidacao, setResultadoValidacao] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (inverter) {
      setProvider(inverter.provider);
      setForm({
        nome: inverter.nome || '',
        inverterSn: inverter.inverterSn || '',
        modeloInversor: inverter.modeloInversor || '',
        capacidadeKw: inverter.capacidadeKw ?? '',
        apiBase: inverter.apiBase || '',
        credential: {},
      });
      setTrocarCredencial(false);
    } else {
      setProvider('');
      setForm({ nome: '', inverterSn: '', modeloInversor: '', capacidadeKw: '', apiBase: '', credential: {} });
      setTrocarCredencial(true);
    }
    setResultadoValidacao(null);
  }, [inverter, open]);

  const providerSelecionado = providers.find((p) => p.id === provider) || null;

  // Preenche apiBase default quando provider muda
  useEffect(() => {
    if (providerSelecionado && !form.apiBase) {
      setForm((f) => ({ ...f, apiBase: providerSelecionado.defaultApiBase }));
    }
  }, [providerSelecionado]);  // eslint-disable-line react-hooks/exhaustive-deps

  const atualizarCredencial = (campo, valor) => {
    setForm((f) => ({ ...f, credential: { ...f.credential, [campo]: valor } }));
    setResultadoValidacao(null);
  };

  const validar = async () => {
    if (!providerSelecionado) return;
    const credOk = providerSelecionado.credentialFields.every((f) => !f.required || form.credential[f.name]);
    if (!credOk) {
      addToast('Preencha todos os campos obrigatórios da credencial.', 'error');
      return;
    }
    setValidando(true);
    try {
      const r = await validarCredencialSolar({
        provider: providerSelecionado.id,
        credential: form.credential,
        apiBase: form.apiBase || providerSelecionado.defaultApiBase,
      });
      setResultadoValidacao(r);
      addToast(`Credencial válida — ${r.devices?.length || 0} device(s) encontrado(s).`, 'success');

      // Auto-preenchimento: se o SN ja foi digitado, procura o device
      // correspondente e preenche modelo + capacidadeKw automaticamente
      // (so se campos estiverem vazios — nao sobrescreve o que o admin
      // ja preencheu manualmente). Evita re-digitar informacao que a
      // API ja devolve.
      if (form.inverterSn && Array.isArray(r.devices)) {
        const match = r.devices.find((d) => String(d.sn).trim() === String(form.inverterSn).trim());
        if (match) {
          setForm((f) => ({
            ...f,
            modeloInversor: f.modeloInversor || match.modelo || '',
            capacidadeKw:   f.capacidadeKw === '' && match.capacidadeKw != null
              ? String(match.capacidadeKw)
              : f.capacidadeKw,
          }));
          if (match.modelo || match.capacidadeKw != null) {
            addToast(`Dados do inversor "${match.sn}" preenchidos automaticamente.`, 'info');
          }
        }
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Credencial inválida.';
      setResultadoValidacao({ ok: false, erro: msg });
      addToast(msg, 'error');
    } finally {
      setValidando(false);
    }
  };

  const salvar = async (e) => {
    e?.preventDefault?.();
    if (!providerSelecionado || !form.inverterSn) return;
    const incluiCredencial = !isEdit || trocarCredencial;
    if (incluiCredencial) {
      const credOk = providerSelecionado.credentialFields.every((f) => !f.required || form.credential[f.name]);
      if (!credOk) {
        addToast('Preencha todos os campos obrigatórios da credencial.', 'error');
        return;
      }
    }
    setSalvando(true);
    try {
      await onSalvar({
        provider: providerSelecionado.id,
        nome: form.nome || null,
        inverterSn: form.inverterSn,
        modeloInversor: form.modeloInversor || null,
        capacidadeKw: form.capacidadeKw === '' ? null : Number(form.capacidadeKw),
        apiBase: form.apiBase || providerSelecionado.defaultApiBase,
        ...(incluiCredencial ? { credential: form.credential } : {}),
      });
      onClose();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Editar inversor' : 'Novo inversor'}>
      <div className="px-5 py-4">
      <form onSubmit={salvar} className="space-y-3">
        <SelectMenu
          label="Fabricante"
          required
          value={provider}
          onChange={(v) => { setProvider(v); setResultadoValidacao(null); }}
          disabled={isEdit}
          placeholder="Selecione o fabricante"
          options={providers.map((p) => ({ value: p.id, label: p.label }))}
        />
        {providerSelecionado?.apiBaseOptions && (
          <SelectMenu
            label="Região / endpoint"
            value={form.apiBase}
            onChange={(v) => setForm((f) => ({ ...f, apiBase: v }))}
            options={providerSelecionado.apiBaseOptions}
          />
        )}
        <Input
          label="Número de série do inversor"
          required
          placeholder="Ex: 60KJ303064JP038"
          value={form.inverterSn}
          onChange={(e) => setForm((f) => ({ ...f, inverterSn: e.target.value }))}
        />
        <Input
          label="Nome / apelido"
          placeholder="Opcional"
          value={form.nome}
          onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
        />

        {/* Modelo + Capacidade so aparecem no modo EDICAO (admin pode
            sobrescrever o auto-fill). No cadastro novo eles sao
            invisiveis — o backend puxa da API em background assim que
            a credencial permite consultar devices. */}
        {isEdit && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Modelo"
              placeholder="(auto-preenchido pela API)"
              hint="Deixe em branco pra re-puxar da API"
              value={form.modeloInversor}
              onChange={(e) => setForm((f) => ({ ...f, modeloInversor: e.target.value }))}
            />
            <Input
              label="Capacidade (kW)"
              type="number"
              step="0.1"
              placeholder="(auto-preenchido)"
              hint="Deixe em branco pra re-puxar da API"
              value={form.capacidadeKw}
              onChange={(e) => setForm((f) => ({ ...f, capacidadeKw: e.target.value }))}
            />
          </div>
        )}
        {!isEdit && (
          <div
            className="rounded-lg px-3 py-2 text-xs"
            style={{ backgroundColor: 'var(--bg-surface-subtle)', color: 'var(--text-muted)' }}
          >
            <strong>Modelo e capacidade</strong> são preenchidos automaticamente pela API do fabricante assim que você salvar
            {providerSelecionado?.id === 'sungrow' ? ' e autorizar (OAuth)' : ''}.
            Se quiser sobrescrever depois, edite o inversor.
          </div>
        )}

        {/* Credencial */}
        {providerSelecionado && (
          <div
            className="rounded-lg border p-3"
            style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-subtle)' }}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                <FontAwesomeIcon icon={faShieldHalved} className="mr-1" />
                Credencial {providerSelecionado.label}
              </p>
              {isEdit && !trocarCredencial && (
                <button
                  type="button"
                  className="text-xs underline"
                  style={{ color: 'var(--brand-primary)' }}
                  onClick={() => setTrocarCredencial(true)}
                >
                  Trocar credencial
                </button>
              )}
            </div>
            {isEdit && !trocarCredencial ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Credencial atual permanece. Clique em "Trocar credencial" para substituir.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  {providerSelecionado.credentialFields.map((field) => (
                    <div key={field.name}>
                      <Input
                        label={field.label}
                        type={field.type === 'password' ? 'password' : 'text'}
                        required={field.required}
                        value={form.credential[field.name] || ''}
                        onChange={(e) => atualizarCredencial(field.name, e.target.value)}
                        hint={field.help}
                      />
                    </div>
                  ))}
                </div>
                {/* Sungrow no cadastro novo nao permite testar pre-OAuth.
                    Mostra banner explicativo no lugar do botao Testar. */}
                {providerSelecionado.id === 'sungrow' && !isEdit ? (
                  <div
                    className="mt-2 rounded-lg px-3 py-2 text-xs"
                    style={{
                      backgroundColor: 'var(--brand-primary-soft)',
                      color: 'var(--text-secondary)',
                      borderLeft: '3px solid var(--brand-primary)',
                    }}
                  >
                    <strong>Sungrow usa OAuth 2.0</strong> — não dá para testar a credencial antes de autorizar.
                    Clique em <strong>Salvar</strong> abaixo e depois no botão <strong>⚠ Autorizar</strong> que
                    aparecerá na lista do inversor.
                  </div>
                ) : (
                  <>
                    <div className="mt-2 flex items-center gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={validar} disabled={validando}>
                        {validando ? 'Validando...' : 'Testar credencial'}
                      </Button>
                      {resultadoValidacao?.ok && (
                        <span className="text-xs" style={{ color: 'var(--color-success)' }}>
                          <FontAwesomeIcon icon={faCheck} /> {resultadoValidacao.devices?.length || 0} device(s) encontrado(s)
                        </span>
                      )}
                      {resultadoValidacao?.precisaAutorizar && (
                        <span className="text-xs" style={{ color: 'var(--color-warning)' }}>
                          Credencial salva — falta autorizar via OAuth na lista.
                        </span>
                      )}
                      {resultadoValidacao?.ok === false && !resultadoValidacao?.precisaAutorizar && (
                        <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
                          <FontAwesomeIcon icon={faXmark} /> {resultadoValidacao.erro}
                        </span>
                      )}
                    </div>
                    {resultadoValidacao?.devices?.length > 0 && (
                      <div className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        SNs visíveis na conta: {resultadoValidacao.devices.map((d) => d.sn).join(', ')}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={salvando || !provider || !form.inverterSn}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
      </div>
    </Drawer>
  );
}

// ─── Botao de diagnostico — mostra por que a coleta nao esta trazendo dados ──
function DiagnosticoInverterButton({ inverter, plantId }) {
  const { addToast } = useToast();
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [backfillando, setBackfillando] = useState(false);
  const [backfillResult, setBackfillResult] = useState(null);
  const [snapshotsStats, setSnapshotsStats] = useState(null);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);

  const executar = async () => {
    setCarregando(true);
    setResultado(null);
    try {
      const r = await diagnosticarInversor(inverter.id);
      setResultado(r);
      setAberto(true);
    } catch (err) {
      addToast(err?.response?.data?.error || err.message || 'Falha no diagnostico', 'error');
    } finally {
      setCarregando(false);
    }
  };

  const executarBackfill = async (dias) => {
    if (!window.confirm(
      `Puxar historico dos ultimos ${dias} dias? Pode demorar varios minutos ` +
      'e consome quota da API do fabricante.'
    )) return;
    setBackfillando(true);
    setBackfillResult(null);
    try {
      const r = await backfillInversor(inverter.id, dias);
      setBackfillResult(r);
      const msg = r.pulado
        ? `Nada a fazer: ${r.diasJaExistentes} dias ja preenchidos.`
        : `Backfill concluido: ${r.diasAfetados} dias novos, ${r.diasJaExistentes} ja existiam.`;
      addToast(msg, 'success');
    } catch (err) {
      const msg = err?.response?.data?.erro || err?.response?.data?.error || err.message;
      setBackfillResult({ ok: false, erro: msg });
      addToast(`Backfill falhou: ${msg}`, 'error');
    } finally {
      setBackfillando(false);
    }
  };

  const executarPurga = async () => {
    if (!plantId) return;
    if (!window.confirm(
      'APAGAR TODOS os agregados diarios e mensais DESTA PLANTA. ' +
      'Use pra corrigir backfill anterior que somou duplicado. ' +
      'Depois rode o backfill de novo. Continuar?'
    )) return;
    try {
      const r = await purgarAgregadosPlanta(plantId);
      addToast(
        `Purga concluida: ${r.diariosDeletados} diarios + ${r.mensaisDeletados} mensais apagados.`,
        'success',
      );
      // Re-roda o diagnostico pra atualizar o bloco de dados persistidos.
      executar();
    } catch (err) {
      addToast(err?.response?.data?.error || err.message, 'error');
    }
  };

  const carregarSnapshotsStats = async () => {
    if (!plantId) return;
    setSnapshotsLoading(true);
    try {
      const r = await getSolarSnapshotsStats(plantId, 30);
      setSnapshotsStats(r);
    } catch (err) {
      addToast(err?.response?.data?.error || err.message, 'error');
    } finally {
      setSnapshotsLoading(false);
    }
  };

  const executarPurgaSnapshots = async () => {
    if (!plantId) return;
    if (!window.confirm(
      'APAGAR snapshots corrompidos (acima do teto fisico de 10 kWh/kWp/dia) ' +
      'dos ultimos 60 dias desta planta. Isso limpa o card "Este mes" que mostra ' +
      'valores absurdos por causa de outliers no contador acumulado. Continuar?'
    )) return;
    try {
      const r = await purgarSnapshotsCorrompidos(plantId, 60);
      addToast(
        `${r.snapshotsRemovidos} snapshots corrompidos apagados (teto ${r.tetoKwhDia.toFixed(0)} kWh/dia).`,
        'success',
      );
      carregarSnapshotsStats();
    } catch (err) {
      addToast(err?.response?.data?.error || err.message, 'error');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={executar}
        title="Diagnosticar coleta"
        disabled={carregando}
      >
        <FontAwesomeIcon icon={faStethoscope} style={{ color: 'var(--brand-primary)' }} />
      </button>
      {aberto && resultado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setAberto(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg p-4"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Diagnostico — {inverter.provider} · SN {inverter.inverterSn}</h3>
              <button type="button" onClick={() => setAberto(false)}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Coleta do SN cadastrado
                </div>
                {resultado.coletaDoSn?.ok ? (
                  <div className="mt-1 rounded border border-green-500/40 bg-green-500/10 p-2">
                    <div>Potencia: {resultado.coletaDoSn.powerKw ?? '—'} kW</div>
                    <div>Hoje: {resultado.coletaDoSn.generationKwhDay ?? '—'} kWh</div>
                    <div>Temp: {resultado.coletaDoSn.inverterTempC ?? '—'} °C</div>
                    {resultado.coletaDoSn.rawPayload && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>
                          Payload bruto da API
                        </summary>
                        <pre className="mt-1 max-h-48 overflow-auto rounded bg-black/40 p-2 text-[10px]">
                          {JSON.stringify(resultado.coletaDoSn.rawPayload, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 rounded border border-red-500/40 bg-red-500/10 p-2">
                    <div className="font-semibold">Falhou: {resultado.coletaDoSn?.codigo || 'erro'}</div>
                    <div className="mt-1 break-words">{resultado.coletaDoSn?.erro}</div>
                  </div>
                )}
              </div>

              <div>
                <div className="font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Visao da conta (o que o token enxerga)
                </div>
                <div className="mt-1 rounded border p-2" style={{ borderColor: 'var(--border-soft)' }}>
                  <div>
                    Plantas visiveis: <strong>{resultado.visaoDaConta?.totalPlantasVisiveis ?? 0}</strong>
                    {' · '}
                    Devices visiveis: <strong>{resultado.visaoDaConta?.totalDevicesVisiveis ?? 0}</strong>
                  </div>
                  {resultado.visaoDaConta?.plantas?.length > 0 && (
                    <div className="mt-2">
                      <div className="mb-1 text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>
                        Plantas:
                      </div>
                      <ul className="list-disc pl-4">
                        {resultado.visaoDaConta.plantas.map((p, i) => (
                          <li key={i} className="break-all">{p.nome || '(sem nome)'} · ps_id {p.ps_id}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {resultado.visaoDaConta?.devicesSn?.length > 0 && (
                    <div className="mt-2">
                      <div className="mb-1 text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>
                        Devices:
                      </div>
                      <ul className="list-disc pl-4">
                        {resultado.visaoDaConta.devicesSn.map((d, i) => (
                          <li key={i} className="break-all">
                            <strong>SN {d.sn}</strong>
                            {d.tipo ? ` · tipo ${d.tipo}` : ''}
                            {d.dataloggerSn && d.dataloggerSn !== d.sn ? ` · datalogger ${d.dataloggerSn}` : ''}
                            {d.estacao ? ` · ${d.estacao}` : ''}
                            {d.capacidadeKw ? ` · ${d.capacidadeKw} kW` : ''}
                            {d.modelo ? ` · ${d.modelo}` : ''}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        Compare com o SN cadastrado: <strong>{resultado.inverterSnCadastrado}</strong>
                      </div>
                    </div>
                  )}
                  {resultado.visaoDaConta?.erro && (
                    <div className="mt-2 text-[11px]" style={{ color: 'var(--color-warning)' }}>
                      {resultado.visaoDaConta.erro}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                API base: {resultado.apiBase}
              </div>

              {resultado.ultimoSnapshot && (
                <div className="mt-3 rounded border border-yellow-500/40 bg-yellow-500/5 p-2">
                  <div className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
                    Ultimo snapshot salvo no banco ({new Date(resultado.ultimoSnapshot.capturedAt).toLocaleString('pt-BR')})
                  </div>
                  <div className="mt-1 text-[11px]">
                    Potencia: {resultado.ultimoSnapshot.powerKw ?? '—'} kW ·
                    Hoje: {resultado.ultimoSnapshot.generationKwhDay ?? '—'} kWh ·
                    Mes: {resultado.ultimoSnapshot.generationKwhMonth ?? '—'} kWh ·
                    Temp: {resultado.ultimoSnapshot.inverterTempC ?? '—'} °C
                  </div>
                  {resultado.ultimoSnapshot.rawJson && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>
                        Raw JSON do fabricante
                      </summary>
                      <pre className="mt-1 max-h-64 overflow-auto rounded bg-black/40 p-2 text-[10px]">
                        {(() => {
                          try { return JSON.stringify(JSON.parse(resultado.ultimoSnapshot.rawJson), null, 2); }
                          catch { return resultado.ultimoSnapshot.rawJson; }
                        })()}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {resultado.curlTeste && (
                <div className="mt-3 rounded border border-blue-500/40 bg-blue-500/10 p-2">
                  <div className="mb-1 text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
                    Teste fora do SIMEC (cURL)
                  </div>
                  <div className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>
                    Cole no terminal (git-bash, PowerShell ou cmd). Se der o mesmo erro, confirma que o problema esta na Application no portal Sungrow.
                  </div>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(resultado.curlTeste); }}
                    className="rounded border px-2 py-1 text-[10px] font-semibold"
                    style={{ borderColor: 'var(--border-soft)' }}
                  >
                    Copiar cURL
                  </button>
                  <pre className="mt-2 max-h-32 overflow-auto rounded bg-black/40 p-2 text-[10px] break-all whitespace-pre-wrap">
                    {resultado.curlTeste}
                  </pre>
                </div>
              )}

              {resultado.dadosPersistidos && (
                <div className="mt-3 rounded border p-2" style={{ borderColor: 'var(--border-soft)' }}>
                  <div className="mb-1 text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
                    Dados persistidos no banco
                  </div>
                  <div className="text-[11px] space-y-0.5">
                    <div>
                      Snapshots individuais deste inverter:{' '}
                      <strong>{resultado.dadosPersistidos.snapshotsIndividuaisDoInverter}</strong>
                    </div>
                    <div className="mt-1">
                      <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Nivel INVERTER (backfill popula aqui)</div>
                      <div>
                        Dias registrados: <strong>{resultado.dadosPersistidos.agregadosDoInverter}</strong>
                        {resultado.dadosPersistidos.diaMaisAntigoInverter && (
                          <> — de {new Date(resultado.dadosPersistidos.diaMaisAntigoInverter).toLocaleDateString('pt-BR')} a {new Date(resultado.dadosPersistidos.diaMaisRecenteInverter).toLocaleDateString('pt-BR')}</>
                        )}
                      </div>
                      {resultado.dadosPersistidos.kwhSomaDoInverter != null && (
                        <div>
                          Soma kWh deste inverter:{' '}
                          <strong>{resultado.dadosPersistidos.kwhSomaDoInverter.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kWh</strong>
                        </div>
                      )}
                    </div>
                    <div className="mt-1">
                      <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Nivel PLANTA (soma dos inverters)</div>
                      <div>
                        Dias registrados: <strong>{resultado.dadosPersistidos.agregadosDiariosDaPlanta}</strong>
                        {resultado.dadosPersistidos.diaMaisAntigo && (
                          <> — de {new Date(resultado.dadosPersistidos.diaMaisAntigo).toLocaleDateString('pt-BR')} a {new Date(resultado.dadosPersistidos.diaMaisRecente).toLocaleDateString('pt-BR')}</>
                        )}
                      </div>
                      {resultado.dadosPersistidos.kwhGeradoSomaPeriodo != null && (
                        <div>
                          Soma kWh da planta:{' '}
                          <strong>{resultado.dadosPersistidos.kwhGeradoSomaPeriodo.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kWh</strong>
                          {' · '}
                          min/max/dia: {resultado.dadosPersistidos.kwhGeradoMin ?? '—'}/{resultado.dadosPersistidos.kwhGeradoMax ?? '—'}
                        </div>
                      )}
                    </div>
                  </div>
                  {plantId && resultado.dadosPersistidos.agregadosDiariosDaPlanta > 0 && (
                    <button
                      type="button"
                      onClick={executarPurga}
                      className="mt-2 rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[10px] font-semibold"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      ⚠ Purgar agregados desta planta
                    </button>
                  )}
                </div>
              )}

              {plantId && (
                <div className="mt-3 rounded border border-yellow-500/40 bg-yellow-500/5 p-2">
                  <div className="mb-1 text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
                    Snapshots crus — diagnostico do card "Este mes"
                  </div>
                  <div className="mb-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Se o card "Este mes" mostra valor absurdo (ex: 790.000 kWh), provavelmente ha snapshots com contador corrompido. Veja aqui antes de purgar.
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={carregarSnapshotsStats}
                      disabled={snapshotsLoading}
                      className="rounded border px-2 py-1 text-[10px] font-semibold"
                      style={{ borderColor: 'var(--border-soft)' }}
                    >
                      {snapshotsLoading ? 'carregando...' : 'Ver stats dos snapshots (30d)'}
                    </button>
                    {snapshotsStats && snapshotsStats.porInverter?.some((p) => p.generationKwhTotal.deltaExcedeTeto || p.generationKwhDay.maxExcedeTeto) && (
                      <button
                        type="button"
                        onClick={executarPurgaSnapshots}
                        className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[10px] font-semibold"
                        style={{ color: 'var(--color-danger)' }}
                      >
                        ⚠ Purgar snapshots corrompidos
                      </button>
                    )}
                  </div>
                  {snapshotsStats && (
                    <div className="mt-2 space-y-2">
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        Teto fisico plausivel: <strong>{snapshotsStats.tetoDiaPlausivelKwh?.toFixed(0) ?? 'n/a'} kWh/dia</strong> (capacidade {snapshotsStats.plant.capacidadeKwp} kWp × 10)
                      </div>
                      {snapshotsStats.porInverter.map((inv) => (
                        <div key={inv.inverterId} className="rounded border p-2 text-[10px]" style={{ borderColor: 'var(--border-soft)' }}>
                          <div className="font-semibold">Inverter {inv.inverterId.slice(0, 8)}... — {inv.totalSnapshots} snapshots</div>
                          <div>
                            generationKwhDay: min {inv.generationKwhDay.min?.toFixed(1) ?? '—'} / max{' '}
                            <span style={{ color: inv.generationKwhDay.maxExcedeTeto ? 'var(--color-danger)' : 'inherit' }}>
                              {inv.generationKwhDay.max?.toFixed(1) ?? '—'}
                            </span>
                            {inv.generationKwhDay.maxExcedeTeto && ' ⚠ ACIMA DO TETO'}
                          </div>
                          <div>
                            generationKwhTotal (lifetime): min {inv.generationKwhTotal.min?.toFixed(0) ?? '—'} / max {inv.generationKwhTotal.max?.toFixed(0) ?? '—'} / delta{' '}
                            <span style={{ color: inv.generationKwhTotal.deltaExcedeTeto ? 'var(--color-danger)' : 'inherit' }}>
                              {inv.generationKwhTotal.delta?.toFixed(0) ?? '—'}
                            </span>
                            {inv.generationKwhTotal.deltaExcedeTeto && ' ⚠ DELTA ACIMA DO TETO'}
                          </div>
                          <div>Max potencia: {inv.maxPowerKw?.toFixed(2) ?? '—'} kW</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 rounded border border-green-500/40 bg-green-500/5 p-2">
                <div className="mb-1 text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
                  Backfill historico diario
                </div>
                <div className="mb-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Puxa geracao diaria da API do fabricante e grava em solar_agregados_diarios.
                  Pode demorar varios minutos por janela de 30-100 dias.
                </div>
                <div className="flex flex-wrap gap-1">
                  {[30, 90, 180, 365].map((dias) => (
                    <button
                      key={dias}
                      type="button"
                      disabled={backfillando}
                      onClick={() => executarBackfill(dias)}
                      className="rounded border px-2 py-1 text-[10px] font-semibold disabled:opacity-50"
                      style={{ borderColor: 'var(--border-soft)' }}
                    >
                      {backfillando ? 'rodando...' : `Backfill ${dias}d`}
                    </button>
                  ))}
                </div>
                {backfillResult && backfillResult.ok && (
                  <div className="mt-2 text-[11px]" style={{ color: 'var(--color-success)' }}>
                    {backfillResult.pulado
                      ? `✓ Nada a fazer: ${backfillResult.diasJaExistentes} dias ja estao no SIMEC. Pra re-puxar do zero, use "Purgar agregados" antes.`
                      : (
                        <>
                          ✓ {backfillResult.diasAfetados} dias gravados · {backfillResult.diasJaExistentes} ja existiam (pulados pra economizar API) · {backfillResult.janelasConsultadas} janela(s) consultada(s).
                          Periodo total: {backfillResult.periodo?.inicio} a {backfillResult.periodo?.fim}.
                        </>
                      )}
                    {backfillResult.errosJanela && (
                      <div className="mt-1" style={{ color: 'var(--color-warning)' }}>
                        ⚠ {backfillResult.errosJanela.length} janela(s) falharam: {backfillResult.errosJanela.slice(0, 2).join(' | ')}
                      </div>
                    )}
                  </div>
                )}
                {backfillResult && !backfillResult.ok && (
                  <div className="mt-2 text-[11px]" style={{ color: 'var(--color-danger)' }}>
                    ✗ {backfillResult.erro}
                  </div>
                )}
              </div>

              {resultado.ultimasChamadas && resultado.ultimasChamadas.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-[10px] uppercase font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Ultimas {resultado.ultimasChamadas.length} chamadas cruas (HTTP {'->'}  Sungrow)
                  </summary>
                  <div className="mt-2 space-y-2">
                    {resultado.ultimasChamadas.map((c, i) => (
                      <div key={i} className="rounded border p-2" style={{ borderColor: 'var(--border-soft)' }}>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {c.at} · HTTP {c.httpStatus} · {c.path}
                        </div>
                        {c.headersEnviados && (
                          <>
                            <div className="mt-1 text-[10px] font-semibold">Headers:</div>
                            <pre className="max-h-32 overflow-auto rounded bg-black/40 p-1 text-[10px]">
                              {JSON.stringify(c.headersEnviados, null, 2)}
                            </pre>
                          </>
                        )}
                        <div className="mt-1 text-[10px] font-semibold">Body:</div>
                        <pre className="max-h-32 overflow-auto rounded bg-black/40 p-1 text-[10px]">
                          {JSON.stringify(c.bodyEnviado, null, 2)}
                        </pre>
                        <div className="mt-1 text-[10px] font-semibold">Resposta:</div>
                        <pre className="max-h-48 overflow-auto rounded bg-black/40 p-1 text-[10px]">
                          {c.respostaCrua}
                        </pre>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Badge Sungrow — status OAuth + botao Autorizar quando precisa ─────────
function SungrowAuthBadge({ inverter }) {
  const { addToast } = useToast();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autorizando, setAutorizando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await sungrowAuthStatus(inverter.id);
      setStatus(r);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [inverter.id]);

  useEffect(() => { carregar(); }, [carregar]);

  // Recarrega quando a aba ganhar foco (user volta do Sungrow autorizando)
  useEffect(() => {
    const onFocus = () => carregar();
    window.addEventListener('focus', onFocus);
    // Postmessage do popup OAuth tambem dispara reload
    const onMsg = (e) => { if (e?.data?.sungrowAuth === 'ok') carregar(); };
    window.addEventListener('message', onMsg);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('message', onMsg);
    };
  }, [carregar]);

  const autorizar = async () => {
    setAutorizando(true);
    try {
      const { authorizeUrl } = await sungrowAuthorizeUrl(inverter.id);
      // Abre em popup — Sungrow redireciona pro backend callback que faz
      // postMessage de volta pra essa janela.
      const w = window.open(authorizeUrl, 'sungrow-auth', 'width=600,height=720,menubar=no,toolbar=no');
      if (!w) {
        addToast('Popup bloqueado. Libere popups de simec.cerdil.com.br.', 'error');
      }
    } catch (err) {
      addToast(err?.response?.data?.error || err.message, 'error');
    } finally {
      setAutorizando(false);
    }
  };

  if (loading) return <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>...</span>;
  if (!status) return null;

  if (!status.autorizado) {
    return (
      <span className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={autorizar}
          disabled={autorizando}
          className="rounded px-2 py-0.5 text-[10px] font-bold uppercase"
          style={{ backgroundColor: 'var(--color-warning-surface)', color: 'var(--color-warning)', border: '1px solid var(--color-warning-soft)' }}
          title={status.lastAuthError || 'Clique para autorizar via OAuth 2.0 da Sungrow'}
        >
          {autorizando ? 'abrindo...' : '⚠ autorizar'}
        </button>
        {status.lastAuthError && (
          <span className="text-[10px]" style={{ color: 'var(--color-danger)' }} title={status.lastAuthError}>
            Ultima tentativa falhou: {String(status.lastAuthError).slice(0, 80)}{String(status.lastAuthError).length > 80 ? '...' : ''}
          </span>
        )}
      </span>
    );
  }

  if (status.precisaRenovar) {
    return (
      <button type="button" onClick={autorizar} className="rounded px-2 py-0.5 text-[10px] font-bold uppercase"
              style={{ backgroundColor: 'var(--color-warning-surface)', color: 'var(--color-warning)' }}>
        token expirado - re-autorizar
      </button>
    );
  }

  return (
    <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase"
          style={{ backgroundColor: 'var(--color-success-surface)', color: 'var(--color-success)' }}>
      ✓ autorizado
    </span>
  );
}

// ─── Card de uma planta ─────────────────────────────────────────────────────
function PlantaCard({ plant, providers, onEditar, onRemover, onAddInverter, onEditInverter, onRemoverInverter, onAddBateria, onRemoverBateria }) {
  const providerLabel = (id) => providers.find((p) => p.id === id)?.label || id;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <FontAwesomeIcon icon={faSolarPanel} style={{ color: 'var(--brand-primary)' }} />
            {plant.nome}
            {!plant.ativo && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                    style={{ backgroundColor: 'var(--text-muted)' + '22', color: 'var(--text-muted)' }}>
                Inativa
              </span>
            )}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {plant.unidade?.nomeSistema}
            {plant.localFisico ? ` · 📍 ${plant.localFisico}` : ''}
            {plant.capacidadeKwp ? ` · ${plant.capacidadeKwp} kWp` : ''}
            {plant.temBateria ? ' · Com bateria' : ''}
          </p>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => onEditar(plant)} title="Editar planta">
            <FontAwesomeIcon icon={faPen} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onRemover(plant)} title="Desativar planta">
            <FontAwesomeIcon icon={faTrash} style={{ color: 'var(--color-danger)' }} />
          </Button>
        </div>
      </div>

      {/* Inversores */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Inversores ({plant.inverters?.length || 0})
          </p>
          <Button size="sm" variant="ghost" onClick={() => onAddInverter(plant)}>
            <FontAwesomeIcon icon={faPlus} className="mr-1" /> Adicionar
          </Button>
        </div>
        {(plant.inverters || []).length === 0 ? (
          <InlineEmptyState message="Nenhum inversor cadastrado ainda." />
        ) : (
          <div className="space-y-1">
            {plant.inverters.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded border px-2 py-1 text-xs"
                   style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-subtle)' }}>
                <span className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faMicrochip} style={{ color: 'var(--brand-primary)' }} />
                  <span>
                    <strong>{providerLabel(inv.provider)}</strong>
                    {inv.modeloInversor ? ` · ${inv.modeloInversor}` : ''}
                    <span style={{ color: 'var(--text-muted)' }}> · SN {inv.inverterSn}</span>
                  </span>
                  {!inv.ativo && (
                    <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>inativo</span>
                  )}
                  {inv.provider === 'sungrow' && <SungrowAuthBadge inverter={inv} />}
                </span>
                <div className="flex gap-1">
                  <DiagnosticoInverterButton inverter={inv} plantId={plant.id} />
                  <button type="button" onClick={() => onEditInverter(plant, inv)} title="Editar">
                    <FontAwesomeIcon icon={faPen} />
                  </button>
                  <button type="button" onClick={() => onRemoverInverter(inv)} title="Remover">
                    <FontAwesomeIcon icon={faTrash} style={{ color: 'var(--color-danger)' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Baterias (so se planta tiver bateria) */}
      {plant.temBateria && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Baterias ({plant.baterias?.length || 0})
            </p>
            <Button size="sm" variant="ghost" onClick={() => onAddBateria(plant)}>
              <FontAwesomeIcon icon={faPlus} className="mr-1" /> Adicionar
            </Button>
          </div>
          {(plant.baterias || []).length === 0 ? (
            <InlineEmptyState message="Nenhuma bateria cadastrada." />
          ) : (
            <div className="space-y-1">
              {plant.baterias.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded border px-2 py-1 text-xs"
                     style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-subtle)' }}>
                  <span>
                    <FontAwesomeIcon icon={faBolt} className="mr-1" style={{ color: 'var(--color-success)' }} />
                    SN {b.sn} · {providerLabel(b.provider)}
                    {b.capacidadeKwh ? ` · ${b.capacidadeKwh} kWh` : ''}
                  </span>
                  <button type="button" onClick={() => onRemoverBateria(b)} title="Remover">
                    <FontAwesomeIcon icon={faTrash} style={{ color: 'var(--color-danger)' }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Container principal ────────────────────────────────────────────────────
// ─── Drawer pra adicionar bateria ────────────────────────────────────────────
function BateriaModal({ open, onClose, plant, onSalvar }) {
  const [sn, setSn] = useState('');
  const [capacidadeKwh, setCapacidadeKwh] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) { setSn(''); setCapacidadeKwh(''); }
  }, [open]);

  const salvar = async (e) => {
    e?.preventDefault?.();
    if (!sn) return;
    const provider = plant?.inverters?.[0]?.provider || 'foxess';
    setSalvando(true);
    try {
      await onSalvar({
        sn,
        provider,
        capacidadeKwh: capacidadeKwh === '' ? null : Number(capacidadeKwh),
      });
      onClose();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Nova bateria">
      <div className="px-5 py-4">
        <form onSubmit={salvar} className="space-y-3">
          <Input
            label="Número de série"
            required
            placeholder="Ex: 60EP711063UP054"
            value={sn}
            onChange={(e) => setSn(e.target.value)}
          />
          <Input
            label="Capacidade (kWh)"
            type="number"
            step="0.1"
            placeholder="Opcional"
            hint="Preencha se souber; serve apenas pra exibicao"
            value={capacidadeKwh}
            onChange={(e) => setCapacidadeKwh(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={salvando || !sn}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    </Drawer>
  );
}

function EnergiaSolarTab() {
  const { addToast } = useToast();
  const [plants, setPlants] = useState([]);
  const [providers, setProviders] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);

  const [plantaEditando, setPlantaEditando] = useState(null);
  const [plantaModalOpen, setPlantaModalOpen] = useState(false);
  const [inverterModalOpen, setInverterModalOpen] = useState(false);
  const [inverterEditando, setInverterEditando] = useState(null);
  const [plantIdInverter, setPlantIdInverter] = useState(null);

  const [bateriaModalOpen, setBateriaModalOpen] = useState(false);
  const [plantParaBateria, setPlantParaBateria] = useState(null);

  // Estado generico pra confirmar remocoes (planta / inverter / bateria)
  const [confirmacao, setConfirmacao] = useState(null);
  // { title, message, confirmText, onConfirm }

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [ps, prov, un] = await Promise.all([
        getSolarPlants(),
        getSolarProviders(),
        getUnidades(),
      ]);
      setPlants(ps || []);
      setProviders(prov || []);
      setUnidades(un || []);
    } catch (err) {
      addToast(err?.response?.data?.error || err?.message || 'Erro ao carregar.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirNovaPlanta = () => { setPlantaEditando(null); setPlantaModalOpen(true); };
  const abrirEditarPlanta = (p) => { setPlantaEditando(p); setPlantaModalOpen(true); };

  const salvarPlanta = async (payload) => {
    try {
      await salvarSolarPlant(payload);
      addToast(payload.id ? 'Planta atualizada.' : 'Planta criada.', 'success');
      await carregar();
    } catch (err) {
      addToast(err?.response?.data?.error || err?.message, 'error');
    }
  };

  const desativarPlanta = (plant) => {
    setConfirmacao({
      title: 'Desativar planta solar',
      message: `Desativar "${plant.nome}"? O monitoramento para, mas os dados históricos permanecem no banco.`,
      confirmText: 'Desativar',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await desativarSolarPlant(plant.id);
          addToast('Planta desativada.', 'success');
          await carregar();
        } catch (err) {
          addToast(err?.response?.data?.error || err?.message, 'error');
        } finally {
          setConfirmacao(null);
        }
      },
    });
  };

  const abrirNovoInverter = (plant) => {
    setPlantIdInverter(plant.id);
    setInverterEditando(null);
    setInverterModalOpen(true);
  };
  const abrirEditarInverter = (plant, inverter) => {
    setPlantIdInverter(plant.id);
    setInverterEditando(inverter);
    setInverterModalOpen(true);
  };

  const salvarInverter = async (payload) => {
    try {
      if (inverterEditando) {
        await editarInverter(inverterEditando.id, payload);
        addToast('Inversor atualizado.', 'success');
      } else {
        await adicionarInverter(plantIdInverter, payload);
        addToast('Inversor adicionado.', 'success');
      }
      await carregar();
    } catch (err) {
      addToast(err?.response?.data?.error || err?.message, 'error');
    }
  };

  const removerInvertr = (inv) => {
    setConfirmacao({
      title: 'Remover inversor',
      message: `Remover inversor SN ${inv.inverterSn}? Os snapshots coletados por ele permanecem no histórico, mas a coleta para imediatamente.`,
      confirmText: 'Remover',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await removerInverter(inv.id);
          addToast('Inversor removido.', 'success');
          await carregar();
        } catch (err) {
          addToast(err?.response?.data?.error || err?.message, 'error');
        } finally {
          setConfirmacao(null);
        }
      },
    });
  };

  const adicBateria = (plant) => {
    setPlantParaBateria(plant);
    setBateriaModalOpen(true);
  };

  const salvarBateria = async (payload) => {
    try {
      await adicionarBateria(plantParaBateria.id, payload);
      addToast('Bateria adicionada.', 'success');
      await carregar();
    } catch (err) {
      addToast(err?.response?.data?.error || err?.message, 'error');
    }
  };

  const remBateria = (bateria) => {
    setConfirmacao({
      title: 'Remover bateria',
      message: `Remover bateria SN ${bateria.sn}?`,
      confirmText: 'Remover',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await removerBateria(bateria.id);
          addToast('Bateria removida.', 'success');
          await carregar();
        } catch (err) {
          addToast(err?.response?.data?.error || err?.message, 'error');
        } finally {
          setConfirmacao(null);
        }
      },
    });
  };

  if (loading) return <LoadingState message="Carregando..." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm">
            {plants.length} planta(s) · {providers.length} fabricante(s) disponíveis
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Fabricantes: {providers.map((p) => p.label).join(', ') || '—'}
          </p>
        </div>
        <Button onClick={abrirNovaPlanta}>
          <FontAwesomeIcon icon={faPlus} className="mr-1" /> Nova planta
        </Button>
      </div>

      {plants.length === 0 ? (
        <Card className="p-8 text-center">
          <FontAwesomeIcon icon={faSolarPanel} className="mb-3 text-4xl" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm">Nenhuma planta cadastrada ainda.</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Clique em "Nova planta" pra começar.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {plants.map((p) => (
            <PlantaCard
              key={p.id}
              plant={p}
              providers={providers}
              onEditar={abrirEditarPlanta}
              onRemover={desativarPlanta}
              onAddInverter={abrirNovoInverter}
              onEditInverter={abrirEditarInverter}
              onRemoverInverter={removerInvertr}
              onAddBateria={adicBateria}
              onRemoverBateria={remBateria}
            />
          ))}
        </div>
      )}

      <PlantaModal
        open={plantaModalOpen}
        onClose={() => setPlantaModalOpen(false)}
        plant={plantaEditando}
        unidades={unidades}
        onSalvar={salvarPlanta}
      />
      <InverterModal
        open={inverterModalOpen}
        onClose={() => setInverterModalOpen(false)}
        inverter={inverterEditando}
        providers={providers}
        onSalvar={salvarInverter}
      />
      <BateriaModal
        open={bateriaModalOpen}
        onClose={() => setBateriaModalOpen(false)}
        plant={plantParaBateria}
        onSalvar={salvarBateria}
      />
      <ModalConfirmacao
        isOpen={!!confirmacao}
        onClose={() => setConfirmacao(null)}
        onConfirm={confirmacao?.onConfirm || (() => {})}
        title={confirmacao?.title || 'Confirmar'}
        message={confirmacao?.message || ''}
        confirmText={confirmacao?.confirmText || 'Confirmar'}
        isDestructive={confirmacao?.isDestructive || false}
      />
    </div>
  );
}

export default EnergiaSolarTab;
