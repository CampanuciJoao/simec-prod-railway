import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function useLogin() {
  const [tenant, setTenant] = useState('simec-default');
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      await login(username, senha, tenant, redirectPath);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Falha no login. Verifique suas credenciais.'
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    tenant,
    username,
    senha,
    error,
    loading,
    setTenant,
    setUsername,
    setSenha,
    handleSubmit,
  };
}
