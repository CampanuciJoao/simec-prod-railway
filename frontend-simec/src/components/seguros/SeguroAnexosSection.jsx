import PropTypes from 'prop-types';

import { AttachmentSection } from '@/components/ui';

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function buildAttachmentUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}/${String(path).replace(/^\/+/, '')}`;
}

function SeguroAnexosSection({ anexos = [], onUpload, onDelete }) {
  return (
    <AttachmentSection
      title="Anexos do seguro"
      description="Envie apolices, comprovantes e documentos complementares."
      summaryTitle="Documentos vinculados ao seguro"
      summaryText="Mantenha os anexos centralizados no cadastro para consulta rapida."
      attachments={anexos}
      uploadLabel="Anexar documento"
      emptyMessage="Nenhum anexo enviado para este seguro."
      onUpload={onUpload}
      onDelete={(attachment) => onDelete(attachment.id)}
      getAttachmentName={(attachment) =>
        attachment.nomeOriginal || attachment.name || 'Arquivo'
      }
      getAttachmentUrl={(attachment) => buildAttachmentUrl(attachment.path)}
    />
  );
}

SeguroAnexosSection.propTypes = {
  anexos: PropTypes.array,
  onUpload: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default SeguroAnexosSection;
