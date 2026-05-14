import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faPaperclip, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';

import {
  Drawer,
  Button,
  Input,
  Select,
  Textarea,
  DateInput,
  FormFieldShell,
} from '@/components/ui';

import {
  criarTesteCq,
  uploadAnexoTesteCq,
  getTiposTeste,
  extrairLaudoCq,
} from '@/services/api';

const RESULTADOS = [
  { value: 'Aprovado', label: 'Aprovado' },
  { value: 'AprovadoComRestricoes', label: 'Aprovado com restrições' },
  { value: 'Reprovado', label: 'Reprovado' },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function calcularPreviewVencimento(dataExecucao, frequenciaDias) {
  if (!dataExecucao || !frequenciaDias) return null;
  const d = new Date(dataExecucao);
  d.setDate(d.getDate() + Number(frequenciaDias));
  return d.toLocaleDateString('pt-BR');
}

function RegistrarTesteForm({
  open,
  onClose,
  equipamentos = [],
  equipamentoIdInicial = null,
  modalidadeInicial = null,
  testeBase = null,
  onCreated,
}) {
  const [tipos, setTipos] = useState([]);
  const [loadingTipos, setLoadingTipos] = useState(false);

  const [equipamentoId, setEquipamentoId] = useState(equipamentoIdInicial || '');
  const [tipoTesteId, setTipoTesteId] = useState('');
  const [dataExecucao, setDataExecucao] = useState(todayISO());
  const [resultado, setResultado] = useState('Aprovado');
  const [numeroLaudo, setNumeroLaudo] = useState('');
  const [empresaExecutora, setEmpresaExecutora] = useState('');
  const [responsavelNome, setResponsavelNome] = useState('');
  const [responsavelRegistro, setResponsavelRegistro] = useState('');
  const [validadeMeses, setValidadeMeses] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [pendencias, setPendencias] = useState([]);
  const [arquivos, setArquivos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState(null);
  const [extraindo, setExtraindo] = useState(false);
  const [iaAlertas, setIaAlertas] = useState([]);
  const [camposIa, setCamposIa] = useState(new Set()); // tracks campos preenchidos pela IA
  const [pdfExtraido, setPdfExtraido] = useState(null); // identidade name|size do ultimo PDF processado

  const equipamentoSelecionado = useMemo(
    () => equipamentos.find((e) => e.id === equipamentoId) || null,
    [equipamentos, equipamentoId]
  );

  // Agrupa equipamentos por unidade para usar <optgroup> no select.
  // Ordem: unidade A→Z, depois apelido (se houver) ou modelo A→Z.
  const equipamentosPorUnidade = useMemo(() => {
    const grupos = new Map();
    for (const eq of equipamentos) {
      const unidade = eq.unidade?.nomeSistema || 'Sem unidade';
      if (!grupos.has(unidade)) grupos.set(unidade, []);
      grupos.get(unidade).push(eq);
    }
    for (const lista of grupos.values()) {
      lista.sort((a, b) => {
        const aLabel = (a.apelido || a.modelo || '').toLowerCase();
        const bLabel = (b.apelido || b.modelo || '').toLowerCase();
        return aLabel.localeCompare(bLabel, 'pt-BR');
      });
    }
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
  }, [equipamentos]);

  const equipamentoOptionLabel = (eq) => {
    const partes = [];
    if (eq.apelido) partes.push(eq.apelido);
    partes.push(eq.modelo || 'Sem modelo');
    if (eq.tag) partes[partes.length - 1] += ` (${eq.tag})`;
    return `${partes.join(' · ')} — ${eq.tipo || 'Sem modalidade'}`;
  };

  const modalidadeFiltro = equipamentoSelecionado?.tipo || modalidadeInicial || null;

  // Pre-popula com testeBase (uso: 'Renovar este teste')
  useEffect(() => {
    if (!open) return;
    if (testeBase) {
      setEquipamentoId(testeBase.equipamentoId || equipamentoIdInicial || '');
      setTipoTesteId(testeBase.tipoTesteId || '');
      setDataExecucao(todayISO());
      setResultado('Aprovado');
      setNumeroLaudo('');
      setEmpresaExecutora(testeBase.empresaExecutora || '');
      setResponsavelNome(testeBase.responsavelNome || '');
      setResponsavelRegistro(testeBase.responsavelRegistro || '');
      setValidadeMeses(testeBase.validadeMeses ? String(testeBase.validadeMeses) : '');
      setObservacoes('');
      setPendencias([]);
      setArquivos([]);
      setErros({});
      setErroGeral(null);
      setIaAlertas([]);
      setCamposIa(new Set());
      setPdfExtraido(null);
    } else {
      setEquipamentoId(equipamentoIdInicial || '');
      setTipoTesteId('');
      setDataExecucao(todayISO());
      setResultado('Aprovado');
      setNumeroLaudo('');
      setEmpresaExecutora('');
      setResponsavelNome('');
      setResponsavelRegistro('');
      setValidadeMeses('');
      setObservacoes('');
      setPendencias([]);
      setArquivos([]);
      setErros({});
      setErroGeral(null);
      setIaAlertas([]);
      setCamposIa(new Set());
      setPdfExtraido(null);
    }
  }, [open, testeBase, equipamentoIdInicial]);

  // Carrega tipos sempre que abrir/mudar modalidade
  useEffect(() => {
    if (!open) return;
    setLoadingTipos(true);
    getTiposTeste(modalidadeFiltro ? { modalidade: modalidadeFiltro } : {})
      .then((data) => setTipos(Array.isArray(data) ? data : []))
      .catch(() => setTipos([]))
      .finally(() => setLoadingTipos(false));
  }, [open, modalidadeFiltro]);

  const tipoSelecionado = useMemo(
    () => tipos.find((t) => t.id === tipoTesteId) || null,
    [tipos, tipoTesteId]
  );

  const previewVencimento = useMemo(() => {
    const freq = validadeMeses
      ? Number(validadeMeses) * 30
      : tipoSelecionado?.frequenciaDias;
    return calcularPreviewVencimento(dataExecucao, freq);
  }, [dataExecucao, validadeMeses, tipoSelecionado]);

  const adicionarPendencia = () => setPendencias((p) => [...p, { descricao: '', resolvido: false }]);
  const removerPendencia = (i) => setPendencias((p) => p.filter((_, idx) => idx !== i));
  const atualizarPendencia = (i, valor) =>
    setPendencias((p) => p.map((it, idx) => (idx === i ? { ...it, descricao: valor } : it)));

  const handleArquivos = (e) => {
    const files = Array.from(e.target.files || []);
    setArquivos((prev) => [...prev, ...files].slice(0, 5));
  };

  const removerArquivo = (i) => setArquivos((prev) => prev.filter((_, idx) => idx !== i));

  const aplicarCamposIa = (dados, alertas, tiposCarregados) => {
    const usados = new Set();
    if (dados.numeroLaudo) { setNumeroLaudo(dados.numeroLaudo); usados.add('numeroLaudo'); }
    if (dados.empresaExecutora) { setEmpresaExecutora(dados.empresaExecutora); usados.add('empresaExecutora'); }
    if (dados.responsavelNome) { setResponsavelNome(dados.responsavelNome); usados.add('responsavelNome'); }
    if (dados.responsavelRegistro) { setResponsavelRegistro(dados.responsavelRegistro); usados.add('responsavelRegistro'); }
    if (dados.validadeMeses) { setValidadeMeses(String(dados.validadeMeses)); usados.add('validadeMeses'); }
    if (dados.dataExecucao) { setDataExecucao(dados.dataExecucao); usados.add('dataExecucao'); }
    if (dados.resultado) { setResultado(dados.resultado); usados.add('resultado'); }

    if (dados.codigoTipoSugerido) {
      const tipo = tiposCarregados.find((t) => t.codigo === dados.codigoTipoSugerido);
      if (tipo) { setTipoTesteId(tipo.id); usados.add('tipoTesteId'); }
    }

    if (Array.isArray(dados.pendenciasAcao) && dados.pendenciasAcao.length > 0) {
      setPendencias(dados.pendenciasAcao.map((p) => ({ descricao: p.descricao, resolvido: false })));
      usados.add('pendenciasAcao');
    }

    setCamposIa(usados);
    setIaAlertas(alertas || []);
  };

  const handleExtrairLaudo = async (arquivoPdf) => {
    if (!arquivoPdf) return;
    setExtraindo(true);
    setIaAlertas([]);
    setErroGeral(null);
    try {
      const r = await extrairLaudoCq(arquivoPdf);
      // Garante que tipos estao carregados (extrator pode sugerir codigo de
      // qualquer modalidade — recarrega sem filtro para resolver match)
      const tiposCompletos = await getTiposTeste();
      setTipos(tiposCompletos);
      aplicarCamposIa(r.dados || {}, r.alertas || [], tiposCompletos);
    } catch (e) {
      setErroGeral(e?.response?.data?.message || 'Erro ao extrair laudo via IA.');
    } finally {
      setExtraindo(false);
    }
  };

  // Auto-extracao: ao adicionar/trocar o primeiro PDF da lista, dispara LLM
  // automaticamente. Identidade do PDF = name|size para nao re-extrair quando
  // a lista muda mas o PDF principal continua o mesmo.
  useEffect(() => {
    if (!open || extraindo) return;
    const primeiroPdf = arquivos.find((f) => f.type === 'application/pdf');
    if (!primeiroPdf) return;
    const identidade = `${primeiroPdf.name}|${primeiroPdf.size}`;
    if (identidade === pdfExtraido) return;
    setPdfExtraido(identidade);
    handleExtrairLaudo(primeiroPdf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arquivos, open]);

  // Wrapper para limpar marcacao de IA quando usuario edita o campo
  const desmarcarIa = (campo) => {
    if (camposIa.has(campo)) {
      const novo = new Set(camposIa);
      novo.delete(campo);
      setCamposIa(novo);
    }
  };

  const hintIa = (campo) =>
    camposIa.has(campo) ? 'Sugerido pela IA — revise' : undefined;

  const handleSalvar = async () => {
    setSalvando(true);
    setErros({});
    setErroGeral(null);

    try {
      const payload = {
        equipamentoId,
        tipoTesteId,
        dataExecucao,
        resultado,
        ...(numeroLaudo ? { numeroLaudo } : {}),
        ...(empresaExecutora ? { empresaExecutora } : {}),
        ...(responsavelNome ? { responsavelNome } : {}),
        ...(responsavelRegistro ? { responsavelRegistro } : {}),
        ...(validadeMeses ? { validadeMeses: Number(validadeMeses) } : {}),
        ...(observacoes ? { observacoes } : {}),
        ...(pendencias.length
          ? {
              pendenciasAcao: pendencias
                .filter((p) => p.descricao.trim())
                .map((p) => ({
                  descricao: p.descricao.trim(),
                  resolvido: false,
                  criadoEm: new Date().toISOString(),
                })),
            }
          : {}),
      };

      const teste = await criarTesteCq(payload);

      // Upload de anexos (sequencial — backend aceita ate 5)
      if (arquivos.length > 0 && teste?.id) {
        const fd = new FormData();
        arquivos.forEach((f) => fd.append('file', f));
        await uploadAnexoTesteCq(teste.id, fd);
      }

      onCreated?.(teste);
      onClose();
    } catch (e) {
      const data = e?.response?.data;
      if (data?.fieldErrors) setErros(data.fieldErrors);
      setErroGeral(data?.message || 'Erro ao registrar teste.');
    } finally {
      setSalvando(false);
    }
  };

  const podeSalvar = equipamentoId && tipoTesteId && dataExecucao && resultado && !salvando;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={testeBase ? 'Renovar teste de qualidade' : 'Registrar teste de qualidade'}
      subtitle="Conformidade ANVISA RDC 611/2022 e IN 90/2021"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={!podeSalvar}>
            {salvando ? 'Salvando...' : 'Salvar teste'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {erroGeral ? (
          <div
            className="rounded-xl px-3 py-2 text-sm"
            style={{
              backgroundColor: 'var(--color-danger-soft)',
              color: 'var(--color-danger)',
            }}
          >
            {erroGeral}
          </div>
        ) : null}

        {/* Upload do laudo no topo: ao selecionar PDF, IA pre-preenche os campos */}
        <FormFieldShell
          label="Laudo PDF"
          hint="Importe o PDF e a IA pré-preenche os campos abaixo automaticamente. Aceita até 5 arquivos."
        >
          <div className="flex flex-wrap items-center gap-2">
            <label
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--border-default)' }}
            >
              <FontAwesomeIcon icon={extraindo ? faWandMagicSparkles : faPaperclip} spin={extraindo} />
              <span>
                {extraindo ? 'Lendo PDF com IA...' : 'Importar PDF do laudo'}
              </span>
              <input
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png"
                className="hidden"
                onChange={handleArquivos}
                disabled={extraindo}
              />
            </label>
          </div>

          {arquivos.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              {arquivos.map((f, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg px-2 py-1"
                  style={{ backgroundColor: 'var(--bg-surface-soft)' }}>
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removerArquivo(i)}
                    className="ml-2 text-xs"
                    style={{ color: 'var(--color-danger)' }}
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {iaAlertas.length > 0 ? (
            <div
              className="mt-3 rounded-xl px-3 py-2 text-xs"
              style={{
                backgroundColor: 'var(--color-warning-soft)',
                color: 'var(--color-warning)',
              }}
            >
              <strong>IA precisa de revisão:</strong>
              <ul className="mt-1 list-disc pl-5">
                {iaAlertas.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          ) : null}
        </FormFieldShell>

        <FormFieldShell label="Equipamento" required error={erros.equipamentoId}>
          <Select
            value={equipamentoId}
            onChange={(e) => setEquipamentoId(e.target.value)}
            disabled={!!equipamentoIdInicial}
            placeholder="Selecione um equipamento..."
          >
            {equipamentosPorUnidade.map(([unidade, lista]) => (
              <optgroup key={unidade} label={unidade}>
                {lista.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {equipamentoOptionLabel(eq)}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </FormFieldShell>

        <FormFieldShell label="Tipo de teste" required error={erros.tipoTesteId} hint={hintIa('tipoTesteId')}>
          <Select
            value={tipoTesteId}
            onChange={(e) => { setTipoTesteId(e.target.value); desmarcarIa('tipoTesteId'); }}
            disabled={loadingTipos || !equipamentoId}
          >
            <option value="">
              {loadingTipos ? 'Carregando...' : 'Selecione o tipo...'}
            </option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.codigo} — {t.nome}
              </option>
            ))}
          </Select>
          {tipoSelecionado ? (
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Frequência padrão: {tipoSelecionado.frequenciaDias} dias
              {tipoSelecionado.normaReferencia ? ` · ${tipoSelecionado.normaReferencia}` : ''}
            </p>
          ) : null}
        </FormFieldShell>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormFieldShell label="Data de execução" required error={erros.dataExecucao} hint={hintIa('dataExecucao')}>
            <DateInput
              value={dataExecucao}
              onChange={(e) => { setDataExecucao(e.target.value); desmarcarIa('dataExecucao'); }}
              max={todayISO()}
            />
          </FormFieldShell>

          <FormFieldShell label="Resultado" required error={erros.resultado} hint={hintIa('resultado')}>
            <Select value={resultado} onChange={(e) => { setResultado(e.target.value); desmarcarIa('resultado'); }}>
              {RESULTADOS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </Select>
          </FormFieldShell>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormFieldShell
            label="Validade (meses)"
            hint={hintIa('validadeMeses') || 'Vazio = usa frequência padrão'}
            error={erros.validadeMeses}
          >
            <Input
              type="number"
              min="1"
              max="120"
              value={validadeMeses}
              onChange={(e) => { setValidadeMeses(e.target.value); desmarcarIa('validadeMeses'); }}
              placeholder={tipoSelecionado ? `${Math.round(tipoSelecionado.frequenciaDias / 30)}` : ''}
            />
          </FormFieldShell>

          <FormFieldShell label="Próximo vencimento (preview)">
            <Input value={previewVencimento || '—'} readOnly disabled />
          </FormFieldShell>
        </div>

        <FormFieldShell label="Número do laudo" error={erros.numeroLaudo} hint={hintIa('numeroLaudo')}>
          <Input
            value={numeroLaudo}
            onChange={(e) => { setNumeroLaudo(e.target.value); desmarcarIa('numeroLaudo'); }}
            placeholder="Ex: LRMD/SP/2026/ME/0238"
          />
        </FormFieldShell>

        <FormFieldShell label="Empresa executora" error={erros.empresaExecutora} hint={hintIa('empresaExecutora')}>
          <Input
            value={empresaExecutora}
            onChange={(e) => { setEmpresaExecutora(e.target.value); desmarcarIa('empresaExecutora'); }}
            placeholder="Ex: FM Serviços de Física Médica"
          />
        </FormFieldShell>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormFieldShell label="Responsável (nome)" error={erros.responsavelNome} hint={hintIa('responsavelNome')}>
            <Input
              value={responsavelNome}
              onChange={(e) => { setResponsavelNome(e.target.value); desmarcarIa('responsavelNome'); }}
              placeholder="Nome completo do físico médico"
            />
          </FormFieldShell>

          <FormFieldShell label="Registro profissional" error={erros.responsavelRegistro} hint={hintIa('responsavelRegistro')}>
            <Input
              value={responsavelRegistro}
              onChange={(e) => { setResponsavelRegistro(e.target.value); desmarcarIa('responsavelRegistro'); }}
              placeholder="Ex: ABFM RX 201/843"
            />
          </FormFieldShell>
        </div>

        <FormFieldShell label="Observações" error={erros.observacoes}>
          <Textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
          />
        </FormFieldShell>

        {/* Pendencias do laudo */}
        <FormFieldShell label="Pendências (recomendações do laudo)">
          <div className="space-y-2">
            {pendencias.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={p.descricao}
                  onChange={(e) => atualizarPendencia(i, e.target.value)}
                  placeholder='Ex: "Afixar símbolo de radiação ionizante na porta"'
                />
                <Button variant="ghost" onClick={() => removerPendencia(i)} aria-label="Remover">
                  <FontAwesomeIcon icon={faTrash} />
                </Button>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={adicionarPendencia}>
              <FontAwesomeIcon icon={faPlus} />
              <span className="ml-2">Adicionar pendência</span>
            </Button>
          </div>
        </FormFieldShell>

      </div>
    </Drawer>
  );
}

RegistrarTesteForm.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  equipamentos: PropTypes.array,
  equipamentoIdInicial: PropTypes.string,
  modalidadeInicial: PropTypes.string,
  testeBase: PropTypes.object,
  onCreated: PropTypes.func,
};

export default RegistrarTesteForm;
