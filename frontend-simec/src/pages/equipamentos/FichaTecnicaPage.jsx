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

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faSave,
  faSpinner,
  faFileMedical,
  faHistory,
  faCheckCircle,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';

import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/ui/PageSection';
import PageState from '../../components/ui/PageState';

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
  const [dadosSolucao, setDadosSolucao] = useState({
    solucao: '',
    tecnicoResolucao: '',
  });

  const [novaOcorrencia, setNovaOcorrencia] = useState({
    titulo: '',
    descricao: '',
    tipo: 'Operacional',
    tecnico: '',
  });

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [equip, lista] = await Promise.all([
        getEquipamentoById(id),
        getOcorrenciasPorEquipamento(id),
      ]);
      setEquipamento(equip);
      setOcorrencias(lista);
    } catch {
      addToast('Erro ao carregar dados.', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const toggleExpandir = (id) => {
    const set = new Set(itensExpandidos);
    set.has(id) ? set.delete(id) : set.add(id);
    setItensExpandidos(set);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await addOcorrencia({ ...novaOcorrencia, equipamentoId: id });
      addToast('Ocorrência registrada!', 'success');
      setNovaOcorrencia({
        titulo: '',
        descricao: '',
        tipo: 'Operacional',
        tecnico: '',
      });
      carregarDados();
    } catch {
      addToast('Erro ao salvar.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSalvarSolucao = async (idOcorr) => {
    if (!dadosSolucao.solucao.trim()) {
      return addToast('Descreva a solução.', 'error');
    }

    setSubmitting(true);

    try {
      await resolverOcorrencia(idOcorr, dadosSolucao);
      addToast('Ocorrência resolvida!', 'success');
      setResolvendoId(null);
      setDadosSolucao({ solucao: '', tecnicoResolucao: '' });
      carregarDados();
    } catch {
      addToast('Erro ao salvar.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageLayout background="slate" padded fullHeight contentClassName="page-stack">
        <PageHeader title="Ficha Técnica" />
        <PageState loading />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      background="slate"
      padded
      fullHeight
      contentClassName="page-stack content-fade-in"
    >
      <PageHeader
        title={`Ficha Técnica: ${equipamento?.modelo}`}
        subtitle="Histórico operacional e ocorrências"
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

      {/* REGISTRAR OCORRÊNCIA */}
      <PageSection title="Registrar ocorrência">
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 md:grid-cols-2"
        >
          <input
            placeholder="Título do evento"
            value={novaOcorrencia.titulo}
            onChange={(e) =>
              setNovaOcorrencia({ ...novaOcorrencia, titulo: e.target.value })
            }
            className="input"
            required
          />

          <select
            value={novaOcorrencia.tipo}
            onChange={(e) =>
              setNovaOcorrencia({ ...novaOcorrencia, tipo: e.target.value })
            }
            className="input"
          >
            <option>Operacional</option>
            <option>Ajuste</option>
            <option>Infraestrutura</option>
          </select>

          <input
            placeholder="Responsável"
            value={novaOcorrencia.tecnico}
            onChange={(e) =>
              setNovaOcorrencia({ ...novaOcorrencia, tecnico: e.target.value })
            }
            className="input"
          />

          <textarea
            placeholder="Descrição"
            value={novaOcorrencia.descricao}
            onChange={(e) =>
              setNovaOcorrencia({
                ...novaOcorrencia,
                descricao: e.target.value,
              })
            }
            className="input md:col-span-2"
          />

          <button
            className="btn btn-primary md:col-span-2"
            disabled={submitting}
          >
            <FontAwesomeIcon icon={faSave} />
            Salvar no histórico
          </button>
        </form>
      </PageSection>

      {/* HISTÓRICO */}
      <PageSection title="Histórico de vida">
        <div className="space-y-4">
          {ocorrencias.map((item) => {
            const expandido = itensExpandidos.has(item.id);

            return (
              <div
                key={item.id}
                className="rounded-xl border bg-white p-4 shadow-sm"
              >
                {/* HEADER */}
                <div
                  className="flex cursor-pointer items-center justify-between"
                  onClick={() => toggleExpandir(item.id)}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full p-2 ${
                        item.resolvido
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      <FontAwesomeIcon
                        icon={
                          item.resolvido
                            ? faCheckCircle
                            : faExclamationTriangle
                        }
                      />
                    </span>

                    <div>
                      <p className="text-xs text-slate-500">
                        {formatarDataHora(item.data)}
                      </p>
                      <p className="font-semibold">{item.titulo}</p>
                    </div>
                  </div>
                </div>

                {/* BODY */}
                {expandido && (
                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p>
                      <strong>Descrição:</strong> {item.descricao || '-'}
                    </p>
                    <p>
                      <strong>Responsável:</strong> {item.tecnico || '-'}
                    </p>

                    {item.resolvido ? (
                      <div className="rounded-lg bg-emerald-50 p-3">
                        <p className="font-semibold text-emerald-700">
                          Solução
                        </p>
                        <p>{item.solucao}</p>
                      </div>
                    ) : resolvendoId === item.id ? (
                      <div className="space-y-2">
                        <textarea
                          className="input"
                          placeholder="Solução"
                          value={dadosSolucao.solucao}
                          onChange={(e) =>
                            setDadosSolucao({
                              ...dadosSolucao,
                              solucao: e.target.value,
                            })
                          }
                        />

                        <input
                          className="input"
                          placeholder="Técnico"
                          value={dadosSolucao.tecnicoResolucao}
                          onChange={(e) =>
                            setDadosSolucao({
                              ...dadosSolucao,
                              tecnicoResolucao: e.target.value,
                            })
                          }
                        />

                        <div className="flex gap-2">
                          <button
                            className="btn btn-success"
                            onClick={() => handleSalvarSolucao(item.id)}
                          >
                            Confirmar
                          </button>

                          <button
                            className="btn btn-secondary"
                            onClick={() => setResolvendoId(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="btn btn-outline-success"
                        onClick={(e) => {
                          e.stopPropagation();
                          setResolvendoId(item.id);
                        }}
                      >
                        Resolver problema
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </PageSection>
    </PageLayout>
  );
}

export default FichaTecnicaPage;