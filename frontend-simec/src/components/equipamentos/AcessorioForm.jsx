import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import ResponsiveGrid from '@/components/ui/layout/ResponsiveGrid';

import Input from '@/components/ui/primitives/Input';
import Button from '@/components/ui/primitives/Button';

const INITIAL_STATE = {
  nome: '',
  numeroSerie: '',
  descricao: '',
};

function AcessorioForm({
  initialData = null,
  isEditing = false,
  isSubmitting = false,
  onSubmit,
  onCancel,
  error = '',
}) {
  const [formData, setFormData] = useState(INITIAL_STATE);

  useEffect(() => {
    if (initialData) {
      setFormData({
        nome: initialData.nome || '',
        numeroSerie: initialData.numeroSerie || '',
        descricao: initialData.descricao || '',
      });
      return;
    }

    setFormData(INITIAL_STATE);
  }, [initialData]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <ResponsiveGrid cols={{ base: 1, md: 2 }}>
        <Input
          label="Nome"
          value={formData.nome}
          onChange={(e) => handleChange('nome', e.target.value)}
          placeholder="Digite o nome do acessório"
        />

        <Input
          label="Número de série"
          value={formData.numeroSerie}
          onChange={(e) => handleChange('numeroSerie', e.target.value)}
          placeholder="Digite o número de série"
        />
      </ResponsiveGrid>

      <div>
        <Input
          label="Descrição"
          value={formData.descricao}
          onChange={(e) => handleChange('descricao', e.target.value)}
          placeholder="Descreva o acessório"
        />
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Salvando...'
            : isEditing
              ? 'Salvar alterações'
              : 'Adicionar acessório'}
        </Button>
      </div>
    </form>
  );
}

AcessorioForm.propTypes = {
  initialData: PropTypes.object,
  isEditing: PropTypes.bool,
  isSubmitting: PropTypes.bool,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  error: PropTypes.string,
};

export default AcessorioForm;