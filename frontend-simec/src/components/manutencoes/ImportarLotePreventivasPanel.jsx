import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faCircleCheck,
  faCircleExclamation,
  faFileImport,
  faTable,
  faTrash,
  faTriangleExclamation,
  faXmark,
  faCalendarDays,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  FileDropZone,
  Input,
  ModalConfirmacao,
  PageState,
  Select,
} from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import {
  criarLotePreventivas,
  extrairLotePreventivas,
} from '@/services/api/manutencoesImportApi';

// ─── Helpers ───────────────────────────────────────────────────────────────

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const DIAS_SEMANA = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

// Cores fixas para unidades (rotacionadas). Padrão similar ao PDF do calendário.
const CORES_UNIDADE = [
  { bg: '#FED7AA', border: '#F97316', text: '#7C2D12' }, // laranja
  { bg: '#BBF7D0', border: '#22C55E', text: '#14532D' }, // verde
  { bg: '#BFDBFE', border: '#3B82F6', text: '#1E3A8A' }, // azul
  { bg: '#FEF08A', border: '#EAB308', text: '#713F12' }, // amarelo
  { bg: '#FBCFE8', border: '#EC4899', text: '#831843' }, // rosa
  { bg: '#DDD6FE', border: '#8B5CF6', text: '#4C1D95' }, // roxo
  { bg: '#A7F3D0', border: '#10B981', text: '#064E3B' }, // teal
];

function corPorUnidade(mapa, nome) {
  if (!nome) return CORES_UNIDADE[0];
  if (mapa.has(nome)) return mapa.get(nome);
  const cor = CORES_UNIDADE[mapa.size % CORES_UNIDADE.length];
  mapa.set(nome, cor);
  return cor;
}

function diasNoMes(ano, mes /* 0-11 */) {
  return new Date(ano, mes + 1, 0).getDate();
}

function diaSemanaSeg0(date) {
  // JS: 0=Dom..6=Sáb. Convertendo para 0=Seg..6=Dom (padrão BR/PDF).
  const d = date.getDay();
  return d === 0 ? 6 : d - 1;
}

function formatarDataISO(ano, mes /* 0-11 */, dia) {
  const mm = String(mes + 1).padStart(2, '0');
  const dd = String(dia).padStart(2, '0');
  return `${ano}-${mm}-${dd}`;
}

function validarEntrada(entry) {
  if (!entry.equipamentoId) return 'Equipamento obrigatório';
  if (!entry.data) return 'Data obrigatória';
  if (!entry.horaInicio) return 'Hora início obrigatória';
  if (!entry.horaFim) return 'Hora fim obrigatória';
  if (entry.horaInicio >= entry.horaFim) return 'Hora fim deve ser maior que início';
  return null;
}

// Achata o array de arquivos+entradas em uma lista única de entradas
// (cada uma com seu tempId).
function achatarEntradas(resultados) {
  const out = [];
  for (const arquivo of resultados || []) {
    if (!arquivo.ok || !Array.isArray(arquivo.entradas)) continue;
    for (const e of arquivo.entradas) {
      out.push({
        tempId: e.tempId,
        fileName: arquivo.fileName,
        data: e.dados?.data || '',
        horaInicio: e.dados?.horaInicio || '',
        horaFim: e.dados?.horaFim || '',
        tipo: e.dados?.tipoManutencao || 'Preventiva',
        descricao: e.dados?.descricao || '',
        unidadeNomeOriginal: e.dados?.unidadeNome || '',
        modeloOriginal: e.dados?.modeloEquipamento || '',
        unidadeId: e.unidadeSugerida?.id || '',
        equipamentoId: e.equipamentoSugerido?.id || '',
        confianca: e.dados?.confianca ?? null,
        alertas: e.alertas || [],
        importar: Boolean(
          e.equipamentoSugerido?.id &&
            !e.equipamentoSugerido?.ambiguo &&
            (e.alertas || []).length === 0
        ),
      });
    }
  }
  return out;
}

// ─── Componente principal ─────────────────────────────────────────────────

