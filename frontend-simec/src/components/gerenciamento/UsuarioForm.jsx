import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faTimes,
  faSave,
  faEye,
  faEyeSlash,
} from '@fortawesome/free-solid-svg-icons';

import { useToast } from '@/contexts/ToastContext';

import ResponsiveGrid from '@/components/ui/layout/ResponsiveGrid';
import Button from '@/components/ui/primitives/Button';
import Card from '@/components/ui/primitives/Card';
import Input from '@/components/ui/primitives/Input';
import Select from '@/components/ui/primitives/Select';

function UsuarioForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  isEditing = false,
  initialData = null,
}) {
  const [formData, setFormData] = useState({
    nome: '',
    username: '',
    senha: '',
    confirmaSenha: '',
    role: 'user',
  });

  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [confirmaSenhaVisivel, setConfirmaSenhaVisivel] = useState(false);

  const { addToast } = useToast();

  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        nome: initialData.nome || '',
        username: initialData.username || '',
        role: initialData.role || 'user',
        senha: '',
        confirmaSenha: '',
      });
      return;
    }

    setFormData({
      nome: '',
      username: '',
      senha: '',
      confirmaSenha: '',
      role: 'user',
    });
  }, [isEditing, initialData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (formData.senha && formData.senha !== formData.confirmaSenha) {
      addToast('As senhas não coincidem.', 'error');
      return;
    }

    const payload = {
      nome: formData.nome.trim(),
      role: formData.role,
    };

    if (formData.senha) {
      payload.senha = formData.senha;
    }

    if (!isEditing) {
      payload.username = formData.username.trim();
    }

    onSubmit(payload);
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {isEditing
              ? `Editando Usuário: ${initialData?.nome || ''}`
              : 'Adicionar Novo Usuário'}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {isEditing
              ? 'Atualize os dados do usuário e, se quiser, defina uma nova senha.'
              : 'Cadastre um novo usuário e defina o perfil de acesso.'}
          </p>
        </div>

        <ResponsiveGrid cols={{ base: 1, md: 2 }}>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              Nome Completo *
            </label>
            <Input
              type="text"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              Nome de Usuário (login) *
            </label>
            <Input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={isSubmitting || isEditing}
            />
          </div>
        </ResponsiveGrid>

        <ResponsiveGrid cols={{ base: 1, md: 2 }}>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              {isEditing ? 'Nova Senha (Opcional)' : 'Senha Inicial *'}
            </label>

            <div className="relative">
              <Input
                type={senhaVisivel ? 'text' : 'password'}
                name="senha"
                value={formData.senha}
                onChange={handleChange}
                required={!isEditing}
                minLength={6}
                disabled={isSubmitting}
                placeholder={isEditing ? 'Deixe em branco para não alterar' : ''}
                className="pr-10"
              />

              <button
                type="button"
                onClick={() => setSenhaVisivel((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
                tabIndex={-1}
              >
                <FontAwesomeIcon icon={senhaVisivel ? faEyeSlash : faEye} />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              Confirmar Senha
            </label>

            <div className="relative">
              <Input
                type={confirmaSenhaVisivel ? 'text' : 'password'}
                name="confirmaSenha"
                value={formData.confirmaSenha}
                onChange={handleChange}
                required={!isEditing && !!formData.senha}
                minLength={6}
                disabled={isSubmitting}
                className="pr-10"
              />

              <button
                type="button"
                onClick={() => setConfirmaSenhaVisivel((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
                tabIndex={-1}
              >
                <FontAwesomeIcon icon={confirmaSenhaVisivel ? faEyeSlash : faEye} />
              </button>
            </div>
          </div>
        </ResponsiveGrid>

        <div className="max-w-md">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              Função (Role)
            </label>

            <Select
              name="role"
              value={formData.role}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="user">Usuário Padrão</option>
              <option value="admin">Administrador</option>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={isSubmitting}>
            <FontAwesomeIcon icon={isSubmitting ? faSpinner : faSave} spin={isSubmitting} />
            {isSubmitting
              ? 'Salvando...'
              : isEditing
                ? 'Salvar Alterações'
                : 'Salvar Usuário'}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            <FontAwesomeIcon icon={faTimes} />
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}

UsuarioForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
  isEditing: PropTypes.bool,
  initialData: PropTypes.object,
};

export default UsuarioForm;