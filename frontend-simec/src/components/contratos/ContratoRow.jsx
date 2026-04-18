import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlusCircle,
  faMinusCircle,
  faPaperclip,
} from '@fortawesome/free-solid-svg-icons';

import { formatarData } from '@/utils/timeUtils';
import {
  getDynamicStatus,
  getStatusBadgeVariant,
  getRowHighlightClass,
} from '@/utils/contratos';

import { Badge } from '@/components/ui';

import ContratoExpandedDetails from '@/components/contratos/ContratoExpandedDetails';

function ContratoRow({
  contrato,
  isAberto,
  onToggleExpandir,
  onUploadArquivo,
  onDeleteAnexo,
  onEdit,
  onDelete,
  uploadingId,
}) {
  const statusDinamico = getDynamicStatus(contrato);
  const badgeVariant = getStatusBadgeVariant(statusDinamico);

  return (
    <div
      className={[
        'overflow-hidden rounded-xl border-y border-r border-slate-200 border-l-[8px] bg-white shadow-sm transition-all hover:shadow-md',
        getRowHighlightClass(statusDinamico),
      ].join(' ')}
    >
      <div
        className="flex cursor-pointer flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between"
        onClick={() => onToggleExpandir(contrato.id)}
      >
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600">
            <FontAwesomeIcon icon={isAberto ? faMinusCircle : faPlusCircle} />
          </div>

          <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Nº Contrato
              </span>
              <div className="mt-1 text-base font-bold text-slate-900">
                {contrato.numeroContrato}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Fornecedor
              </span>
              <div className="mt-1 text-sm font-semibold text-slate-800">
                {contrato.fornecedor}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Categoria
              </span>
              <div className="mt-1 text-sm font-semibold text-slate-800">
                {contrato.categoria}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Vencimento
              </span>
              <div className="mt-1 text-sm font-semibold text-slate-800">
                {formatarData(contrato.dataFim)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Badge variant={badgeVariant}>{statusDinamico}</Badge>

          <FontAwesomeIcon
            icon={faPaperclip}
            className={
              contrato.anexos?.length > 0 ? 'text-green-500' : 'text-slate-300'
            }
            title={
              contrato.anexos?.length > 0 ? 'Documento anexado' : 'Sem anexo'
            }
          />
        </div>
      </div>

      {isAberto && (
        <ContratoExpandedDetails
          contrato={contrato}
          uploadingId={uploadingId}
          onUploadArquivo={onUploadArquivo}
          onDeleteAnexo={onDeleteAnexo}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

ContratoRow.propTypes = {
  contrato: PropTypes.object.isRequired,
  isAberto: PropTypes.bool.isRequired,
  onToggleExpandir: PropTypes.func.isRequired,
  onUploadArquivo: PropTypes.func.isRequired,
  onDeleteAnexo: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  uploadingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default ContratoRow;
