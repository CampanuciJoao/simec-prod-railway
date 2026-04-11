import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

function AcessorioForm({
  onSubmit,
  onCancel,
  initialData = null,
  isEditing = false,
  isSubmitting = false,
  error = null,
}) {
  const [formData, setFormData] = useState({
    nome: '',
    numeroSerie: '',
    descricao: '',
  });

  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        nome: initialData.nome || '',
        numeroSerie: initialData.numeroSerie || '',
        descricao: initialData.descricao || '',
      });
    } else {
      setFormData({
        nome: '',
        numeroSerie: '',
        descricao: '',
      });
    }
  }, [initialData, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="nome-acessorio" className="label">
            Nome do Acessório *
          </label>
          <input
            type="text"
            id="nome-acessorio"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            placeholder="Ex: Sonda Convexa"
            className="input"
          />
        </div>

        <div>
          <label htmlFor="numeroSerie-acessorio" className="label">
            Número de Série
          </label>
          <input
            type="text"
            id="numeroSerie-acessorio"
            name="numeroSerie"
            value={formData.numeroSerie}
            onChange={handleChange}
            disabled={isSubmitting}
            placeholder="Ex: SN-12345ABC"
            className="input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="descricao-acessorio" className="label">
          Descrição
        </label>
        <textarea
          id="descricao-acessorio"
          name="descricao"
          value={formData.descricao}
          onChange={handleChange}
          rows={4}
          disabled={isSubmitting}
          placeholder="Detalhes adicionais sobre o acessório"
          className="textarea min-h-[110px]"
        />
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        {isEditing && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Salvando...'
            : isEditing
              ? 'Atualizar Acessório'
              : 'Adicionar Acessório'}
        </button>
      </div>
    </form>
  );
}

AcessorioForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  isEditing: PropTypes.bool,
  isSubmitting: PropTypes.bool,
  error: PropTypes.string,
};

export default AcessorioForm;