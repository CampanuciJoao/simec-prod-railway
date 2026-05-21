import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faImage,
  faSpinner,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  FileDropZone,
  ModalConfirmacao,
} from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import {
  fetchTenantLogoBlob,
  removerTenantLogo,
  uploadTenantLogo,
} from '@/services/api/tenantSettingsApi';

const TIPOS_PERMITIDOS = ['image/png', 'image/jpeg'];
const TAMANHO_MAX_BYTES = 2 * 1024 * 1024;

function LogoUploadCard({ temLogo, onChange }) {
  const { addToast } = useToast();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const objectUrlRef = useRef(null);

  const limparPreview = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreviewUrl(null);
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      limparPreview();
      const blob = await fetchTenantLogoBlob();
      if (blob) {
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setPreviewUrl(url);
      }
    } catch (err) {
      addToast(
        err?.response?.data?.message || 'Erro ao carregar logo.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [addToast, limparPreview]);

  useEffect(() => {
    if (temLogo) {
      carregar();
    } else {
      limparPreview();
      setLoading(false);
    }
    return () => limparPreview();
    // Re-roda quando o flag temLogo muda (ex.: depois de upload/remoção).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temLogo]);

  const validarArquivo = (file) => {
    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      return 'Apenas PNG ou JPG são permitidos.';
    }
    if (file.size > TAMANHO_MAX_BYTES) {
      return `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)} MB). Máximo 2 MB.`;
    }
    return null;
  };

  const handleFiles = async (files) => {
    const file = files?.[0];
    if (!file) return;

    const erro = validarArquivo(file);
    if (erro) {
      addToast(erro, 'error');
      return;
    }

    setUploading(true);
    try {
      await uploadTenantLogo(file);
      addToast('Logo atualizado.', 'success');
      onChange?.();
    } catch (err) {
      addToast(
        err?.response?.data?.message || 'Erro ao enviar logo.',
        'error'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemover = async () => {
    setRemovendo(true);
    try {
      await removerTenantLogo();
      addToast('Logo removido.', 'success');
      setConfirmModal(false);
      onChange?.();
    } catch (err) {
      addToast(
        err?.response?.data?.message || 'Erro ao remover logo.',
        'error'
      );
    } finally {
      setRemovendo(false);
    }
  };

  return (
    <>
      <ModalConfirmacao
        isOpen={confirmModal}
        onClose={() => setConfirmModal(false)}
        onConfirm={handleRemover}
        title="Remover logo da empresa"
        message="O logo será apagado e os PDFs voltarão a usar o logo SIMEC default. Tem certeza?"
        isDestructive
        confirmText={removendo ? 'Removendo...' : 'Remover'}
        confirmDisabled={removendo}
      />

      <div className="space-y-4">
        <div
          className="flex items-center justify-center rounded-2xl border p-6"
          style={{
            borderColor: 'var(--border-soft)',
            backgroundColor: 'var(--bg-surface-soft)',
            minHeight: 140,
          }}
        >
          {loading ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
              Carregando logo atual…
            </div>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt="Logo da empresa"
              style={{ maxHeight: 100, maxWidth: '100%', objectFit: 'contain' }}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              <FontAwesomeIcon icon={faImage} className="text-2xl" />
              <span>Sem logo configurado. PDFs usam o logo SIMEC default.</span>
            </div>
          )}
        </div>

        <FileDropZone
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          multiple={false}
          label={uploading ? 'Enviando…' : 'Arraste o logo aqui ou'}
          ctaLabel={uploading ? '' : 'clique para escolher'}
          hint="PNG ou JPG, máx 2 MB. Recomendado: imagem horizontal com fundo transparente (PNG) para melhor renderização nos PDFs."
          onFiles={handleFiles}
          disabled={uploading}
        />

        {previewUrl ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setConfirmModal(true)}
              disabled={uploading || removendo}
            >
              <FontAwesomeIcon icon={faTrash} />
              <span className="ml-2">Remover logo</span>
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}

LogoUploadCard.propTypes = {
  temLogo: PropTypes.bool,
  onChange: PropTypes.func,
};

export default LogoUploadCard;
