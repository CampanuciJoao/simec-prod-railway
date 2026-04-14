import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getEquipamentoById,
  getOcorrenciasPorEquipamento,
  addOcorrencia,
  resolverOcorrencia,
} from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatarDataHora } from '../../utils/timeUtils';
import { getErrorMessage } from '../../utils/errorUtils';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faSave,
  faFileMedical,
  faCheckCircle,
  faExclamationTriangle,
  faChevronDown,
  faChevronUp,
  faCircleInfo,
} from '@fortawesome/free-solid-svg-icons';

import {
  PageLayout,
  PageHeader,
  PageSection,
  LoadingState,
  EmptyState,
  ResponsiveGrid,
  FormActions,
  ActionBar,
} from '../../components/ui/layout';

const TIPOS_OCORRENCIA = [
  'Operacional',
  'Falha',
  'Ajuste',
  'Manutencao',
  'Inspecao',
  'Observacao',
];

const ORIGENS = ['usuario', 'agente', 'sistema'];
const GRAVIDADES = ['baixa', 'media', 'alta'];

function getGravidadeBadgeClass(gravidade) {
  const valor = String(gravidade || '').toLowerCase();

  if (valor === 'alta') return 'badge badge-red';
  if (valor === 'media') return 'badge badge-yellow';
  if (valor === 'baixa') return 'badge badge-green';

  return 'badge badge-slate';
}

function FormField({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    />
  );
}

function SelectInput({ children, ...props }) {
  return (
    <select
      {...props}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    >
      {children}
    </select>
  );
}

function TextareaInput(props) {
  return (
    <textarea
      {...props}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    />
  );
}

function FichaTecnicaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [equipamento, setEquipamento] = useState(null);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [itensExpandidos, setItensExpandidos] = useState(new Set());
  const [resolvendoId, setResolvendoId] = useState(null);
  const [dadosSolucao, setDadosSolucao] = useState({});

  const [novoEvento, setNovoEvento] = useState({
    titulo: '',
    descricao: '',
    tipo: 'Operacional',
    tecnico: '',
    origem: 'usuario',
    gravidade: 'media',
    metadataTexto: '',
  });

  const carregarDados = useCallback(async () => {
    setLoading(true);

    try {
      const [equip, lista] = await Promise.all([
        getEquipamentoById(id),
        getOcorrenciasPorEquipamento(id),
      ]);

      setEquipamento(equip || null);
      setOcorrencias(Array.isArray(lista) ? lista : []);
    } catch (err) {
      addToast(getErrorMessage(err, 'Erro ao carregar dados.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const toggleExpandir = (itemId) => {
    setItensExpandidos((prev) => {
      const next = new Set(prev);

      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }

      return next;
    });
  };

  const handleEventoChange = (e) => {
    const { name, value } = e.target;
    setNovoEvento((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmitEvento = async (e) => {
    e.preventDefault();

    if (!novoEvento.titulo.trim()) {
      addToast('Título do evento é obrigatório.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      let metadata = null;

      if (novoEvento.metadataTexto.trim()) {
        try {
          metadata = JSON.parse(novoEvento.metadataTexto);
        } catch {
          addToast('metadata deve ser um JSON válido.', 'error');
          setSubmitting(false);
          return;
        }
      }

      const criado = await addOcorrencia({
        equipamentoId: id,
        titulo: novoEvento.titulo.trim(),
        descricao: novoEvento.descricao.trim(),
        tipo: novoEvento.tipo,
        tecnico: novoEvento.tecnico.trim(),
        origem: novoEvento.origem,
        gravidade: novoEvento.gravidade,
        metadata,
      });

      addToast('Evento registrado com sucesso!', 'success');

      setNovoEvento({
        titulo: '',
        descricao: '',
        tipo: 'Operacional',
        tecnico: '',
        origem: 'usuario',
        gravidade: 'media',
        metadataTexto: '',
      });

      setOcorrencias((prev) => [criado, ...prev]);
    } catch (err) {
      addToast(getErrorMessage(err, 'Erro ao registrar evento.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSolucaoChange = (ocorrenciaId, campo, valor) => {
    setDadosSolucao((prev) => ({
      ...prev,
      [ocorrenciaId]: {
        ...prev[ocorrenciaId],
        [campo]: valor,
      },
    }));
  };

  const handleSalvarSolucao = async (ocorrenciaId) => {
    const payload = dadosSolucao[ocorrenciaId] || {};

    if (!payload.solucao || !payload.solucao.trim()) {
      addToast('Descreva a solução.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const atualizada = await resolverOcorrencia(ocorrenciaId, {
        solucao: payload.solucao.trim(),
        tecnicoResolucao: String(payload.tecnicoResolucao || '').trim(),
      });

      addToast('Evento resolvido com sucesso!', 'success');

      setOcorrencias((prev) =>
        prev.map((item) => (item.id === ocorrenciaId ? atualizada : item))
      );

      setDadosSolucao((prev) => {
        const next = { ...prev };
        delete next[ocorrenciaId];
        return next;
      });

      setResolvendoId(null);
    } catch (err) {
      addToast(getErrorMessage(err, 'Erro ao salvar solução.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader title="Ficha Técnica" icon={faFileMedical} />
        <LoadingState message="Carregando ficha técnica..." />
      </PageLayout>
    );
  }

  if (!equipamento) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader title="Ficha Técnica" icon={faFileMedical} />
        <EmptyState message="Equipamento não encontrado." />
      </PageLayout>
    );
  }

  return (
    <PageLayout background="slate" padded fullHeight>
      <PageHeader
        title={`Ficha Técnica: ${equipamento.modelo}`}
        subtitle={`Tag: ${equipamento.tag || 'N/A'} • Registro operacional rápido do equipamento`}
        icon={faFileMedical}
        actions={
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/equipamentos')}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Voltar
          </button>
        }
      />

      <PageSection
        title="Registrar evento"
        description="Cadastre rapidamente ocorrências, falhas, ajustes, inspeções e observações do equipamento."
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <FontAwesomeIcon icon={faCircleInfo} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Event Log operacional
            </p>
            <p className="text-sm text-slate-500">
              Esta base será útil para rastreabilidade, análise técnica e IA futura.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmitEvento} className="space-y-5">
          <ResponsiveGrid preset="form">
            <FormField label="Título">
              <TextInput
                name="titulo"
                value={novoEvento.titulo}
                onChange={handleEventoChange}
                placeholder="Ex.: Ruído intermitente no gantry"
                required
              />
            </FormField>

            <FormField label="Tipo">
              <SelectInput
                name="tipo"
                value={novoEvento.tipo}
                onChange={handleEventoChange}
              >
                {TIPOS_OCORRENCIA.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <FormField label="Origem">
              <SelectInput
                name="origem"
                value={novoEvento.origem}
                onChange={handleEventoChange}
              >
                {ORIGENS.map((origem) => (
                  <option key={origem} value={origem}>
                    {origem}
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <FormField label="Gravidade">
              <SelectInput
                name="gravidade"
                value={novoEvento.gravidade}
                onChange={handleEventoChange}
              >
                {GRAVIDADES.map((gravidade) => (
                  <option key={gravidade} value={gravidade}>
                    {gravidade}
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <FormField label="Responsável / Técnico">
              <TextInput
                name="tecnico"
                value={novoEvento.tecnico}
                onChange={handleEventoChange}
                placeholder="Ex.: João Marcos"
              />
            </FormField>
          </ResponsiveGrid>

          <FormField label="Descrição">
            <TextareaInput
              name="descricao"
              value={novoEvento.descricao}
              onChange={handleEventoChange}
              rows={4}
              placeholder="Descreva o evento técnico observado..."
            />
          </FormField>

          <FormField label="Metadata JSON">
            <TextareaInput
              name="metadataTexto"
              value={novoEvento.metadataTexto}
              onChange={handleEventoChange}
              rows={5}
              placeholder='Ex.: { "temperaturaSala": 21, "mensagemPainel": "E104", "turno": "noite" }'
            />
          </FormField>

          <FormActions
            onSubmit={handleSubmitEvento}
            onCancel={() => navigate('/equipamentos')}
            loading={submitting}
            submitLabel="Salvar evento"
            cancelLabel="Cancelar"
            align="right"
          />
        </form>
      </PageSection>

      <PageSection
        title={`Histórico operacional (${ocorrencias.length})`}
        description="Linha do tempo de eventos técnicos e operacionais do equipamento."
      >
        {ocorrencias.length === 0 ? (
          <EmptyState message="Nenhum evento registrado para este equipamento." />
        ) : (
          <div className="space-y-4">
            {ocorrencias.map((item) => {
              const expandido = itensExpandidos.has(item.id);
              const payloadSolucao = dadosSolucao[item.id] || {};

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left hover:bg-slate-50"
                    onClick={() => toggleExpandir(item.id)}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          item.resolvido
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        <FontAwesomeIcon
                          icon={item.resolvido ? faCheckCircle : faExclamationTriangle}
                        />
                      </span>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {item.titulo}
                          </p>

                          <span className="badge badge-slate">{item.tipo}</span>
                          <span className={getGravidadeBadgeClass(item.gravidade)}>
                            {item.gravidade || 'media'}
                          </span>
                          <span className="badge badge-blue">
                            {item.origem || 'usuario'}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>{formatarDataHora(item.data)}</span>
                          <span>Técnico: {item.tecnico || 'N/A'}</span>
                          <span>
                            Status: {item.resolvido ? 'Resolvido' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="pt-1 text-slate-400">
                      <FontAwesomeIcon
                        icon={expandido ? faChevronUp : faChevronDown}
                      />
                    </span>
                  </button>

                  {expandido ? (
                    <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-4">
                      <div className="space-y-4">
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                            Descrição
                          </span>
                          <p className="mt-2 text-sm text-slate-700">
                            {item.descricao || 'Sem descrição.'}
                          </p>
                        </div>

                        {item.metadata ? (
                          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                              Metadata
                            </span>
                            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
{JSON.stringify(item.metadata, null, 2)}
                            </pre>
                          </div>
                        ) : null}

                        {item.resolvido ? (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                              Solução
                            </span>
                            <p className="mt-2 text-sm text-emerald-800">
                              {item.solucao}
                            </p>
                            <p className="mt-2 text-xs text-emerald-700">
                              Técnico de resolução: {item.tecnicoResolucao || 'N/A'}
                            </p>
                          </div>
                        ) : resolvendoId === item.id ? (
                          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="space-y-3">
                              <FormField label="Solução">
                                <TextareaInput
                                  rows={4}
                                  value={payloadSolucao.solucao || ''}
                                  onChange={(e) =>
                                    handleSolucaoChange(item.id, 'solucao', e.target.value)
                                  }
                                  placeholder="Descreva a solução aplicada..."
                                />
                              </FormField>

                              <FormField label="Técnico de resolução">
                                <TextInput
                                  value={payloadSolucao.tecnicoResolucao || ''}
                                  onChange={(e) =>
                                    handleSolucaoChange(
                                      item.id,
                                      'tecnicoResolucao',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Nome do técnico"
                                />
                              </FormField>

                              <ActionBar
                                right={
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      onClick={() => setResolvendoId(null)}
                                    >
                                      Cancelar
                                    </button>

                                    <button
                                      type="button"
                                      className="btn btn-success"
                                      onClick={() => handleSalvarSolucao(item.id)}
                                      disabled={submitting}
                                    >
                                      Confirmar resolução
                                    </button>
                                  </>
                                }
                              />
                            </div>
                          </div>
                        ) : (
                          <ActionBar
                            right={
                              <button
                                type="button"
                                className="btn btn-outline-success"
                                onClick={() => setResolvendoId(item.id)}
                              >
                                Resolver evento
                              </button>
                            }
                          />
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </PageSection>
    </PageLayout>
  );
}

export default FichaTecnicaPage;