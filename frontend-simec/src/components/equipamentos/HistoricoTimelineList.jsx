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
              <Card>
                <span className="text-[11px] font-bold uppercase text-slate-500">
                  Descricao
                </span>
                <p className="mt-2 text-sm text-slate-700">
                  {item.descricao || 'Sem detalhes informados.'}
                </p>
              </Card>

              <Card>
                <span className="text-[11px] font-bold uppercase text-slate-500">
                  Contexto
                </span>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  Tipo do evento: {item.tipo || 'N/A'}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Impacta analise: {item.impactaAnalise ? 'Sim' : 'Nao'}
                </p>
              </Card>

              {item.metadata ? (
                <Card surface="soft">
                  <span className="text-[11px] font-bold uppercase text-slate-500">
                    Metadata
                  </span>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-700">
                    {JSON.stringify(item.metadata, null, 2)}
                  </pre>
                </Card>
              ) : null}

              {item.referenciaTipo === 'manutencao' && item.referenciaId ? (
                <Link to={`/manutencoes/${item.referenciaId}`}>
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
