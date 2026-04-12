import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faArrowLeft,
  faShieldAlt,
  faFilePdf,
  faPaperclip,
} from '@fortawesome/free-solid-svg-icons';
import { getSeguroById } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatarData } from '../../utils/timeUtils';

import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/ui/PageSection';
import PageState from '../../components/ui/PageState';

function getAnexoNome(anexo) {
  return (
    anexo?.nome ||
    anexo?.nomeArquivo ||
    anexo?.filename ||
    anexo?.fileName ||
    `Anexo #${anexo?.id ?? ''}`
  );
}

function getAnexoUrl(anexo) {
  return (
    anexo?.url ||
    anexo?.arquivoUrl ||
    anexo?.downloadUrl ||
    anexo?.caminhoArquivo ||
    null
  );
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function DetalhesSeguroPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [seguro, setSeguro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSeguroDetails() {
      try {
        setLoading(true);
        const data = await getSeguroById(id);
        setSeguro(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Erro ao carregar detalhes do seguro.');
        addToast('Erro ao carregar detalhes do seguro.', 'error');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchSeguroDetails();
    }
  }, [id, addToast]);

  const coberturas = [
    { label: 'Incêndio / explosão', value: seguro?.lmiIncendio },
    { label: 'Danos elétricos', value: seguro?.lmiDanosEletricos },
    { label: 'Roubo / furto', value: seguro?.lmiRoubo },
    { label: 'Vidros', value: seguro?.lmiVidros },
    { label: 'Responsabilidade civil', value: seguro?.lmiResponsabilidadeCivil },
    { label: 'Danos materiais', value: seguro?.lmiDanosMateriais },
    { label: 'Danos corporais', value: seguro?.lmiDanosCorporais },
    { label: 'Danos morais', value: seguro?.lmiDanosMorais },
    { label: 'APP', value: seguro?.lmiAPP },
  ].filter((item) => Number(item.value || 0) > 0);

  if (loading) {
    return (
      <PageLayout background="slate" padded fullHeight contentClassName="page-stack">
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
      <PageLayout background="slate" padded fullHeight contentClassName="page-stack">
        <PageHeader
          title="Erro"
          subtitle="Não foi possível carregar os detalhes do seguro"
          icon={faShieldAlt}
          actions={
            <button className="btn btn-secondary" onClick={() => navigate('/seguros')}>
              <FontAwesomeIcon icon={faArrowLeft} />
              Voltar para Seguros
            </button>
          }
        />
        <PageState error={error} />
      </PageLayout>
    );
  }

  if (!seguro) {
    return (
      <PageLayout background="slate" padded fullHeight contentClassName="page-stack">
        <PageHeader
          title="Não encontrado"
          subtitle="O seguro solicitado não foi localizado"
          icon={faShieldAlt}
          actions={
            <button className="btn btn-secondary" onClick={() => navigate('/seguros')}>
              <FontAwesomeIcon icon={faArrowLeft} />
              Voltar para Seguros
            </button>
          }
        />
        <PageState isEmpty emptyMessage="O seguro solicitado não foi encontrado." />
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
        title={`Detalhes do Seguro: ${seguro.apoliceNumero}`}
        subtitle="Visualização completa da apólice, vínculo, coberturas e anexos"
        icon={faShieldAlt}
        actions={
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-secondary" onClick={() => navigate('/seguros')}>
              <FontAwesomeIcon icon={faArrowLeft} />
              Voltar
            </button>

            <button
              className="btn btn-primary"
              onClick={() => navigate(`/seguros/editar/${seguro.id}`)}
            >
              Editar seguro
            </button>
          </div>
        }
      />

      <PageSection
        title="Informações da apólice"
        description="Dados principais de identificação, vigência e vínculo."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Número da apólice
            </p>
            <p className="mt-1 text-base font-bold text-slate-900">
              {seguro.apoliceNumero}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Seguradora
            </p>
            <p className="mt-1 text-base font-bold text-slate-900">
              {seguro.seguradora}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </p>
            <p className="mt-1 text-base font-bold text-slate-900">
              {seguro.status || 'Não informado'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Início da vigência
            </p>
            <p className="mt-1 text-base font-bold text-slate-900">
              {formatarData(seguro.dataInicio)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Fim da vigência
            </p>
            <p className="mt-1 text-base font-bold text-slate-900">
              {formatarData(seguro.dataFim)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Prêmio total
            </p>
            <p className="mt-1 text-base font-bold text-slate-900">
              {formatarMoeda(seguro.premioTotal)}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Vínculo
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800">
            {seguro.equipamento
              ? `Equipamento: ${seguro.equipamento.modelo} (Tag: ${seguro.equipamento.tag})`
              : seguro.unidade
                ? `Unidade: ${seguro.unidade.nomeSistema || seguro.unidade.nome || 'Não informada'}`
                : 'Nenhum vínculo específico'}
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Observações da cobertura
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {seguro.cobertura || 'Nenhuma observação cadastrada.'}
          </p>
        </div>
      </PageSection>

      <PageSection
        title="Coberturas e valores"
        description="Valores detalhados cadastrados por categoria."
      >
        {coberturas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
            Nenhuma cobertura com valor foi cadastrada para esta apólice.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {coberturas.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {item.label}
                </p>
                <p className="mt-1 text-base font-bold text-slate-900">
                  {formatarMoeda(item.value)}
                </p>
              </div>
            ))}
          </div>
        )}
      </PageSection>

      <PageSection
        title="Anexos da apólice"
        description="Arquivos enviados para este seguro."
      >
        {!Array.isArray(seguro.anexos) || seguro.anexos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
            Nenhum anexo encontrado para esta apólice.
          </div>
        ) : (
          <div className="space-y-3">
            {seguro.anexos.map((anexo) => {
              const anexoUrl = getAnexoUrl(anexo);

              return (
                <div
                  key={anexo.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                      <FontAwesomeIcon icon={faFilePdf} />
                    </span>

                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {getAnexoNome(anexo)}
                      </p>
                      <p className="text-xs text-slate-500">
                        ID do anexo: {anexo.id}
                      </p>
                    </div>
                  </div>

                  {anexoUrl ? (
                    <a
                      href={anexoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary"
                    >
                      <FontAwesomeIcon icon={faPaperclip} />
                      Abrir anexo
                    </a>
                  ) : (
                    <span className="text-sm text-slate-400">
                      Arquivo sem URL pública disponível
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PageSection>
    </PageLayout>
  );
}

export default DetalhesSeguroPage;