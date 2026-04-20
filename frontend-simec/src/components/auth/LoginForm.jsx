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
        label="Empresa / slug"
        value={tenant}
        onChange={(e) => onChangeTenant(e.target.value)}
        placeholder="Ex.: simec-default"
        hint="Identifica a empresa no ambiente SaaS."
        leadingIcon={<FontAwesomeIcon icon={faBuilding} />}
        disabled={loading}
        required
      />

      <Input
        label="Nome de usuário"
        value={username}
        onChange={(e) => onChangeUsername(e.target.value)}
        placeholder="Digite seu usuário"
        leadingIcon={<FontAwesomeIcon icon={faUser} />}
        disabled={loading}
        required
      />

      <Input
        label="Senha"
        type="password"
        value={senha}
        onChange={(e) => onChangeSenha(e.target.value)}
        placeholder="Digite sua senha"
        leadingIcon={<FontAwesomeIcon icon={faLock} />}
        disabled={loading}
        required
      />

      <Button
        type="submit"
        className="w-full justify-center"
        disabled={loading}
      >
        {loading ? (
          <>
            <FontAwesomeIcon icon={faSpinner} spin />
            Entrando...
          </>
        ) : (
          'Entrar'
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
