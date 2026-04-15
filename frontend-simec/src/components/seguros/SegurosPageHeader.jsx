import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faShieldAlt } from '@fortawesome/free-solid-svg-icons';

import PageHeader from '@/components/ui/layout/PageHeader';
import Button from '../ui/primitives/Button';

function SegurosPageHeader({ onCreate }) {
  return (
    <PageHeader
      title="Gestão de Seguros"
      subtitle="Acompanhe, filtre e gerencie as apólices cadastradas"
      icon={faShieldAlt}
      actions={
        <Button type="button" onClick={onCreate}>
          <FontAwesomeIcon icon={faPlus} />
          Novo Seguro
        </Button>
      }
    />
  );
}

SegurosPageHeader.propTypes = {
  onCreate: PropTypes.func.isRequired,
};

export default SegurosPageHeader;