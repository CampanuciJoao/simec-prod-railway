import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faUser, faLock } from '@fortawesome/free-solid-svg-icons';

function LoginForm({
  username,
  senha,
  error,
  loading,
  onChangeUsername,
  onChangeSenha,
  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="label">Nome de Usuário</label>

        <div className="relative">
          <span className="icon-input">
            <FontAwesomeIcon icon={faUser} />
          </span>

          <input
            value={username}
            onChange={(e) => onChangeUsername(e.target.value)}
            className="input pl-10"
            disabled={loading}
            required
          />
        </div>
      </div>

      <div>
        <label className="label">Senha</label>

        <div className="relative">
          <span className="icon-input">
            <FontAwesomeIcon icon={faLock} />
          </span>

          <input
            type="password"
            value={senha}
            onChange={(e) => onChangeSenha(e.target.value)}
            className="input pl-10"
            disabled={loading}
            required
          />
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary w-full justify-center"
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
      </button>
    </form>
  );
}

LoginForm.propTypes = {
  username: PropTypes.string,
  senha: PropTypes.string,
  error: PropTypes.string,
  loading: PropTypes.bool,
  onChangeUsername: PropTypes.func,
  onChangeSenha: PropTypes.func,
  onSubmit: PropTypes.func,
};

export default LoginForm;