// Ficheiro: src/components/AcessorioForm.jsx
// VERSÃO FINAL SÊNIOR - COMPONENTE DE UI "BURRO", PURO E REUTILIZÁVEL

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Componente de formulário para criar e editar acessórios.
 * É um "componente burro", o que significa que é totalmente controlado
 * por props passadas pelo componente pai (`AcessoriosEquipamentoPage`).
 */
function AcessorioForm({ 
  onSubmit, 
  onCancel, 
  initialData = null, 
  isEditing = false, 
  isSubmitting = false, 
  error = null 
}) {
  const [formData, setFormData] = useState({
    nome: '',
    numeroSerie: '', 
    descricao: '',
  });

  // Efeito para popular o formulário quando `initialData` muda (modo de edição).
  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        nome: initialData.nome || '',
        numeroSerie: initialData.numeroSerie || '',
        descricao: initialData.descricao || '',
      });
    } else {
      // Limpa o formulário se não estiver em modo de edição.
      setFormData({ nome: '', numeroSerie: '', descricao: '' });
    }
  }, [initialData, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Previne múltiplos envios.
    onSubmit(formData); // Chama a função do pai com os dados do formulário.
  };

  return (
    <form onSubmit={handleSubmit} className="form-container">
      {/* Exibe a mensagem de erro vinda do hook. */}
      {error && <p className="form-error">{error}</p>}

      <div className="form-group">
        <label htmlFor="nome-acessorio">Nome do Acessório *</label>
        <input
          type="text"
          id="nome-acessorio"
          name="nome"
          value={formData.nome}
          onChange={handleChange}
          required
          disabled={isSubmitting}
          placeholder="Ex: Sonda Convexa"
        />
      </div>

      <div className="form-group">
        <label htmlFor="numeroSerie-acessorio">Número de Série</label>
        <input
          type="text"
          id="numeroSerie-acessorio"
          name="numeroSerie"
          value={formData.numeroSerie}
          onChange={handleChange}
          disabled={isSubmitting}
          placeholder="Ex: SN-12345ABC"
        />
      </div>

      <div className="form-group">
        <label htmlFor="descricao-acessorio">Descrição</label>
        <textarea
          id="descricao-acessorio"
          name="descricao"
          value={formData.descricao}
          onChange={handleChange}
          rows="3"
          disabled={isSubmitting}
          placeholder="Detalhes adicionais sobre o acessório"
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : (isEditing ? 'Atualizar Acessório' : 'Adicionar Acessório')}
        </button>
        {/* O botão de cancelar só é renderizado se for uma edição. */}
        {isEditing && (
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSubmitting}>
                Cancelar
            </button>
        )}
      </div>
    </form>
  );
}

// Definição de PropTypes para garantir que as props corretas sejam passadas.
AcessorioForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  isEditing: PropTypes.bool,
  isSubmitting: PropTypes.bool,
  error: PropTypes.string,
};

export default AcessorioForm;