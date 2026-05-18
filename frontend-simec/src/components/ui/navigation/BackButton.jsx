import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

import { Button } from '@/components/ui';

/**
 * Botão "voltar" padrão do sistema.
 *
 * Usa o histórico do navegador via `navigate(-1)` para preservar URL,
 * tab ativo e qualquer query param da página de origem. Se o usuário
 * abriu a página direto (sem histórico), cai pro `fallbackTo`.
 *
 * Combinado com persistência de filtros em sessionStorage ([[useSessionState]]),
 * garante que o estado da página anterior seja recuperado integralmente.
 *
 * Uso:
 *   <BackButton fallbackTo="/manutencoes" />
 *   <BackButton fallbackTo="/equipamentos" label="Voltar para equipamentos" />
 */
function BackButton({ fallbackTo = '/', label, children, ...buttonProps }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = useCallback(() => {
    // location.key === 'default' significa entrada direta sem histórico
    // do React Router (URL colado, link externo, reload de detail page).
    if (location.key && location.key !== 'default') {
      navigate(-1);
    } else {
      navigate(fallbackTo);
    }
  }, [location.key, navigate, fallbackTo]);

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={handleClick}
      aria-label={label || 'Voltar'}
      title={label || 'Voltar'}
      {...buttonProps}
    >
      <FontAwesomeIcon icon={faArrowLeft} />
      {children}
    </Button>
  );
}

BackButton.propTypes = {
  /** URL pra ir se não houver histórico (ex.: abriu detalhe direto). */
  fallbackTo: PropTypes.string,
  /** Texto descritivo opcional pra acessibilidade. */
  label: PropTypes.string,
  /** Conteúdo extra além do ícone (ex.: "Voltar"). */
  children: PropTypes.node,
};

export default BackButton;
