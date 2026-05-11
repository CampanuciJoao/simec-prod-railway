import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowsRotate,
  faChartBar,
  faPrint,
} from '@fortawesome/free-solid-svg-icons';

import PropTypes from 'prop-types';

import { Button, PageHeader } from '@/components/ui';

function BIPageHeader({
  ano,
  onPrint,
  onRefresh,
  canPrint = true,
  canRefresh = true,
}) {
  return (
    <PageHeader
      title={`Painel de Business Intelligence${ano ? ` - ${ano}` : ''}`}
      subtitle="Acompanhe indicadores executivos de criticidade, downtime e recorrência operacional."
      icon={faChartBar}
      actions={
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="secondary"
            onClick={onRefresh}
            disabled={!canRefresh}
            className="w-full sm:w-auto justify-center"
          >
            <FontAwesomeIcon icon={faArrowsRotate} />
            Atualizar
          </Button>

          <Button
            type="button"
            onClick={onPrint}
            disabled={!canPrint}
            className="w-full sm:w-auto justify-center"
          >
            <FontAwesomeIcon icon={faPrint} />
            Imprimir relatório executivo
          </Button>
        </div>
      }
    />
  );
}

BIPageHeader.propTypes = {
  ano: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onPrint: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  canPrint: PropTypes.bool,
  canRefresh: PropTypes.bool,
};

export default BIPageHeader;
