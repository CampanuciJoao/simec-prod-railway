// Ficheiro: frontend-simec/src/pages/LoginPage.jsx
// VERSÃO FINAL SÊNIOR - COMPLETA E CORRIGIDA

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import logoSimec from '../assets/images/logo-simec.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faUser, faLock } from '@fortawesome/free-solid-svg-icons';
import '@/styles/pages/login.css';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate(); // Embora o AuthContext já redirecione, é bom tê-lo aqui.

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // CORREÇÃO: Mantém a chamada com dois argumentos, como no seu código original.
      // Agora o AuthContext sabe como lidar com isso.
      await login(username, senha);
      
      // O AuthContext já redireciona, mas esta linha é um fallback seguro.
      // Se o fluxo no AuthContext mudar, a página não quebra.
      navigate('/dashboard', { replace: true });

    } catch (err) {
      const errorMessage = err.message || 'Falha no login. Verifique suas credenciais e a conexão.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-wrapper">
        <div className="login-branding">
          <img src={logoSimec} alt="SIMEC Logo" className="login-logo-bg" />
          <p className="login-brand-subtitle">Sistema de Monitoramento de Engenharia Clinica</p>
        </div>

        <div className="login-box">
          <h2 className="login-title">Entrar</h2>
          
          <form onSubmit={handleSubmit} className="login-form">
            {error && <p className="login-error-message">{error}</p>}
            
            <div className="form-group">
              <label htmlFor="username">Nome de Usuário</label>
              <div className="input-wrapper">
                <FontAwesomeIcon icon={faUser} className="input-icon" />
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu usuário"
                  required
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="senha">Senha</label>
              <div className="input-wrapper">
                 <FontAwesomeIcon icon={faLock} className="input-icon" />
                <input
                  type="password"
                  id="senha"
                  name="senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Entrar'}
            </button>
          </form>

          <p className="login-forgot-password">
            <Link to="/recuperar-senha">Esqueceu sua senha?</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;