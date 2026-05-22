import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFloppyDisk,
  faLightbulb,
  faFileLines,
  faStethoscope,
  faScrewdriverWrench,
  faFlask,
  faBoxOpen,
  faFilePdf,
  faLink,
  faArrowUpRightFromSquare,
  faCircleQuestion,
} from '@fortawesome/free-solid-svg-icons';
import { Drawer, Button, Textarea } from '@/components/ui';
import { urlPdfDocumento } from '@/services/api/gehcAprendizadoApi';
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
  cabo_conector: 'Cabo / conector',
  monitor_console: 'Monitor / console',
  contaminacao_metal: 'Contaminação metálica no magneto',
  interferencia_rf: 'Interferência de RF externa',
  artefato_imagem: 'Artefato de imagem (sem hardware)',
  uso_operador: 'Uso / operação',
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

function CampoOS({ icon, label, texto }) {
  return (
    <div
      className="rounded-lg p-2.5 text-xs"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
    >
      <div className="flex items-center gap-2 font-semibold" style={{ color: 'var(--text-muted)' }}>
        <FontAwesomeIcon icon={icon} className="text-[10px]" />
        {label}
      </div>
      <div
        className="mt-1 whitespace-pre-wrap break-words"
        style={{ color: 'var(--text-secondary)' }}
      >
        {texto}
      </div>
    </div>
  );
}

