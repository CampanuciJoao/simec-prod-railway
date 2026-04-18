import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip } from '@fortawesome/free-solid-svg-icons';

import {
  CompactAttachmentList,
  PageSection,
} from '@/components/ui';

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function buildAttachmentUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}/${String(path).replace(/^\/+/, '')}`;
}

function SeguroAnexosSection({ anexos = [], onUpload, onDelete }) {
  return (
    <PageSection
      title="Anexos do seguro"
      description="Envie apolices, comprovantes e documentos complementares."
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-full"
            style={{
              backgroundColor: 'var(--brand-primary-soft)',
              color: 'var(--brand-primary)',
            }}
          >
            <FontAwesomeIcon icon={faPaperclip} />
          </span>

          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Documentos vinculados ao seguro
            </p>
            <p
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              Mantenha os anexos centralizados no cadastro para consulta rapida.
            </p>
          </div>
        </div>

        <CompactAttachmentList
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
      </div>
    </PageSection>
  );
}

SeguroAnexosSection.propTypes = {
  anexos: PropTypes.array,
  onUpload: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default SeguroAnexosSection;
