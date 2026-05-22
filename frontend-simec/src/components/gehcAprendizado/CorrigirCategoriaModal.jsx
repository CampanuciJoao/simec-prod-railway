import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFloppyDisk, faLightbulb } from '@fortawesome/free-solid-svg-icons';
import { Drawer, Button, Textarea } from '@/components/ui';
import {
  getTaxonomias,
  postCategoriaCorrecao,
} from '@/services/api/gehcAprendizadoApi';

const LABELS_CATEGORIA = {
  // Corretiva
  infra_chiller_cliente: 'Chiller predial (cliente)',
  cryo_compressor: 'Compressor do criostato',
  magneto_helio: 'Magneto / hélio',
  bobina: 'Bobina',
  gradiente: 'Gradiente',
  rf: 'Cadeia RF',
  mesa_mecanica: 'Mesa mecânica',
  software: 'Software / host',
  rede_dados: 'Rede / DICOM',
  infra_eletrica: 'Energia predial',
  desconhecido: 'Desconhecido',
  // PM
  pm_adsorber: 'PM — Adsorber',
  pm_coldhead: 'PM — Coldhead',
  pm_chiller_periodica: 'PM — Chiller (manutenção)',
  pm_compressor: 'PM — Compressor',
  pm_calibracao_coil: 'PM — Calibração de bobina',
  pm_calibracao_geral: 'PM — Calibração / shimming',
  pm_inspecao_visual: 'PM — Inspeção visual',
  pm_filtro: 'PM — Filtro',
  pm_bateria: 'PM — Bateria',
  pm_software_update: 'PM — Atualização firmware',
  pm_limpeza_lubrif: 'PM — Limpeza / lubrificação',
  pm_generica: 'PM — Genérica',
};

function labelDe(categoria) {
  return LABELS_CATEGORIA[categoria] || categoria;
}

function CorrigirCategoriaModal({ isOpen, extracao, onClose, onSaved }) {
  const [taxonomias, setTaxonomias] = useState({ corretiva: [], pm: [] });
  const [categoriaCorreta, setCategoriaCorreta] = useState('');
  const [comentario, setComentario] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    getTaxonomias().then(setTaxonomias).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && extracao) {
      setCategoriaCorreta(extracao.rootCauseCategory || '');
      setComentario('');
      setError(null);
    }
  }, [isOpen, extracao]);

  const ehPm = extracao?.serviceTypeCode === 'SE02';
  const opcoes = useMemo(() => {
    // PM lista PMs primeiro; corretiva lista corretivas primeiro. Ambas
    // mostram todas pra dar liberdade ao admin (caso de PM mal classificada
    // como corretiva e vice-versa).
    const principais = ehPm ? taxonomias.pm : taxonomias.corretiva;
    const secundarias = ehPm ? taxonomias.corretiva : taxonomias.pm;
    return [
      { grupo: ehPm ? 'Preventiva (recomendado)' : 'Corretiva (recomendado)', itens: principais },
      { grupo: ehPm ? 'Corretiva' : 'Preventiva', itens: secundarias },
    ];
  }, [ehPm, taxonomias]);

  async function handleSalvar() {
    if (!categoriaCorreta || !extracao?.id) return;
    setSubmitting(true);
    setError(null);
    try {
      await postCategoriaCorrecao({
        pdfExtraidoId: extracao.id,
        categoriaCorreta,
        comentario: comentario.trim() || undefined,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Falha ao salvar correção.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!extracao) return null;

  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      title="Corrigir categoria da IA"
      subtitle="Sua correção alimenta o aprendizado coletivo (anonimizado) que melhora a IA pra todos os clientes."
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSalvar}
            disabled={submitting || !categoriaCorreta || categoriaCorreta === extracao.rootCauseCategory}
          >
            <FontAwesomeIcon icon={faFloppyDisk} />
            {submitting ? ' Salvando...' : ' Salvar correção'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        <div
          className="rounded-xl p-3 text-xs"
          style={{ backgroundColor: 'var(--bg-surface-soft)', border: '1px solid var(--border-soft)' }}
        >
          <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            OS {extracao.caseNumber || extracao.woNumber || extracao.gehcServiceId || '—'}
            {extracao.serviceTypeCode && (
              <span
                className="ml-2 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide"
                style={{
                  backgroundColor: ehPm ? 'var(--color-info-surface, #dbeafe)' : 'var(--color-warning-surface)',
                  color: ehPm ? 'var(--color-info, #1d4ed8)' : 'var(--color-warning)',
                }}
              >
                {ehPm ? 'Preventiva' : extracao.serviceTypeCode}
              </span>
            )}
          </div>
          <div className="mt-1" style={{ color: 'var(--text-muted)' }}>
            {extracao.equipamento?.apelido || extracao.equipamento?.tag || '—'}
          </div>
          {extracao.problemDescription && (
            <div className="mt-2" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-medium">Problema relatado:</span> {extracao.problemDescription}
            </div>
          )}
          {extracao.rootCauseRaw && (
            <div className="mt-1" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-medium">Causa (raw):</span> {extracao.rootCauseRaw}
            </div>
          )}
          <div className="mt-2 flex items-center gap-2">
            <FontAwesomeIcon icon={faLightbulb} style={{ color: 'var(--color-warning)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>
              IA classificou como: <strong>{labelDe(extracao.rootCauseCategory)}</strong>
              {extracao.llmConfianca != null && (
                <> · confiança {Math.round(extracao.llmConfianca * 100)}%</>
              )}
            </span>
          </div>
        </div>

        <div>
          <label
            className="block text-xs font-bold uppercase tracking-wide"
            style={{ color: 'var(--text-muted)' }}
          >
            Categoria correta *
          </label>
          <select
            value={categoriaCorreta}
            onChange={(e) => setCategoriaCorreta(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            style={{
              borderColor: 'var(--border-soft)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="">— Selecione —</option>
            {opcoes.map((grupo) => (
              <optgroup key={grupo.grupo} label={grupo.grupo}>
                {grupo.itens.map((cat) => (
                  <option key={cat} value={cat}>
                    {labelDe(cat)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <Textarea
          label="Comentário (opcional)"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Por que esta categoria é a correta? Útil pra rastrear casos similares no futuro."
          rows={3}
          maxLength={500}
        />

        {error && (
          <p className="text-xs" style={{ color: 'var(--color-danger)' }}>
            {error}
          </p>
        )}

        <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
          Sua correção é privada para o seu tenant. A lição técnica (texto despersonalizado — sem nº de OS, nomes ou IDs) entra no aprendizado coletivo da IA e ajuda futuras classificações em qualquer cliente.
        </p>
      </div>
    </Drawer>
  );
}

CorrigirCategoriaModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  extracao: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func,
};

CorrigirCategoriaModal.defaultProps = {
  extracao: null,
  onSaved: null,
};

export default CorrigirCategoriaModal;
