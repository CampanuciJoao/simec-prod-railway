import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip } from '@fortawesome/free-solid-svg-icons';

import CompactAttachmentList from './CompactAttachmentList';
import PageSection from '../layout/PageSection';

const toneStyleMap = {
  brand: {
    backgroundColor: 'var(--brand-primary-soft)',
    color: 'var(--brand-primary)',
  },
  danger: {
    backgroundColor: 'var(--color-danger-soft)',
    color: 'var(--color-danger)',
  },
  muted: {
    backgroundColor: 'var(--bg-surface-subtle)',
    color: 'var(--text-muted)',
  },
};

function AttachmentSection({
  title = 'Anexos',
  description = '',
  summaryTitle = 'Documentos anexados',
  summaryText = '',
  icon = faPaperclip,
  iconTone = 'brand',
  attachments = [],
  uploadLabel = 'Anexar arquivo',
  emptyMessage = 'Nenhum anexo enviado.',
  isUploading = false,
  isDeleting = false,
  multiple = false,
  onUpload,
  onDelete,
  getAttachmentName,
  getAttachmentUrl,
  className = '',
}) {
  const toneStyle = toneStyleMap[iconTone] || toneStyleMap.brand;

  return (
    <PageSection
      title={title}
      description={description}
      className={className}
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-full"
            style={toneStyle}
          >
            <FontAwesomeIcon icon={icon} />
          </span>

          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {summaryTitle}
            </p>

            {summaryText ? (
              <p
                className="text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                {summaryText}
              </p>
            ) : null}
          </div>
        </div>

        <CompactAttachmentList
          attachments={attachments}
          uploadLabel={uploadLabel}
          emptyMessage={emptyMessage}
          isUploading={isUploading}
          isDeleting={isDeleting}
          multiple={multiple}
          onUpload={onUpload}
          onDelete={onDelete}
          getAttachmentName={getAttachmentName}
          getAttachmentUrl={getAttachmentUrl}
        />
      </div>
    </PageSection>
  );
}

AttachmentSection.propTypes = {
  title: PropTypes.node,
  description: PropTypes.node,
  summaryTitle: PropTypes.node,
  summaryText: PropTypes.node,
  icon: PropTypes.object,
  iconTone: PropTypes.oneOf(['brand', 'danger', 'muted']),
  attachments: PropTypes.array,
  uploadLabel: PropTypes.string,
  emptyMessage: PropTypes.string,
  isUploading: PropTypes.bool,
  isDeleting: PropTypes.bool,
  multiple: PropTypes.bool,
  onUpload: PropTypes.func,
  onDelete: PropTypes.func,
  getAttachmentName: PropTypes.func,
  getAttachmentUrl: PropTypes.func,
  className: PropTypes.string,
};

export default AttachmentSection;
