import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding,
  faLock,
  faSpinner,
  faUser,
} from '@fortawesome/free-solid-svg-icons';

import { Button, Input } from '@/components/ui';

function LoginForm({
  tenant,
  username,
  senha,
  error,
  loading,
  onChangeTenant,
  onChangeUsername,
  onChangeSenha,
  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <Input
        label="Empresa"
        value={tenant}
        onChange={(event) => onChangeTenant(event.target.value)}
        placeholder="Informe sua empresa"
        hint="Use o acesso da empresa liberado para a sua equipe."
        leadingIcon={<FontAwesomeIcon icon={faBuilding} />}
        disabled={loading}
        required
      />

      <Input
        label="Usuario"
        value={username}
        onChange={(event) => onChangeUsername(event.target.value)}
        placeholder="Digite seu usuario"
        leadingIcon={<FontAwesomeIcon icon={faUser} />}
        disabled={loading}
        required
      />

      <Input
        label="Senha"
        type="password"
        value={senha}
        onChange={(event) => onChangeSenha(event.target.value)}
        placeholder="Digite sua senha"
        leadingIcon={<FontAwesomeIcon icon={faLock} />}
        disabled={loading}
        required
      />

      <Button type="submit" className="w-full justify-center" disabled={loading}>
        {loading ? (
          <>
            <FontAwesomeIcon icon={faSpinner} spin />
            Entrando...
          </>
        ) : (
          'Entrar no SIMEC'
        )}
      </Button>
    </form>
  );
}

LoginForm.propTypes = {
  tenant: PropTypes.string,
  username: PropTypes.string,
  senha: PropTypes.string,
  error: PropTypes.string,
  loading: PropTypes.bool,
  onChangeTenant: PropTypes.func,
  onChangeUsername: PropTypes.func,
  onChangeSenha: PropTypes.func,
  onSubmit: PropTypes.func,
};

export default LoginForm;
