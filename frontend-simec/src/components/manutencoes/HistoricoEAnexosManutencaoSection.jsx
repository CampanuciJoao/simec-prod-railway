import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaperclip,
  faTimeline,
  faUpload,
  faTrashAlt,
  faPlus,
  faFileLines,
  faClock,
} from '@fortawesome/free-solid-svg-icons';

import Button from '../ui/Button';
import PageSection from '../ui/PageSection';

function formatarDataHora(data) {
  if (!data) return '-';

  try {
    return new Date(data).toLocaleString('pt-BR');
  } catch {
    return '-';
  }
}

function getNomeArquivo(anexo) {
  return (
    anexo?.nomeOriginal ||
    anexo?.filename ||
    anexo?.nome ||
    anexo?.arquivoNome ||
    'Arquivo'
  );
}

function getLinkArquivo(anexo) {
  return (
    anexo?.url ||
    anexo?.link ||
    anexo?.path ||
    anexo?.arquivoUrl ||
    '#'
  );
}

function HistoricoEAnexosManutencaoSection({
  manutencao,
  onAdicionarNota,
  onUploadAnexos,
  onRemoverAnexo,
  submitting = false,
}) {
  const [nota, setNota] = useState('');
  const [arquivos, setArquivos] = useState([]);

  const historicoOrdenado = useMemo(() => {
    const lista =
      manutencao?.notasAndamento ||
      manutencao?.andamentos ||
      manutencao?.historicoAndamento ||
      [];

    return [...lista].sort((a, b) => {
      const da = new Date(a?.createdAt || a?.data || a?.dataHora || 0).getTime();
      const db = new Date(b?.createdAt || b?.data || b?.dataHora || 0).getTime();
      return db - da;
    });
  }, [manutencao]);

  const anexos = useMemo(() => {
    return manutencao?.anexos || [];
  }, [manutencao]);

  const handleAdicionarNota = async (e) => {
    e.preventDefault();

    const texto = nota.trim();
    if (!texto) return;

    await onAdicionarNota(texto);
    setNota('');
  };

  const handleArquivosChange = (e) => {
    setArquivos(Array.from(e.target.files || []));
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!arquivos.length) return;

    const formData = new FormData();
    arquivos.forEach((arquivo) => {
      formData.append('files', arquivo);
    });

    await onUploadAnexos(formData);
    setArquivos([]);
    e.target.reset?.();
  };

  return (
    <div className="space-y-6">
      <PageSection
        title="Histórico de andamento"
        description="Registre acontecimentos, observações técnicas e evolução da OS."
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <FontAwesomeIcon icon={faTimeline} />
          </span>

          <div>
            <p className="text-sm font-semibold text-slate-900">
              Acontecimentos da manutenção
            </p>
            <p className="text-sm text-slate-500">
              Use esta área para registrar visitas, testes, peças, observações e andamento.
            </p>
          </div>
        </div>

        <form onSubmit={handleAdicionarNota} className="mb-6 space-y-3">
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={4}
            disabled={submitting}
            placeholder="Ex.: Equipamento reiniciado, teste funcional executado, aguardando peça, visita técnica realizada..."
            className="min-h-[110px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting || !nota.trim()}>
              <FontAwesomeIcon icon={faPlus} />
              Registrar acontecimento
            </Button>
          </div>
        </form>

        {historicoOrdenado.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Nenhum acontecimento registrado nesta OS.
          </div>
        ) : (
          <div className="space-y-3">
            {historicoOrdenado.map((item) => {
              const texto =
                item?.nota ||
                item?.descricao ||
                item?.mensagem ||
                item?.texto ||
                '-';

              const data =
                item?.createdAt ||
                item?.data ||
                item?.dataHora ||
                null;

              const autor =
                item?.autor?.nome ||
                item?.usuario?.nome ||
                item?.tecnico ||
                item?.autorNome ||
                null;

              return (
                <div
                  key={item.id || `${texto}-${data}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <FontAwesomeIcon icon={faClock} />
                      {formatarDataHora(data)}
                    </span>

                    {autor ? (
                      <span className="text-xs font-medium text-slate-500">
                        Por: {autor}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                    {texto}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </PageSection>

      <PageSection
        title="Anexos da OS"
        description="Envie laudos, imagens, relatórios, orçamentos, PDFs e demais arquivos vinculados à manutenção."
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <FontAwesomeIcon icon={faPaperclip} />
          </span>

          <div>
            <p className="text-sm font-semibold text-slate-900">
              Arquivos vinculados à ordem de serviço
            </p>
            <p className="text-sm text-slate-500">
              Todos os anexos enviados ficam registrados diretamente nesta manutenção.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpload} className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Selecionar arquivos
              </label>

              <input
                type="file"
                multiple
                onChange={handleArquivosChange}
                disabled={submitting}
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700"
              />

              {arquivos.length > 0 ? (
                <p className="mt-2 text-xs text-slate-500">
                  {arquivos.length} arquivo(s) selecionado(s)
                </p>
              ) : null}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting || arquivos.length === 0}>
                <FontAwesomeIcon icon={faUpload} />
                Enviar anexo(s)
              </Button>
            </div>
          </div>
        </form>

        {anexos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Nenhum anexo enviado para esta OS.
          </div>
        ) : (
          <div className="space-y-3">
            {anexos.map((anexo) => (
              <div
                key={anexo.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faFileLines} className="text-slate-400" />
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {getNomeArquivo(anexo)}
                    </p>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Enviado em {formatarDataHora(anexo.createdAt || anexo.data)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={getLinkArquivo(anexo)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600 no-underline transition hover:bg-blue-600 hover:text-white"
                  >
                    <FontAwesomeIcon icon={faEye} />
                    Abrir
                  </a>

                  <button
                    type="button"
                    onClick={() => onRemoverAnexo(anexo.id)}
                    disabled={submitting}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    title="Excluir anexo"
                  >
                    <FontAwesomeIcon icon={faTrashAlt} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageSection>
    </div>
  );
}

HistoricoEAnexosManutencaoSection.propTypes = {
  manutencao: PropTypes.object,
  onAdicionarNota: PropTypes.func.isRequired,
  onUploadAnexos: PropTypes.func.isRequired,
  onRemoverAnexo: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
};

export default HistoricoEAnexosManutencaoSection;