CampoOS.propTypes = {
  icon: PropTypes.object.isRequired,
  label: PropTypes.string.isRequired,
  texto: PropTypes.string.isRequired,
};

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
        {/* Cabeçalho: identificação da OS */}
        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: 'var(--bg-surface-soft)', border: '1px solid var(--border-soft)' }}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {extracao.identificadorPortal || extracao.gehcServiceId || '—'}
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
            {extracao.documentId && (
              <a
                href={urlPdfDocumento(extracao.documentId)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium"
                style={{ color: 'var(--brand-primary)' }}
                title="Abrir PDF original numa nova aba"
              >
                <FontAwesomeIcon icon={faFilePdf} />
                Abrir PDF original
              </a>
            )}
          </div>
          <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {extracao.equipamento?.apelido || extracao.equipamento?.tag || '—'}
            {extracao.equipamento?.modelo && <> · {extracao.equipamento.modelo}</>}
          </div>
          {/* Identificadores secundarios: WO + gehcServiceId interno */}
          {(extracao.woNumber || extracao.gehcServiceId) && (
            <div className="mt-1 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
              {extracao.woNumber && <>WO-{extracao.woNumber}</>}
              {extracao.woNumber && extracao.gehcServiceId && <> · </>}
              {extracao.gehcServiceId && <>{extracao.gehcServiceId}</>}
            </div>
          )}
        </div>

        {/* O que a IA decidiu e por quê */}
        <div
          className="rounded-xl p-3 text-xs space-y-2"
          style={{
            backgroundColor: 'var(--color-warning-surface)',
            border: '1px solid var(--color-warning-soft, #fde68a)',
          }}
        >
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            <FontAwesomeIcon icon={faLightbulb} style={{ color: 'var(--color-warning)' }} />
            O que a IA decidiu
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            <span className="font-medium">Categoria:</span>{' '}
            <strong>{labelDe(extracao.rootCauseCategory)}</strong>
            {extracao.llmConfianca != null && (
              <> · confiança <strong>{Math.round(extracao.llmConfianca * 100)}%</strong></>
            )}
          </div>
          {extracao.llmRaciocinio && (
            <div style={{ color: 'var(--text-secondary)' }}>
              <span className="font-medium">Raciocínio:</span> <em>{extracao.llmRaciocinio}</em>
            </div>
          )}
          {extracao.solucaoAplicada && (
            <div style={{ color: 'var(--text-secondary)' }}>
              <span className="font-medium">Solução identificada:</span> {extracao.solucaoAplicada}
            </div>
          )}
          {Array.isArray(extracao.partsReplaced) && extracao.partsReplaced.length > 0 && (
            <div style={{ color: 'var(--text-secondary)' }}>
              <span className="font-medium">Peças extraídas:</span>{' '}
              {extracao.partsReplaced.join(' · ')}
            </div>
          )}
        </div>

        {/* O que está escrito na OS (insumo do LLM) */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Texto da OS que a IA leu
          </div>

          {extracao.problemDescription && (
            <CampoOS
              icon={faFileLines}
              label="Problema relatado (sumário da OS)"
              texto={extracao.problemDescription}
            />
          )}
          {extracao.rootCauseRaw && (
            <CampoOS
              icon={faStethoscope}
              label="Causa raiz reportada (raw)"
              texto={extracao.rootCauseRaw}
            />
          )}
          {extracao.problemAnalyzed && (
            <CampoOS
              icon={faStethoscope}
              label="Problema analisado"
              texto={extracao.problemAnalyzed}
            />
          )}
          {extracao.actionsTaken && (
            <CampoOS
              icon={faScrewdriverWrench}
              label="Ações tomadas"
              texto={extracao.actionsTaken}
            />
          )}
          {extracao.testsPerformed && (
            <CampoOS
              icon={faFlask}
              label="Testes realizados"
              texto={extracao.testsPerformed}
            />
          )}
          {!extracao.rootCauseRaw && !extracao.problemAnalyzed && !extracao.actionsTaken && !extracao.testsPerformed && (
            <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
              <FontAwesomeIcon icon={faBoxOpen} className="mr-1" />
              O PDF não trouxe nenhum desses campos preenchidos. A IA decidiu com base só no sumário acima — provavelmente daí veio a baixa confiança.
            </p>
          )}
        </div>

        {/* Casos relacionados detectados no texto */}
        {extracao.relacionadas?.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              <FontAwesomeIcon icon={faLink} className="mr-1.5" />
              Casos relacionados (detectados no texto)
            </div>
            <div className="space-y-2">
              {extracao.relacionadas.map((rel, idx) => (
                <div
                  key={`${rel.tipo}-${rel.numero}-${idx}`}
                  className="rounded-lg p-2.5 text-xs"
                  style={{
                    backgroundColor: rel.encontradoNoSistema
                      ? 'var(--color-success-surface, #dcfce7)'
                      : 'var(--bg-surface)',
                    border: `1px solid ${
                      rel.encontradoNoSistema
                        ? 'var(--color-success-soft, #86efac)'
                        : 'var(--border-soft)'
                    }`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {rel.tipo === 'case' ? (
                        <>SR{rel.numero}</>
                      ) : (
                        <>WO-{rel.numero}</>
                      )}
                      {rel.encontradoNoSistema ? (
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                          style={{
                            backgroundColor: 'var(--color-success-soft, #86efac)',
                            color: 'var(--color-success, #166534)',
                          }}
                        >
                          No sistema
                        </span>
                      ) : (
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                          style={{
                            backgroundColor: 'var(--bg-surface-soft)',
                            color: 'var(--text-muted)',
                          }}
                          title="Referenciada no texto mas ainda não importada"
                        >
                          <FontAwesomeIcon icon={faCircleQuestion} /> Não importada
                        </span>
                      )}
                    </div>
                    {rel.encontradoNoSistema && rel.documentId && (
                      <a
                        href={urlPdfDocumento(rel.documentId)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px]"
                        style={{ color: 'var(--brand-primary)' }}
                      >
                        <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                        Abrir PDF
                      </a>
                    )}
                  </div>
                  {rel.encontradoNoSistema && rel.rootCauseCategory && (
                    <div className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                      Categoria IA: <strong>{labelDe(rel.rootCauseCategory)}</strong>
                    </div>
                  )}
                  <div className="mt-0.5 text-[10px] italic" style={{ color: 'var(--text-muted)' }}>
                    Referência encontrada em: "{rel.match}"
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>
              Cases mencionados no texto da OS. Quando "No sistema", já foram importados da GE e você pode abrir o PDF deles para contexto. "Não importada" significa que o número aparece no texto mas o PDF ainda não foi baixado/extraído.
            </p>
          </div>
        )}

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
