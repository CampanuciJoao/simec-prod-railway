import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowsRotate,
  faCalendarCheck,
  faCircleInfo,
  faExternalLinkAlt,
  faFilePen,
  faPowerOff,
  faTriangleExclamation,
  faWrench,
} from '@fortawesome/free-solid-svg-icons';

import {
  Badge,
  Button,
  Card,
  ExpandableTimelineItem,
} from '@/components/ui';

import {
  getTimelineBorderClass,
  getTimelineIconClass,
  formatarDataHora,
} from '@/utils/equipamentos/historicoTimelineUtils';

function getTimelineIcon(item) {
  if (item.subcategoria === 'Corretiva' || item.subcategoria === 'Preventiva') {
    return faWrench;
  }

  if (item.categoriaBase === 'ocorrencia') return faTriangleExclamation;
  if (item.categoriaBase === 'transferencia_unidade') return faArrowsRotate;
  if (item.categoriaBase === 'instalacao') return faCalendarCheck;
  if (item.categoriaBase === 'alteracao_cadastral') return faFilePen;
  if (item.categoriaBase === 'status_operacional') return faPowerOff;

  return faCircleInfo;
}

function HistoricoTimelineList({
  linhaDoTempo = [],
  itensExpandidos,
  onToggleExpandir,
}) {
  return (
    <div className="space-y-4">
      {linhaDoTempo.map((item) => {
        const expandido = itensExpandidos.has(item.uniqueId);

        return (
          <ExpandableTimelineItem
            key={item.uniqueId}
            title={
              item.chamado
                ? `${item.titulo} | Chamado: ${item.chamado}`
                : item.titulo
            }
            badge={<Badge variant="slate">{item.categoria}</Badge>}
            meta={
              <>
                <span>{formatarDataHora(item.data)}</span>
                <span>Origem: {item.responsavel}</span>
                <span>Status: {item.status}</span>
              </>
            }
            icon={<FontAwesomeIcon icon={getTimelineIcon(item)} />}
            iconClassName={getTimelineIconClass(item)}
            borderClassName={getTimelineBorderClass(item)}
            expanded={expandido}
            onToggle={() => onToggleExpandir(item.uniqueId)}
          >
            <div className="space-y-4">
              <Card surface="soft" className="rounded-2xl">
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Descricao
                </span>
                <p
                  className="mt-2 text-sm leading-6"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {item.descricao || 'Sem detalhes informados.'}
                </p>
              </Card>

              {item.detalhesComplementares?.length ? (
                <Card surface="soft" className="rounded-2xl">
                  <span
                    className="text-[11px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Detalhes do registro
                  </span>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.detalhesComplementares.map((detalhe) => (
                      <span
                        key={`${item.uniqueId}-${detalhe.label}`}
                        className="rounded-full border px-3 py-1.5 text-xs font-medium"
                        style={{
                          borderColor: 'var(--border-soft)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {detalhe.label}:
                        </strong>{' '}
                        {detalhe.value}
                      </span>
                    ))}
                  </div>
                </Card>
              ) : null}

              {item.referenciaTipo === 'manutencao' && item.referenciaId ? (
                <Link to={`/manutencoes/detalhes/${item.referenciaId}`}>
                  <Button type="button" variant="secondary">
                    <FontAwesomeIcon icon={faExternalLinkAlt} />
                    Abrir manutencao
                  </Button>
                </Link>
              ) : null}
            </div>
          </ExpandableTimelineItem>
        );
      })}
    </div>
  );
}

HistoricoTimelineList.propTypes = {
  linhaDoTempo: PropTypes.array,
  itensExpandidos: PropTypes.instanceOf(Set).isRequired,
  onToggleExpandir: PropTypes.func.isRequired,
};

export default HistoricoTimelineList;
