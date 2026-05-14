// Componente que envolve o app e bloqueia o uso enquanto houver pendencias
// de aceite de termos legais. Verifica via /api/lgpd/aceites/pendencias logo
// apos o login.
//
// Falhas na chamada nao bloqueiam o app (degradacao graciosa: prefere deixar
// o usuario entrar a impedir trabalho operacional por causa de uma rota
// indisponivel). Erros sao logados.

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import { getPendenciasAceite } from '@/services/api/lgpdApi';
import AceiteTermosModal from './AceiteTermosModal';

function GuardiaoAceiteTermos({ children }) {
  const [pendencias, setPendencias] = useState(null); // null=loading, []=ok
  const [verificacaoConcluida, setVerificacaoConcluida] = useState(false);

  useEffect(() => {
    let cancelado = false;
    getPendenciasAceite()
      .then((data) => {
        if (!cancelado) setPendencias(data?.pendencias || []);
      })
      .catch((err) => {
        // Falha de rede/back nao bloqueia o app — log e segue.
        console.warn('[LGPD] Nao foi possivel verificar pendencias de aceite:', err.message);
        if (!cancelado) setPendencias([]);
      })
      .finally(() => {
        if (!cancelado) setVerificacaoConcluida(true);
      });
    return () => { cancelado = true; };
  }, []);

  // Enquanto carrega, renderiza children mas o modal aparece por cima quando
  // necessario. Evita splash desnecessario.
  return (
    <>
      {children}
      {verificacaoConcluida && pendencias && pendencias.length > 0 && (
        <AceiteTermosModal
          pendencias={pendencias}
          onConcluido={() => setPendencias([])}
        />
      )}
    </>
  );
}

GuardiaoAceiteTermos.propTypes = {
  children: PropTypes.node,
};

export default GuardiaoAceiteTermos;
