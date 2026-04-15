import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faShieldAlt,
  faPaperclip,
  faFilePdf,
  faBuilding,
  faCalendarDays,
  faCircleInfo,
  faLink,
} from '@fortawesome/free-solid-svg-icons';

import { getSeguroById } from '../../services/api';
import { formatarData } from '../../utils/timeUtils';
import { getCoberturasAtivas, TIPO_SEGURO_OPTIONS } from '../../utils/seguros';

import PageLayout from '../../components/ui/layout/PageLayout';
import PageHeader from '../../components/ui/layout/PageHeader';
import PageSection from '../../components/ui/layout/PageSection';
import ResponsiveGrid from '../../components/ui/layout/ResponsiveGrid';
import PageState from '../../components/ui/feedback/PageState';
import Button from '../../components/ui/primitives/Button';

function getAnexoNome(anexo) {
  return (
    anexo?.nome ||
    anexo?.nomeArquivo ||
    anexo?.filename ||
    anexo?.fileName ||
    anexo?.nomeOriginal ||
    `Anexo #${anexo?.id ?? ''}`
  );
}

function getAnexoUrl(anexo) {
  return (
    anexo?.url ||
    anexo?.arquivoUrl ||
    anexo?.downloadUrl ||
    anexo?.caminhoArquivo ||
    anexo?.path ||
    null
  );
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function getNomeUnidade(seguro) {
  if (typeof seguro?.unidade === 'string') return seguro.unidade;
  if (seguro?.unidade?.nomeSistema) return seguro.unidade.nomeSistema;
  if (seguro?.unidade?.nome) return seguro.unidade.nome;
  if (seguro?.equipamento?.unidade?.nomeSistema) {
    return seguro.equipamento.unidade.nomeSistema;
  }
  return 'Não vinculado';
}

function getNomeVinculo(seguro) {
  if (seguro?.equipamento?.modelo) {
    return `${seguro.equipamento.modelo}${seguro.equipamento?.tag ? ` (${seguro.equipamento.tag})` : ''}`;
  }

  if (seguro?.unidade?.nomeSistema) {
    return seguro.unidade.nomeSistema;
  }

  if (seguro?.unidade?.nome) {
    return seguro.unidade.nome;
  }

  return seguro?.nomeVinculo || 'Geral';
}

function getTipoVinculo(seguro) {
  if (seguro?.equipamentoId || seguro?.equipamento?.id) return 'Equipamento';
  if (seguro?.unidadeId || seguro?.unidade?.id) return 'Unidade';
  return 'Geral';
}

function getTipoSeguroLabel(tipoSeguro) {
  const option = TIPO_SEGURO_OPTIONS.find((item) => item.value === tipoSeguro);
  return option?.label || tipoSeguro || 'Não informado';
}

function InfoCard({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <FontAwesomeIcon icon={icon} className="text-xs" />
        <span className="text-[11px] font-bold uppercase tracking-[0.14em]">
          {label}
        </span>
      </div>

      <div className="mt-2 break-words text-sm font-medium text-slate-800">
        {value || 'N/A'}
      </div>
    </div>
  );
}

function DetalhesSeguroPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [seguro, setSeguro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchSeguroDetails() {
      try {
        setLoading(true);
        setError('');
        const data = await getSeguroById(id);
        setSeguro(data || null);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Erro ao carregar detalhes do seguro.'
        );
        setSeguro(null);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchSeguroDetails();
    }
  }, [id]);

  const coberturas = useMemo(() => {
    return getCoberturasAtivas(seguro || {});
  }, [seguro]);

  if (loading) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title="Detalhes do Seguro"
          subtitle="Carregando informações da apólice"
          icon={faShieldAlt}
        />
        <PageState loading />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title="Erro"
          subtitle="Não foi possível carregar os detalhes do seguro"
          icon={faShieldAlt}
          actions={
            <Button variant="secondary" onClick={() => navigate('/seguros')}>
              <FontAwesomeIcon icon={faArrowLeft} />
              Voltar para Seguros
            </Button>
          }
        />
        <PageState error={error} />
      </PageLayout>
    );
  }

  if (!seguro) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title="Não encontrado"
          subtitle="O seguro solicitado não foi localizado"
          icon={faShieldAlt}
          actions={
            <Button variant="secondary" onClick={() => navigate('/seguros')}>
              <FontAwesomeIcon icon={faArrowLeft} />
              Voltar para Seguros
            </Button>
          }
        />
        <PageState isEmpty emptyMessage="O seguro solicitado não foi encontrado." />
      </PageLayout>
    );
  }

  return (
    <PageLayout background="slate" padded fullHeight>
      <div className="space-y-6">
        <PageHeader
          title={`Detalhes do Seguro: ${seguro.apoliceNumero}`}
          subtitle="Visualização completa da apólice, vínculo, coberturas e anexos"
          icon={faShieldAlt}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => navigate('/seguros')}>
                <FontAwesomeIcon icon={faArrowLeft} />
                Voltar
              </Button>

              <Button onClick={() => navigate(`/seguros/editar/${seguro.id}`)}>
                Editar seguro
              </Button>
            </div>
          }
        />

        <PageSection
          title="Informações da apólice"
          description="Dados principais de identificação, vigência e vínculo."
        >
          <ResponsiveGrid cols={{ base: 1, md: 2, xl: 3 }}>
            <InfoCard
              icon={faShieldAlt}
              label="Número da apólice"
              value={seguro.apoliceNumero}
            />
            <InfoCard
              icon={faBuilding}
              label="Seguradora"
              value={seguro.seguradora}
            />
            <InfoCard
              icon={faCircleInfo}
              label="Status"
              value={seguro.status || 'Não informado'}
            />
            <InfoCard
              icon={faCalendarDays}
              label="Início da vigência"
              value={formatarData(seguro.dataInicio)}
            />
            <InfoCard
              icon={faCalendarDays}
              label="Fim da vigência"
              value={formatarData(seguro.dataFim)}
            />
            <InfoCard
              icon={faCircleInfo}
              label="Prêmio total"
              value={formatarMoeda(seguro.premioTotal)}
            />
            <InfoCard
              icon={faCircleInfo}
              label="Tipo de seguro"
              value={getTipoSeguroLabel(seguro.tipoSeguro)}
            />
            <InfoCard
              icon={faLink}
              label="Tipo de vínculo"
              value={getTipoVinculo(seguro)}
            />
            <InfoCard
              icon={faBuilding}
              label="Unidade"
              value={getNomeUnidade(seguro)}
            />
            <InfoCard
              icon={faLink}
              label="Vínculo principal"
              value={getNomeVinculo(seguro)}
            />
          </ResponsiveGrid>

          {seguro.cobertura ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Observações complementares
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {seguro.cobertura}
              </p>
            </div>
          ) : null}
        </PageSection>

        <PageSection
          title="Coberturas contratadas"
          description="Somente coberturas coerentes com o tipo de seguro são exibidas."
        >
          {coberturas.length > 0 ? (
            <ResponsiveGrid cols={{ base: 1, md: 2, xl: 3 }}>
              {coberturas.map((item) => (
                <div
                  key={item.key}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-2 text-base font-bold text-slate-900">
                    {formatarMoeda(item.value)}
                  </p>
                </div>
              ))}
            </ResponsiveGrid>
          ) : (
            <PageState
              isEmpty
              emptyMessage="Nenhuma cobertura cadastrada para esta apólice."
            />
          )}
        </PageSection>

        <PageSection
          title="Anexos"
          description="Documentos vinculados à apólice."
        >
          {Array.isArray(seguro.anexos) && seguro.anexos.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {seguro.anexos.map((anexo) => {
                const url = getAnexoUrl(anexo);
                const nome = getAnexoNome(anexo);

                return (
                  <div
                    key={anexo.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-slate-800">
                        <FontAwesomeIcon icon={faPaperclip} className="text-slate-500" />
                        <span className="truncate font-medium">{nome}</span>
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {anexo.tipoMime || 'Documento'}
                      </div>
                    </div>

                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        <FontAwesomeIcon icon={faFilePdf} />
                        Abrir
                      </a>
                    ) : (
                      <span className="text-sm text-slate-400">Sem link disponível</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <PageState isEmpty emptyMessage="Nenhum anexo vinculado a esta apólice." />
          )}
        </PageSection>
      </div>
    </PageLayout>
  );
}

export default DetalhesSeguroPage;