import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addEquipamento } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faMicrochip } from '@fortawesome/free-solid-svg-icons';

import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/ui/PageSection';

function AdicionarEquipamentoPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    id: '',
    modelo: '',
    tipo: '',
    setor: '',
    unidade: '',
    fabricante: '',
    ano_fabricacao: '',
    data_instalacao: '',
    status: 'Operante',
    numeroPatrimonio: '',
    registroAnvisa: '',
    observacoes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (!formData.id || !formData.modelo || !formData.tipo) {
      addToast('Nº Série, Modelo e Tipo são obrigatórios.', 'error');
      setSubmitting(false);
      return;
    }

    try {
      await addEquipamento(formData);
      addToast('Equipamento cadastrado com sucesso!', 'success');

      setTimeout(() => {
        navigate('/equipamentos');
      }, 1200);
    } catch (err) {
      addToast(err.message || 'Erro ao cadastrar equipamento.', 'error');
      setSubmitting(false);
    }
  };

  return (
    <PageLayout background="slate" padded fullHeight>
      <PageHeader
        title="Novo Equipamento"
        subtitle="Cadastre um novo equipamento no sistema"
        icon={faMicrochip}
        actions={
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-300"
          >
            Voltar
          </button>
        }
      />

      <PageSection>
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* GRID PRINCIPAL */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

            <Input label="Nº Série (ID)*" name="id" value={formData.id} onChange={handleChange} />

            <Input label="Modelo*" name="modelo" value={formData.modelo} onChange={handleChange} />

            <Input label="Tipo*" name="tipo" value={formData.tipo} onChange={handleChange} />

            <Input label="Unidade" name="unidade" value={formData.unidade} onChange={handleChange} />

            <Input label="Setor" name="setor" value={formData.setor} onChange={handleChange} />

            <Input label="Fabricante" name="fabricante" value={formData.fabricante} onChange={handleChange} />

            <Input label="Ano Fabricação" type="number" name="ano_fabricacao" value={formData.ano_fabricacao} onChange={handleChange} />

            <Input label="Data Instalação" type="date" name="data_instalacao" value={formData.data_instalacao} onChange={handleChange} />

            <Select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={[
                'Operante',
                'Inoperante',
                'UsoLimitado',
                'EmManutencao',
              ]}
            />

          </div>

          {/* SEGUNDA LINHA */}
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Nº Patrimônio" name="numeroPatrimonio" value={formData.numeroPatrimonio} onChange={handleChange} />

            <Input label="Registro ANVISA" name="registroAnvisa" value={formData.registroAnvisa} onChange={handleChange} />
          </div>

          {/* OBS */}
          <div>
            <label className="text-sm font-medium text-slate-600">
              Observações
            </label>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              rows={4}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-300"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <FontAwesomeIcon icon={faSave} />
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>

        </form>
      </PageSection>
    </PageLayout>
  );
}

export default AdicionarEquipamentoPage;