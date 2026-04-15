import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUpload,
  faTrashAlt,
  faFilePdf,
  faPaperclip,
} from '@fortawesome/free-solid-svg-icons';

import { PageSection, Button } from '@/components/ui';
import PageState from '@/components/ui/feedback/PageState';

import {
  getAnexoNome,
  getAnexoUrl,
} from '@/utils/seguros/seguroAnexoUtils';

function SeguroAnexosSection({ anexos, onUpload, onDelete }) {
  const [file, setFile] = useState(null);

  return (
    <PageSection title="Anexos">
      <div className="space-y-4">

        <div className="flex gap-2">
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0])}
          />

          <Button onClick={() => onUpload(file)} disabled={!file}>
            <FontAwesomeIcon icon={faUpload} />
            Enviar
          </Button>
        </div>

        {anexos.length > 0 ? (
          anexos.map((a) => {
            const url = getAnexoUrl(a);

            return (
              <div key={a.id} className="flex justify-between">
                <span>
                  <FontAwesomeIcon icon={faPaperclip} /> {getAnexoNome(a)}
                </span>

                <div className="flex gap-2">
                  {url && (
                    <a href={url} target="_blank">
                      <FontAwesomeIcon icon={faFilePdf} />
                    </a>
                  )}

                  <Button
                    variant="danger"
                    onClick={() => onDelete(a.id)}
                  >
                    <FontAwesomeIcon icon={faTrashAlt} />
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <PageState isEmpty emptyMessage="Sem anexos." />
        )}
      </div>
    </PageSection>
  );
}

export default SeguroAnexosSection;