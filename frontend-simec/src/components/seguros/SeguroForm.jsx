import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave,
  faTimes,
  faSpinner,
  faShieldAlt,
  faHospital,
  faCoins,
} from '@fortawesome/free-solid-svg-icons';

import DateInput from '../ui/DateInput';
import PageSection from '../ui/PageSection';

const TIPOS_VINCULO = {
  GERAL: 'geral',
  EQUIPAMENTO: 'equipamento',
  UNIDADE: 'unidade',
};

const ESTADO_INICIAL = {
  apoliceNumero: '',
  seguradora: '',
  dataInicio: '',
  dataFim: '',
  tipoVinculo: TIPOS_VINCULO.GERAL,
  equipamentoId: '',
  unidadeId: '',
  cobertura: '',
  premioTotal: 0,
};

function SeguroForm({
  onSubmit,
  initialData,
  isEditing,
  equipamentosDisponiveis,
  unidadesDisponiveis,
  onCancel,
}) {
  const [formData, setFormData] = useState(ESTADO_INICIAL);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...ESTADO_INICIAL,
        ...initialData,
        dataInicio: initialData.dataInicio?.split('T')[0] || '',
        dataFim: initialData.dataFim?.split('T')[0] || '',
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.apoliceNumero || !formData.seguradora) {
      setError('Apólice e seguradora são obrigatórios.');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err.message || 'Erro ao salvar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const equipamentosFiltrados = useMemo(() => {
    if (!formData.unidadeId) return [];
    return equipamentosDisponiveis.filter(
      (e) => e.unidadeId === formData.unidadeId
    );
  }, [formData.unidadeId, equipamentosDisponiveis]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <PageSection title="Dados da Apólice">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <input
            name="apoliceNumero"
            value={formData.apoliceNumero}
            onChange={handleChange}
            placeholder="Número da apólice"
            className="input"
          />

          <input
            name="seguradora"
            value={formData.seguradora}
            onChange={handleChange}
            placeholder="Seguradora"
            className="input"
          />

          <DateInput
            name="dataInicio"
            value={formData.dataInicio}
            onChange={handleChange}
          />

          <DateInput
            name="dataFim"
            value={formData.dataFim}
            onChange={handleChange}
          />
        </div>
      </PageSection>

      <PageSection title="Vínculo">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <select
            name="tipoVinculo"
            value={formData.tipoVinculo}
            onChange={handleChange}
            className="select"
          >
            <option value="geral">Geral</option>
            <option value="unidade">Unidade</option>
            <option value="equipamento">Equipamento</option>
          </select>

          {(formData.tipoVinculo !== 'geral') && (
            <select
              name="unidadeId"
              value={formData.unidadeId}
              onChange={handleChange}
              className="select"
            >
              <option value="">Selecione unidade</option>
              {unidadesDisponiveis.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nomeSistema}
                </option>
              ))}
            </select>
          )}

          {formData.tipoVinculo === 'equipamento' && (
            <select
              name="equipamentoId"
              value={formData.equipamentoId}
              onChange={handleChange}
              className="select"
            >
              <option value="">Selecione equipamento</option>
              {equipamentosFiltrados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.modelo}
                </option>
              ))}
            </select>
          )}
        </div>
      </PageSection>

      <PageSection title="Valores">
        <input
          type="number"
          name="premioTotal"
          value={formData.premioTotal}
          onChange={handleChange}
          className="input"
          placeholder="Prêmio total"
        />
      </PageSection>

      <div className="flex justify-end gap-3">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          <FontAwesomeIcon icon={faTimes} />
          Cancelar
        </button>

        <button type="submit" className="btn btn-primary">
          <FontAwesomeIcon icon={faSave} />
          Salvar
        </button>
      </div>
    </form>
  );
}

export default SeguroForm;