function ImportarLotePreventivasPanel({ isOpen, onClose, onSuccess }) {
  const { addToast } = useToast();

  const [stage, setStage] = useState('upload'); // upload | preview | sumario
  const [files, setFiles] = useState([]);
  const [extraindo, setExtraindo] = useState(false);
  const [criando, setCriando] = useState(false);

  const [entradas, setEntradas] = useState([]);
  const [catalogo, setCatalogo] = useState({ unidades: [], equipamentos: [] });
  const [activeSubtab, setActiveSubtab] = useState('calendario');
  const [editTempId, setEditTempId] = useState(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const [sumario, setSumario] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setStage('upload');
      setFiles([]);
      setEntradas([]);
      setCatalogo({ unidades: [], equipamentos: [] });
      setSumario(null);
      setEditTempId(null);
    }
  }, [isOpen]);

  // ─── Stage: Upload ────────────────────────────────────────────────────────
  const handleFiles = (novos) => {
    setFiles((prev) => [...prev, ...novos].slice(0, 10));
  };
  const removerFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleExtrair = async () => {
    if (files.length === 0) return;
    setExtraindo(true);
    try {
      const data = await extrairLotePreventivas(files);
      const flat = achatarEntradas(data?.resultados);
      setEntradas(flat);
      setCatalogo(data?.catalogo || { unidades: [], equipamentos: [] });
      if (flat.length === 0) {
        addToast('Nenhuma preventiva encontrada nos arquivos enviados.', 'warning');
        return;
      }
      setStage('preview');
      setActiveSubtab('calendario');
    } catch (err) {
      addToast(
        err?.response?.data?.message || 'Falha ao extrair lote. Tente novamente.',
        'error'
      );
    } finally {
      setExtraindo(false);
    }
  };

  // ─── Stage: Preview helpers ──────────────────────────────────────────────
  const equipamentosPorUnidade = useMemo(() => {
    const grupos = new Map();
    for (const eq of catalogo.equipamentos || []) {
      const nome = eq.unidadeNome || 'Sem unidade';
      if (!grupos.has(nome)) grupos.set(nome, []);
      grupos.get(nome).push(eq);
    }
    return grupos;
  }, [catalogo]);

  const coresPorUnidade = useMemo(() => {
    const mapa = new Map();
    for (const e of entradas) {
      const unidade = catalogo.unidades.find((u) => u.id === e.unidadeId);
      const nome = unidade?.nomeSistema || e.unidadeNomeOriginal || 'Sem unidade';
      corPorUnidade(mapa, nome);
    }
    return mapa;
  }, [entradas, catalogo]);

  const entradasComStatus = useMemo(
    () =>
      entradas.map((e) => {
        const erro = validarEntrada(e);
        const unidade = catalogo.unidades.find((u) => u.id === e.unidadeId);
        const equipamento = catalogo.equipamentos.find((x) => x.id === e.equipamentoId);
        return {
          ...e,
          erro,
          unidadeNome: unidade?.nomeSistema || e.unidadeNomeOriginal || '',
          equipamentoLabel: equipamento
            ? equipamento.apelido || equipamento.modelo
            : '',
        };
      }),
    [entradas, catalogo]
  );

  const contadores = useMemo(() => {
    let selecionadas = 0;
    let invalidas = 0;
    for (const e of entradasComStatus) {
      if (e.erro) invalidas += 1;
      else if (e.importar) selecionadas += 1;
    }
    return { selecionadas, invalidas, total: entradasComStatus.length };
  }, [entradasComStatus]);

  const updateEntrada = (tempId, patch) => {
    setEntradas((prev) =>
      prev.map((e) => {
        if (e.tempId !== tempId) return e;
        const next = { ...e, ...patch };
        // Se trocou a unidade, limpa equipamento (forçar reescolha)
        if (patch.unidadeId !== undefined && patch.unidadeId !== e.unidadeId) {
          next.equipamentoId = '';
        }
        return next;
      })
    );
  };

  const removerEntrada = (tempId) =>
    setEntradas((prev) => prev.filter((e) => e.tempId !== tempId));

  const handleCriar = async () => {
    const items = entradasComStatus
      .filter((e) => e.importar && !e.erro)
      .map((e) => ({
        tempId: e.tempId,
        equipamentoId: e.equipamentoId,
        tipo: e.tipo,
        agendamentoDataInicioLocal: e.data,
        agendamentoHoraInicioLocal: e.horaInicio,
        agendamentoDataFimLocal: e.data,
        agendamentoHoraFimLocal: e.horaFim,
        descricaoProblemaServico: e.descricao || null,
      }));
    if (items.length === 0) {
      addToast('Nenhuma entrada válida selecionada para importar.', 'warning');
      return;
    }
    setCriando(true);
    try {
      const data = await criarLotePreventivas(items);
      setSumario(data);
      setStage('sumario');
      if (data?.criados > 0) {
        onSuccess?.();
      }
    } catch (err) {
      addToast(
        err?.response?.data?.message || 'Falha ao criar manutenções em lote.',
        'error'
      );
    } finally {
      setCriando(false);
    }
  };

  const handleClose = () => {
    if (stage === 'preview' && entradas.length > 0) {
      setConfirmCancelOpen(true);
      return;
    }
    onClose?.();
  };

  if (!isOpen) return null;

  // ─── Render: overlay + drawer ────────────────────────────────────────────

  return (
    <>
      <div
        className="fixed inset-0 z-[70] flex items-stretch justify-end bg-slate-950/80 backdrop-blur-md"
        onClick={handleClose}
      >
        <div
          className="flex h-full w-full max-w-6xl flex-col overflow-hidden border-l shadow-2xl"
          style={{
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border-soft)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Header onClose={handleClose} stage={stage} />

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {stage === 'upload' ? (
              <UploadStage
                files={files}
                onFiles={handleFiles}
                onRemove={removerFile}
                extraindo={extraindo}
              />
            ) : null}

            {stage === 'preview' ? (
              <PreviewStage
                entradas={entradasComStatus}
                catalogo={catalogo}
                equipamentosPorUnidade={equipamentosPorUnidade}
                coresPorUnidade={coresPorUnidade}
                activeSubtab={activeSubtab}
                onChangeSubtab={setActiveSubtab}
                onEditar={(tempId) => setEditTempId(tempId)}
                onRemover={removerEntrada}
                onToggleImportar={(tempId, importar) =>
                  updateEntrada(tempId, { importar })
                }
                onUpdate={updateEntrada}
              />
            ) : null}

            {stage === 'sumario' && sumario ? (
              <SumarioStage sumario={sumario} onFechar={onClose} />
            ) : null}
          </div>

          {stage === 'preview' ? (
            <Footer
              contadores={contadores}
              onVoltar={() => setConfirmCancelOpen(true)}
              onSalvar={handleCriar}
              criando={criando}
            />
          ) : null}

          {stage === 'upload' ? (
            <UploadFooter
              files={files}
              onClose={onClose}
              onExtrair={handleExtrair}
              extraindo={extraindo}
            />
          ) : null}
        </div>
      </div>

      {/* Popover de edição de uma entrada */}
      {editTempId ? (
        <EditarEntradaModal
          entrada={entradasComStatus.find((e) => e.tempId === editTempId)}
          catalogo={catalogo}
          equipamentosPorUnidade={equipamentosPorUnidade}
          onClose={() => setEditTempId(null)}
          onSalvar={(patch) => {
            updateEntrada(editTempId, patch);
            setEditTempId(null);
          }}
          onRemover={() => {
            removerEntrada(editTempId);
            setEditTempId(null);
          }}
        />
      ) : null}

      <ModalConfirmacao
        isOpen={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={() => {
          setConfirmCancelOpen(false);
          onClose?.();
        }}
        title="Descartar importação?"
        message="As alterações que você fez no preview serão perdidas. Tem certeza?"
        confirmText="Descartar"
        isDestructive
      />
    </>
  );
}

ImportarLotePreventivasPanel.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};

