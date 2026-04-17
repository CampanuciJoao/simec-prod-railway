import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWrench,
  faExternalLinkAlt,
  faPaperclip,
  faFileDownload,
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

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

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
                ? `${item.titulo} • Chamado: ${item.chamado}`
                : item.titulo
            }
            badge={<Badge variant="slate">{item.categoria}</Badge>}
            meta={
              <>
                <span>{formatarDataHora(item.data)}</span>
                <span>Responsável: {item.responsavel}</span>
                <span>Status: {item.status}</span>
              </>
            }
            icon={<FontAwesomeIcon icon={faWrench} />}
            iconClassName={getTimelineIconClass(item)}
            borderClassName={getTimelineBorderClass(item)}
            expanded={expandido}
            onToggle={() => onToggleExpandir(item.uniqueId)}
          >
            <div className="space-y-4">
              <Card>
                <span className="text-[11px] font-bold uppercase text-slate-500">
                  Descrição
                </span>
                <p className="mt-2 text-sm text-slate-700">
                  {item.descricao || 'Sem detalhes informados.'}
                </p>
              </Card>

              <Card>
                <span className="text-[11px] font-bold uppercase text-slate-500">
                  Responsável
                </span>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {item.responsavel}
                </p>
              </Card>

              {item.solucao ? (
                <Card surface="soft">
                  <span className="text-[11px] font-bold uppercase text-emerald-600">
                    Solução técnica
                  </span>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {item.solucao}
                  </p>
                </Card>
              ) : null}

              {item.isOS ? (
                <Link to={`/manutencoes/${item.idOriginal}`}>
                  <Button type="button" variant="secondary">
                    <FontAwesomeIcon icon={faExternalLinkAlt} />
                    Abrir manutenção
                  </Button>
                </Link>
              ) : null}

              {item.isOS && item.anexos?.length > 0 ? (
                <Card>
                  <div className="mb-3 flex items-center gap-2 text-slate-500">
                    <FontAwesomeIcon icon={faPaperclip} />
                    <span className="text-[11px] font-bold uppercase">
                      Documentos
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {item.anexos.map((file) => (
                      <a
                        key={file.id}
                        href={`${API_BASE_URL}/${file.path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost">
                          <FontAwesomeIcon icon={faFileDownload} />
                          {file.nomeOriginal}
                        </Button>
                      </a>
                    ))}
                  </div>
                </Card>
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