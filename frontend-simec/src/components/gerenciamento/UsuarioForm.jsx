import React, { useEffect, useMemo, useState } from 'react';
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
import { Button, Input, PageSection, ResponsiveGrid, Select } from '@/components/ui';
import { labelTimezone, UF_TIMEZONE_MAP } from '@/utils/ufTimezoneMap';

const TIMEZONE_OPTIONS = [
  { value: '', label: 'Padrão da empresa' },
  ...Object.entries(UF_TIMEZONE_MAP)
    .reduce((acc, [, tz]) => {
      if (!acc.includes(tz)) acc.push(tz);
      return acc;
    }, [])
    .sort()
    .map((tz) => ({ value: tz, label: labelTimezone(tz) })),
];

const SENHA_MIN_LENGTH = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    email: '',
    senha: '',
    confirmaSenha: '',
    role: 'user',
    timezone: '',
  });

  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [confirmaSenhaVisivel, setConfirmaSenhaVisivel] = useState(false);
  // touched = quais campos o usuario ja interagiu. So mostramos erro depois do
  // primeiro blur/edit para nao bombardear o usuario com vermelho em campos vazios
  // assim que ele abre o form.
  const [touched, setTouched] = useState({});

  const { addToast } = useToast();

  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        nome: initialData.nome || '',
        username: initialData.username || '',
        email: initialData.email || '',
        role: initialData.role || 'user',
        timezone: initialData.timezone || '',
        senha: '',
        confirmaSenha: '',
      });
      setTouched({});
      return;
    }

    setFormData({
      nome: '',
      username: '',
      email: '',
      senha: '',
      confirmaSenha: '',
      role: 'user',
    });
    setTouched({});
  }, [isEditing, initialData]);

  // Calcula erros em tempo real. Cada campo so reporta erro se o usuario ja
  // interagiu com ele (touched) ou se tentou submeter. Padrao classico de
  // form validation: feedback aparece quando faz sentido, nao antes.
  const errors = useMemo(() => {
    const result = {};

    if (!formData.nome.trim()) {
      result.nome = 'Informe o nome completo.';
    }

    if (!formData.email.trim()) {
      result.email = 'Informe o e-mail.';
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      result.email = 'E-mail invalido.';
    }

    if (!isEditing && !formData.username.trim()) {
      result.username = 'Informe o nome de usuario.';
    }

    // Senha: obrigatoria na criacao, opcional na edicao (so valida se preenchida)
    const senhaObrigatoria = !isEditing;
    if (senhaObrigatoria && !formData.senha) {
      result.senha = 'Defina uma senha.';
    } else if (formData.senha && formData.senha.length < SENHA_MIN_LENGTH) {
      result.senha = `A senha deve ter pelo menos ${SENHA_MIN_LENGTH} caracteres.`;
    }

    // Confirmacao so e exigida se uma senha foi digitada
    if (formData.senha) {
      if (!formData.confirmaSenha) {
        result.confirmaSenha = 'Repita a senha para confirmar.';
      } else if (formData.confirmaSenha !== formData.senha) {
        result.confirmaSenha = 'As senhas nao coincidem.';
      }
    }

    return result;
  }, [formData, isEditing]);

  // So exibimos o erro de um campo se ele foi tocado ou se o usuario ja tentou submeter
  const visibleErrors = useMemo(() => {
    const result = {};
    for (const key of Object.keys(errors)) {
      if (touched[key]) {
        result[key] = errors[key];
      }
    }
    return result;
  }, [errors, touched]);

  const formInvalido = Object.keys(errors).length > 0;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (event) => {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    // Marca todos os campos como touched para que erros virem visiveis
    if (formInvalido) {
      const allTouched = Object.keys(errors).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {}
      );
      setTouched((prev) => ({ ...prev, ...allTouched }));

      // Mensagem clara perto do botao + toast como reforco
      const primeiraMensagem = errors[Object.keys(errors)[0]];
      addToast(primeiraMensagem, 'error');

      // Foca no primeiro campo com erro para guiar o usuario
      const primeiroCampoComErro = Object.keys(errors)[0];
      const elemento = document.querySelector(`[name="${primeiroCampoComErro}"]`);
      elemento?.focus();
      return;
    }

    const payload = {
      nome: formData.nome.trim(),
      email: formData.email.trim(),
      role: formData.role,
      timezone: formData.timezone || null,
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
      title={isEditing ? 'Editar usuario' : 'Novo usuario'}
      description="Gerencie acesso, contato e permissao dentro do tenant."
    >
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <ResponsiveGrid cols={{ base: 1, md: 2 }}>
          <Input
            label="Nome completo"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            onBlur={handleBlur}
            required
            disabled={isSubmitting}
            error={visibleErrors.nome}
          />

          <Input
            label="E-mail"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            required
            disabled={isSubmitting}
            error={visibleErrors.email}
          />

          <Input
            label="Usuario (login)"
            name="username"
            value={formData.username}
            onChange={handleChange}
            onBlur={handleBlur}
            required
            disabled={isSubmitting || isEditing}
            error={visibleErrors.username}
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
              onBlur={handleBlur}
              required={!isEditing}
              minLength={SENHA_MIN_LENGTH}
              disabled={isSubmitting}
              className="pr-10"
              error={visibleErrors.senha}
              hint={
                !visibleErrors.senha && !isEditing
                  ? `Minimo ${SENHA_MIN_LENGTH} caracteres.`
                  : undefined
              }
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
              onBlur={handleBlur}
              required={!isEditing && !!formData.senha}
              minLength={SENHA_MIN_LENGTH}
              disabled={isSubmitting}
              className="pr-10"
              error={visibleErrors.confirmaSenha}
              hint={
                !visibleErrors.confirmaSenha &&
                formData.senha &&
                formData.confirmaSenha &&
                formData.senha === formData.confirmaSenha
                  ? 'As senhas coincidem.'
                  : undefined
              }
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

        <ResponsiveGrid cols={{ base: 1, md: 2 }}>
          <Select
            label="Perfil de acesso"
            name="role"
            value={formData.role}
            onChange={handleChange}
            disabled={isSubmitting}
          >
            <option value="user">Usuario padrao</option>
            <option value="admin">Administrador</option>
          </Select>

          <Select
            label="Fuso horário pessoal"
            name="timezone"
            value={formData.timezone}
            onChange={handleChange}
            options={TIMEZONE_OPTIONS}
            disabled={isSubmitting}
            hint="Se definido, sobrepõe o fuso da empresa para este usuário."
          />
        </ResponsiveGrid>

        {/* Resumo perto do botao de submit. So aparece depois que algum campo
            foi tocado e ainda ha pendencias. Diferente do toast (que e efemero),
            esse banner fica visivel ate o usuario corrigir. */}
        {Object.keys(visibleErrors).length > 0 ? (
          <div
            role="alert"
            className="rounded-xl border px-4 py-3 text-sm"
            style={{
              backgroundColor: 'var(--color-danger-soft)',
              borderColor: 'var(--color-danger)',
              color: 'var(--text-primary)',
            }}
          >
            <p className="mb-1 font-semibold">Corrija os campos destacados antes de continuar:</p>
            <ul className="list-disc pl-5 space-y-0.5">
              {Object.values(visibleErrors).map((mensagem, idx) => (
                <li key={idx}>{mensagem}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={isSubmitting}>
            <FontAwesomeIcon icon={isSubmitting ? faSpinner : faSave} spin={isSubmitting} />
            {isSubmitting
              ? 'Salvando...'
              : isEditing
                ? 'Salvar alteracoes'
                : 'Criar usuario'}
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
