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
      title={`Business Intelligence${ano ? ` - ${ano}` : ''}`}
      subtitle="Painel executivo com leitura rápida de criticidade, downtime e reincidência."
      icon={faChartBar}
      actions={
        <>
          <Button variant="secondary" onClick={onRefresh} disabled={!canRefresh}>
            <FontAwesomeIcon icon={faArrowsRotate} />
            Atualizar
          </Button>
          <Button onClick={onPrint} disabled={!canPrint}>
            <FontAwesomeIcon icon={faPrint} />
            Imprimir relatório executivo
          </Button>
        </>
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