export default ImportarLotePreventivasPanel;

// ─── Sub-componentes ──────────────────────────────────────────────────────

function Header({ onClose, stage }) {
  const titulo =
    stage === 'upload'
      ? 'Importar preventivas — Selecionar arquivos'
      : stage === 'preview'
        ? 'Importar preventivas — Revisar e confirmar'
        : 'Importar preventivas — Resultado';
  return (
    <div
      className="flex items-center justify-between border-b px-6 py-4"
      style={{ borderColor: 'var(--border-soft)' }}
    >
      <div className="flex items-center gap-3">
        <FontAwesomeIcon icon={faFileImport} className="text-cyan-500" />
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {titulo}
        </h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="rounded-lg p-2 transition hover:bg-slate-100"
        style={{ color: 'var(--text-muted)' }}
      >
        <FontAwesomeIcon icon={faXmark} />
      </button>
    </div>
  );
}
Header.propTypes = { onClose: PropTypes.func.isRequired, stage: PropTypes.string.isRequired };

function UploadStage({ files, onFiles, onRemove, extraindo }) {
  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Arraste um <strong>PDF do calendário</strong> emitido pelo fornecedor (ex: GE Healthcare)
        ou <strong>CSV</strong> estruturado. Aceita até 10 arquivos por lote (max 10MB cada).
        A IA extrai as preventivas e você revisa antes de salvar.
      </p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Formato do CSV: <code>data,hora_inicio,hora_fim,unidade,modelo,tipo[,descricao]</code> —
        datas em <code>YYYY-MM-DD</code>, horas em <code>HH:mm</code>.
      </p>

      <FileDropZone
        accept=".pdf,.csv,application/pdf,text/csv,text/plain"
        multiple
        disabled={extraindo}
        loading={extraindo}
        loadingLabel={`Extraindo ${files.length} arquivo(s)...`}
        label="Arraste arquivos aqui ou"
        ctaLabel="clique para selecionar"
        hint="PDF ou CSV — até 10 arquivos"
        onFiles={onFiles}
      />

      {files.length > 0 ? (
        <ul className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between rounded-lg border px-3 py-2"
                style={{ borderColor: 'var(--border-soft)' }}>
              <span className="truncate">{f.name}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-xs hover:underline"
                style={{ color: 'var(--color-danger)' }}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
UploadStage.propTypes = {
  files: PropTypes.array.isRequired,
  onFiles: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  extraindo: PropTypes.bool,
};

function UploadFooter({ files, onClose, onExtrair, extraindo }) {
  return (
    <div
      className="flex items-center justify-end gap-2 border-t px-6 py-4"
      style={{ borderColor: 'var(--border-soft)' }}
    >
      <Button variant="secondary" type="button" onClick={onClose}>
        Cancelar
      </Button>
      <Button type="button" onClick={onExtrair} disabled={files.length === 0 || extraindo}>
        {extraindo ? 'Extraindo...' : `Extrair ${files.length || ''} arquivo(s)`}
      </Button>
    </div>
  );
}
UploadFooter.propTypes = {
  files: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onExtrair: PropTypes.func.isRequired,
  extraindo: PropTypes.bool,
};

function PreviewStage({
  entradas,
  catalogo,
  equipamentosPorUnidade,
  coresPorUnidade,
  activeSubtab,
  onChangeSubtab,
  onEditar,
  onRemover,
  onToggleImportar,
  onUpdate,
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 border-b" style={{ borderColor: 'var(--border-soft)' }}>
        <SubtabButton
          active={activeSubtab === 'calendario'}
          onClick={() => onChangeSubtab('calendario')}
          icon={faCalendarDays}
          label="Calendário"
        />
        <SubtabButton
          active={activeSubtab === 'tabela'}
          onClick={() => onChangeSubtab('tabela')}
          icon={faTable}
          label={`Tabela (${entradas.length})`}
        />
      </div>

      {activeSubtab === 'calendario' ? (
        <PreviewCalendario
          entradas={entradas}
          coresPorUnidade={coresPorUnidade}
          onEditar={onEditar}
        />
      ) : (
        <PreviewTabela
          entradas={entradas}
          catalogo={catalogo}
          equipamentosPorUnidade={equipamentosPorUnidade}
          onUpdate={onUpdate}
          onRemover={onRemover}
          onToggleImportar={onToggleImportar}
        />
      )}
    </div>
  );
}
PreviewStage.propTypes = {
  entradas: PropTypes.array.isRequired,
  catalogo: PropTypes.object.isRequired,
  equipamentosPorUnidade: PropTypes.instanceOf(Map).isRequired,
  coresPorUnidade: PropTypes.instanceOf(Map).isRequired,
  activeSubtab: PropTypes.string.isRequired,
  onChangeSubtab: PropTypes.func.isRequired,
  onEditar: PropTypes.func.isRequired,
  onRemover: PropTypes.func.isRequired,
  onToggleImportar: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

function SubtabButton({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-2 rounded-t-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition',
        active ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50',
      ].join(' ')}
    >
      <FontAwesomeIcon icon={icon} />
      {label}
    </button>
  );
}
SubtabButton.propTypes = {
  active: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  icon: PropTypes.object.isRequired,
  label: PropTypes.string.isRequired,
};

// ─── Calendário mensal ────────────────────────────────────────────────────

function PreviewCalendario({ entradas, coresPorUnidade, onEditar }) {
  const dataInicial = useMemo(() => {
    const datas = entradas.map((e) => e.data).filter(Boolean).sort();
    if (datas.length === 0) return new Date();
    const [y, m] = datas[0].split('-').map(Number);
    return new Date(y, m - 1, 1);
  }, [entradas]);

  const [cursor, setCursor] = useState(dataInicial);
  useEffect(() => setCursor(dataInicial), [dataInicial]);

  const ano = cursor.getFullYear();
  const mes = cursor.getMonth();
  const totalDias = diasNoMes(ano, mes);
  const offset = diaSemanaSeg0(new Date(ano, mes, 1));

  const entradasPorDia = useMemo(() => {
    const mapa = new Map();
    for (const e of entradas) {
      if (!e.data) continue;
      if (!mapa.has(e.data)) mapa.set(e.data, []);
      mapa.get(e.data).push(e);
    }
    return mapa;
  }, [entradas]);

  const celulas = [];
  for (let i = 0; i < offset; i += 1) celulas.push(null);
  for (let d = 1; d <= totalDias; d += 1) {
    celulas.push({ ano, mes, dia: d, dataISO: formatarDataISO(ano, mes, d) });
  }

  return (
    <div className="space-y-3">
      <div
        className="flex items-center justify-between rounded-xl border px-4 py-2"
        style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}
      >
        <button
          type="button"
          onClick={() => setCursor(new Date(ano, mes - 1, 1))}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-slate-100"
          style={{ color: 'var(--text-secondary)' }}
        >
          <FontAwesomeIcon icon={faChevronLeft} /> Mês anterior
        </button>
        <h3 className="text-base font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-primary)' }}>
          {MESES[mes]} {ano}
        </h3>
        <button
          type="button"
          onClick={() => setCursor(new Date(ano, mes + 1, 1))}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-slate-100"
          style={{ color: 'var(--text-secondary)' }}
        >
          Próximo mês <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-[0.18em]"
           style={{ color: 'var(--text-muted)' }}>
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celulas.map((c, i) => (
          <div
            key={i}
            className="min-h-[110px] rounded-lg border p-1.5"
            style={{
              borderColor: 'var(--border-soft)',
              backgroundColor: c ? 'var(--bg-surface)' : 'transparent',
              opacity: c ? 1 : 0.3,
            }}
          >
            {c ? (
              <>
                <div className="mb-1 text-right text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                  {String(c.dia).padStart(2, '0')}
                </div>
                <div className="space-y-1">
                  {(entradasPorDia.get(c.dataISO) || []).map((e) => (
                    <PilulaCalendario
                      key={e.tempId}
                      entrada={e}
                      cor={coresPorUnidade.get(e.unidadeNome) || CORES_UNIDADE[0]}
                      onClick={() => onEditar(e.tempId)}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ))}
      </div>

      <Legenda coresPorUnidade={coresPorUnidade} />
    </div>
  );
}
PreviewCalendario.propTypes = {
  entradas: PropTypes.array.isRequired,
  coresPorUnidade: PropTypes.instanceOf(Map).isRequired,
  onEditar: PropTypes.func.isRequired,
};

function PilulaCalendario({ entrada, cor, onClick }) {
  const invalido = Boolean(entrada.erro);
  const importar = entrada.importar;
  const corBase = importar && !invalido ? cor : { bg: '#F3F4F6', border: '#9CA3AF', text: '#374151' };
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded px-1.5 py-1 text-left text-[10px] font-medium transition hover:brightness-95"
      style={{
        backgroundColor: corBase.bg,
        color: corBase.text,
        borderLeft: `3px solid ${corBase.border}`,
        opacity: importar ? 1 : 0.55,
        outline: invalido ? '2px solid #DC2626' : 'none',
      }}
      title={
        invalido
          ? `Erro: ${entrada.erro}`
          : `${entrada.unidadeNome} • ${entrada.equipamentoLabel || entrada.modeloOriginal} • ${entrada.horaInicio}–${entrada.horaFim}`
      }
    >
      <div className="truncate font-semibold">{entrada.unidadeNome || entrada.unidadeNomeOriginal}</div>
      <div className="truncate">{entrada.equipamentoLabel || entrada.modeloOriginal}</div>
      <div className="text-[9px] opacity-80">
        {entrada.horaInicio}–{entrada.horaFim}
        {invalido ? ' • ⚠' : ''}
        {!importar && !invalido ? ' • desativada' : ''}
      </div>
    </button>
  );
}
PilulaCalendario.propTypes = {
  entrada: PropTypes.object.isRequired,
  cor: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired,
};

function Legenda({ coresPorUnidade }) {
  if (coresPorUnidade.size === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 pt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
      <strong style={{ color: 'var(--text-primary)' }}>Unidades:</strong>
      {[...coresPorUnidade.entries()].map(([nome, cor]) => (
        <span
          key={nome}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5"
          style={{ backgroundColor: cor.bg, color: cor.text }}
        >
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: cor.border }} />
          {nome}
        </span>
      ))}
    </div>
  );
}
Legenda.propTypes = { coresPorUnidade: PropTypes.instanceOf(Map).isRequired };

// ─── Tabela ──────────────────────────────────────────────────────────────

function PreviewTabela({ entradas, catalogo, equipamentosPorUnidade, onUpdate, onRemover, onToggleImportar }) {
  if (entradas.length === 0) {
    return <PageState isEmpty emptyMessage="Nenhuma entrada extraída." />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr style={{ color: 'var(--text-muted)' }} className="text-left text-xs uppercase tracking-wider">
            <th className="px-2 py-2">Importar</th>
            <th className="px-2 py-2">Data</th>
            <th className="px-2 py-2">Início</th>
            <th className="px-2 py-2">Fim</th>
            <th className="px-2 py-2">Unidade</th>
            <th className="px-2 py-2">Equipamento</th>
            <th className="px-2 py-2">Tipo</th>
            <th className="px-2 py-2">Status</th>
            <th className="px-2 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {entradas.map((e) => {
            const equiposDaUnidade = e.unidadeId
              ? equipamentosPorUnidade.get(
                  catalogo.unidades.find((u) => u.id === e.unidadeId)?.nomeSistema || ''
                ) || []
              : catalogo.equipamentos;
            return (
              <tr key={e.tempId} style={{ borderTop: '1px solid var(--border-soft)' }}>
                <td className="px-2 py-2 align-top">
                  <input
                    type="checkbox"
                    checked={e.importar}
                    onChange={(ev) => onToggleImportar(e.tempId, ev.target.checked)}
                    disabled={Boolean(e.erro)}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <Input
                    type="date"
                    value={e.data}
                    onChange={(ev) => onUpdate(e.tempId, { data: ev.target.value })}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <Input
                    type="time"
                    value={e.horaInicio}
                    onChange={(ev) => onUpdate(e.tempId, { horaInicio: ev.target.value })}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <Input
                    type="time"
                    value={e.horaFim}
                    onChange={(ev) => onUpdate(e.tempId, { horaFim: ev.target.value })}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <Select
                    value={e.unidadeId}
                    onChange={(ev) => onUpdate(e.tempId, { unidadeId: ev.target.value })}
                    options={[{ value: '', label: 'Selecione' }, ...catalogo.unidades.map((u) => ({ value: u.id, label: u.nomeSistema }))]}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <Select
                    value={e.equipamentoId}
                    onChange={(ev) => onUpdate(e.tempId, { equipamentoId: ev.target.value })}
                    options={[
                      { value: '', label: 'Selecione' },
                      ...equiposDaUnidade.map((eq) => ({
                        value: eq.id,
                        label: `${eq.apelido || eq.modelo}${eq.tag ? ` · ${eq.tag}` : ''}`,
                      })),
                    ]}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <Select
                    value={e.tipo}
                    onChange={(ev) => onUpdate(e.tempId, { tipo: ev.target.value })}
                    options={[
                      { value: 'Preventiva', label: 'Preventiva' },
                      { value: 'Calibracao', label: 'Calibração' },
                      { value: 'Inspecao', label: 'Inspeção' },
                    ]}
                  />
                </td>
                <td className="px-2 py-2 align-top text-xs">
                  {e.erro ? (
                    <span style={{ color: 'var(--color-danger)' }}>
                      <FontAwesomeIcon icon={faTriangleExclamation} /> {e.erro}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--color-success)' }}>
                      <FontAwesomeIcon icon={faCircleCheck} /> OK
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 align-top">
                  <button
                    type="button"
                    onClick={() => onRemover(e.tempId)}
                    className="rounded p-2 text-xs hover:bg-slate-100"
                    style={{ color: 'var(--color-danger)' }}
                    title="Remover entrada"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
PreviewTabela.propTypes = {
  entradas: PropTypes.array.isRequired,
  catalogo: PropTypes.object.isRequired,
  equipamentosPorUnidade: PropTypes.instanceOf(Map).isRequired,
  onUpdate: PropTypes.func.isRequired,
  onRemover: PropTypes.func.isRequired,
  onToggleImportar: PropTypes.func.isRequired,
};

// ─── Footer com contador + ação principal ────────────────────────────────

function Footer({ contadores, onVoltar, onSalvar, criando }) {
  return (
    <div
      className="flex items-center justify-between gap-3 border-t px-6 py-4"
      style={{ borderColor: 'var(--border-soft)' }}
    >
      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        <strong style={{ color: 'var(--text-primary)' }}>{contadores.selecionadas}</strong> selecionadas •{' '}
        <span style={{ color: contadores.invalidas > 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
          {contadores.invalidas} inválidas
        </span>{' '}
        • Total {contadores.total}
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" type="button" onClick={onVoltar} disabled={criando}>
          Descartar
        </Button>
        <Button
          type="button"
          onClick={onSalvar}
          disabled={criando || contadores.selecionadas === 0}
        >
          {criando ? 'Salvando...' : `Salvar e agendar ${contadores.selecionadas} manutenções`}
        </Button>
      </div>
    </div>
  );
}
Footer.propTypes = {
  contadores: PropTypes.object.isRequired,
  onVoltar: PropTypes.func.isRequired,
  onSalvar: PropTypes.func.isRequired,
  criando: PropTypes.bool,
};

// ─── Modal de edição de entrada ──────────────────────────────────────────

function EditarEntradaModal({ entrada, catalogo, equipamentosPorUnidade, onClose, onSalvar, onRemover }) {
  const [draft, setDraft] = useState(entrada);
  useEffect(() => setDraft(entrada), [entrada]);
  if (!draft) return null;

  const update = (patch) =>
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      if (patch.unidadeId !== undefined && patch.unidadeId !== prev.unidadeId) {
        next.equipamentoId = '';
      }
      return next;
    });

  const equiposDaUnidade = draft.unidadeId
    ? equipamentosPorUnidade.get(
        catalogo.unidades.find((u) => u.id === draft.unidadeId)?.nomeSistema || ''
      ) || []
    : catalogo.equipamentos;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border p-5 shadow-2xl"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-soft)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            Editar preventiva
          </h3>
          <button type="button" onClick={onClose} className="rounded p-2 hover:bg-slate-100">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {draft.alertas?.length > 0 ? (
          <div
            className="mb-3 rounded-lg border px-3 py-2 text-xs"
            style={{
              borderColor: 'var(--color-warning)',
              backgroundColor: 'var(--color-warning-soft)',
              color: 'var(--color-warning)',
            }}
          >
            <FontAwesomeIcon icon={faCircleExclamation} className="mr-1.5" />
            {draft.alertas.join(' ')}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Data</label>
            <Input type="date" value={draft.data} onChange={(e) => update({ data: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Tipo</label>
            <Select
              value={draft.tipo}
              onChange={(e) => update({ tipo: e.target.value })}
              options={[
                { value: 'Preventiva', label: 'Preventiva' },
                { value: 'Calibracao', label: 'Calibração' },
                { value: 'Inspecao', label: 'Inspeção' },
              ]}
            />
          </div>
          <div>
            <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Hora início</label>
            <Input type="time" value={draft.horaInicio} onChange={(e) => update({ horaInicio: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Hora fim</label>
            <Input type="time" value={draft.horaFim} onChange={(e) => update({ horaFim: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Unidade</label>
            <Select
              value={draft.unidadeId}
              onChange={(e) => update({ unidadeId: e.target.value })}
              options={[{ value: '', label: 'Selecione' }, ...catalogo.unidades.map((u) => ({ value: u.id, label: u.nomeSistema }))]}
            />
            {draft.unidadeNomeOriginal && draft.unidadeNomeOriginal !== draft.unidadeNome ? (
              <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Texto original do calendário: <em>{draft.unidadeNomeOriginal}</em>
              </p>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Equipamento</label>
            <Select
              value={draft.equipamentoId}
              onChange={(e) => update({ equipamentoId: e.target.value })}
              options={[
                { value: '', label: 'Selecione' },
                ...equiposDaUnidade.map((eq) => ({
                  value: eq.id,
                  label: `${eq.apelido || eq.modelo}${eq.tag ? ` · ${eq.tag}` : ''}`,
                })),
              ]}
            />
            {draft.modeloOriginal ? (
              <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Texto original do calendário: <em>{draft.modeloOriginal}</em>
              </p>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Descrição (opcional)</label>
            <Input
              value={draft.descricao || ''}
              onChange={(e) => update({ descricao: e.target.value })}
              placeholder="Manutenção preventiva — calendário fornecedor"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={draft.importar}
                onChange={(e) => update({ importar: e.target.checked })}
              />
              Importar esta entrada
            </label>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <Button variant="danger" type="button" onClick={onRemover}>
            <FontAwesomeIcon icon={faTrash} className="mr-1.5" />
            Remover entrada
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => onSalvar(draft)}>
              Salvar alterações
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
EditarEntradaModal.propTypes = {
  entrada: PropTypes.object,
  catalogo: PropTypes.object.isRequired,
  equipamentosPorUnidade: PropTypes.instanceOf(Map).isRequired,
  onClose: PropTypes.func.isRequired,
  onSalvar: PropTypes.func.isRequired,
  onRemover: PropTypes.func.isRequired,
};

// ─── Sumário pós-import ──────────────────────────────────────────────────

function SumarioStage({ sumario, onFechar }) {
  const { criados, pulados, falhas, detalhes } = sumario;
  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl border px-4 py-3 text-sm"
        style={{
          borderColor: 'var(--color-success)',
          backgroundColor: 'var(--color-success-soft)',
          color: 'var(--color-success)',
        }}
      >
        <FontAwesomeIcon icon={faCircleCheck} className="mr-2" />
        <strong>{criados}</strong> manutenção(ões) criada(s).
        {pulados > 0 ? <span> {pulados} pulada(s) por conflito.</span> : null}
        {falhas > 0 ? <span> {falhas} falha(s).</span> : null}
      </div>

      {detalhes?.criados?.length > 0 ? (
        <Bloco titulo="Criadas" tone="success">
          {detalhes.criados.map((c) => (
            <li key={c.id}>OS <strong>{c.numeroOS}</strong></li>
          ))}
        </Bloco>
      ) : null}

      {detalhes?.pulados?.length > 0 ? (
        <Bloco titulo="Puladas" tone="warning">
          {detalhes.pulados.map((p, i) => {
            if (p.motivo === 'data_no_passado') {
              return (
                <li key={i}>
                  Data no passado — {p.detalhes || 'agendamento anterior a hoje.'}
                </li>
              );
            }
            if (p.motivo === 'ja_existe_os_concluida') {
              return (
                <li key={i}>
                  Já existe OS concluída <strong>{p.osExistente?.numeroOS}</strong> nesse horário.
                </li>
              );
            }
            return (
              <li key={i}>
                Já existe OS <strong>{p.osExistente?.numeroOS || p.tempId}</strong> nesse horário
                {p.osExistente?.status ? ` (status: ${p.osExistente.status})` : ''}.
              </li>
            );
          })}
        </Bloco>
      ) : null}

      {detalhes?.falhas?.length > 0 ? (
        <Bloco titulo="Falhas" tone="danger">
          {detalhes.falhas.map((f, i) => (
            <li key={i}>{f.erro}</li>
          ))}
        </Bloco>
      ) : null}

      <div className="flex justify-end">
        <Button type="button" onClick={onFechar}>
          Fechar
        </Button>
      </div>
    </div>
  );
}
SumarioStage.propTypes = {
  sumario: PropTypes.object.isRequired,
  onFechar: PropTypes.func.isRequired,
};

function Bloco({ titulo, tone, children }) {
  const map = {
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    danger: 'var(--color-danger)',
  };
  return (
    <div
      className="rounded-xl border px-4 py-3 text-sm"
      style={{ borderColor: map[tone], color: 'var(--text-secondary)' }}
    >
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: map[tone] }}>
        {titulo}
      </h4>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}
Bloco.propTypes = {
  titulo: PropTypes.string.isRequired,
  tone: PropTypes.oneOf(['success', 'warning', 'danger']).isRequired,
  children: PropTypes.node,
};
