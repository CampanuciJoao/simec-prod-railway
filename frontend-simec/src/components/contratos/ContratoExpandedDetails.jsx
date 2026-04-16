import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHospital,
  faMicrochip,
  faPaperclip,
  faUpload,
  faFilePdf,
  faExternalLinkAlt,
  faEdit,
  faTrashAlt,
} from '@fortawesome/free-solid-svg-icons';

import Button from '@/components/ui/primitives/Button';

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function ContratoExpandedDetails({
  contrato,
  uploadingId,
  onUploadArquivo,
  onDeleteAnexo,
  onEdit,
  onDelete,
}) {
  return (
    <div className="border-t border-slate-200 bg-slate-50/70 p-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h5 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <FontAwesomeIcon icon={faHospital} className="text-slate-500" />
            Unidades cobertas
          </h5>

          <div className="flex flex-wrap gap-2">
            {contrato.unidadesCobertas?.length > 0 ? (
              contrato.unidadesCobertas.map((unidade) => (
                <span
                  key={unidade.id}
                  className="inline-flex rounded-full bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200"
                >
                  {unidade.nomeSistema}
                </span>
              ))
            ) : (
              <p className="text-sm italic text-slate-400">
                Nenhuma unidade vinculada.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h5 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <FontAwesomeIcon icon={faMicrochip} className="text-slate-500" />
            Equipamentos vinculados ({contrato.equipamentosCobertos?.length || 0})
          </h5>

          <div className="max-h-[250px] overflow-y-auto pr-1">
            {contrato.equipamentosCobertos?.length > 0 ? (
              <div className="flex flex-col gap-2">
                {contrato.equipamentosCobertos.map((equipamento) => (
                  <div
                    key={equipamento.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-slate-800">
                      {equipamento.modelo}
                    </span>

                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                      {equipamento.tag}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-slate-400">
                Sem equipamentos específicos.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <h5 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <FontAwesomeIcon icon={faPaperclip} className="text-slate-500" />
          Documentos do contrato
        </h5>

        <div className="flex flex-col gap-3">
          {contrato.anexos?.length > 0 ? (
            contrato.anexos.map((anexo) => (
              <div
                key={anexo.id}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <a
                  href={`${API_BASE_URL}/${anexo.path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 no-underline hover:underline"
                >
                  <FontAwesomeIcon icon={faFilePdf} />
                  <span>{anexo.nomeOriginal}</span>
                  <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" />
                </a>

                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteAnexo(contrato.id, anexo.id);
                  }}
                >
                  <FontAwesomeIcon icon={faTrashAlt} />
                  Remover
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm italic text-slate-400">
              Nenhum documento anexado.
            </p>
          )}

          <div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              <FontAwesomeIcon
                icon={faUpload}
                spin={uploadingId === contrato.id}
              />
              {uploadingId === contrato.id
                ? 'Enviando...'
                : 'Enviar documento'}

              <input
                type="file"
                hidden
                onChange={(e) => onUploadArquivo(contrato.id, e)}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onEdit(contrato.id)}
        >
          <FontAwesomeIcon icon={faEdit} />
          Editar
        </Button>

        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={() => onDelete(contrato)}
        >
          <FontAwesomeIcon icon={faTrashAlt} />
          Excluir
        </Button>
      </div>
    </div>
  );
}

ContratoExpandedDetails.propTypes = {
  contrato: PropTypes.object.isRequired,
  uploadingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onUploadArquivo: PropTypes.func.isRequired,
  onDeleteAnexo: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default ContratoExpandedDetails;