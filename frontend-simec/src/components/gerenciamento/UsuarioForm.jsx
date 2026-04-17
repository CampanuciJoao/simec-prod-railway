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

import {
  PageSection,
  ResponsiveGrid,
} from '@/components/ui/layout';

import {
  Button,
  Input,
  Select,
} from '@/components/ui';

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
    <PageSection
      title={isEditing ? 'Editar usuário' : 'Novo usuário'}
      description="Gerencie os dados de acesso e permissões do sistema"
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        <ResponsiveGrid cols={{ base: 1, md: 2 }}>
          <Input
            label="Nome completo"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />

          <Input
            label="Usuário (login)"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            disabled={isSubmitting || isEditing}
          />
        </ResponsiveGrid>

        <ResponsiveGrid cols={{ base: 1, md: 2 }}>
          <div className="relative">
            <Input
              label={isEditing ? 'Nova senha (opcional)' : 'Senha'}
              type={senhaVisivel ? 'text' : 'password'}
              name="senha"
              value={formData.senha}
              onChange={handleChange}
              required={!isEditing}
              minLength={6}
              disabled={isSubmitting}
              className="pr-10"
            />

            <button
              type="button"
              onClick={() => setSenhaVisivel((prev) => !prev)}
              className="absolute right-3 top-[38px] text-slate-500 hover:text-slate-700"
              tabIndex={-1}
            >
              <FontAwesomeIcon icon={senhaVisivel ? faEyeSlash : faEye} />
            </button>
          </div>

          <div className="relative">
            <Input
              label="Confirmar senha"
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
              className="absolute right-3 top-[38px] text-slate-500 hover:text-slate-700"
              tabIndex={-1}
            >
              <FontAwesomeIcon icon={confirmaSenhaVisivel ? faEyeSlash : faEye} />
            </button>
          </div>
        </ResponsiveGrid>

        <div className="max-w-md">
          <Select
            label="Perfil de acesso"
            name="role"
            value={formData.role}
            onChange={handleChange}
            disabled={isSubmitting}
          >
            <option value="user">Usuário padrão</option>
            <option value="admin">Administrador</option>
          </Select>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={isSubmitting}>
            <FontAwesomeIcon icon={isSubmitting ? faSpinner : faSave} spin={isSubmitting} />
            {isSubmitting
              ? 'Salvando...'
              : isEditing
                ? 'Salvar alterações'
                : 'Criar usuário'}
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
    </PageSection>
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