import React from 'react';

import {
  Button,
  Input,
  PageSection,
  ResponsiveGrid,
  Select,
} from '@/components/ui';

import { useUnidadeForm } from '@/hooks/unidades/useUnidadeForm';

const ESTADOS = [
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'PR', label: 'Paraná' },
  // 👉 pode expandir depois
];

function UnidadeForm({ onSubmit, initialData, isEditing, onCancel }) {
  const { formData, handleChange, isValid } = useUnidadeForm({
    initialData,
    isEditing,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* DADOS PRINCIPAIS */}
      <PageSection title="Informações da unidade">
        <ResponsiveGrid cols={3}>
          <Input
            label="Nome da unidade"
            value={formData.nomeSistema}
            onChange={(e) => handleChange('nomeSistema', e.target.value)}
          />

          <Input
            label="Nome fantasia"
            value={formData.nomeFantasia}
            onChange={(e) => handleChange('nomeFantasia', e.target.value)}
          />

          <Input
            label="CNPJ"
            value={formData.cnpj}
            onChange={(e) => handleChange('cnpj', e.target.value)}
          />
        </ResponsiveGrid>
      </PageSection>

      {/* ENDEREÇO */}
      <PageSection title="Endereço">
        <ResponsiveGrid cols={3}>
          <Input
            label="Logradouro"
            value={formData.logradouro}
            onChange={(e) => handleChange('logradouro', e.target.value)}
          />

          <Input
            label="Número"
            value={formData.numero}
            onChange={(e) => handleChange('numero', e.target.value)}
          />

          <Input
            label="Complemento"
            value={formData.complemento}
            onChange={(e) => handleChange('complemento', e.target.value)}
          />

          <Input
            label="Bairro"
            value={formData.bairro}
            onChange={(e) => handleChange('bairro', e.target.value)}
          />

          <Input
            label="CEP"
            value={formData.cep}
            onChange={(e) => handleChange('cep', e.target.value)}
          />

          <Input
            label="Cidade"
            value={formData.cidade}
            onChange={(e) => handleChange('cidade', e.target.value)}
          />

          <Select
            label="Estado"
            value={formData.estado}
            onChange={(e) => handleChange('estado', e.target.value)}
            options={ESTADOS}
          />
        </ResponsiveGrid>
      </PageSection>

      {/* ACTIONS */}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>

        <Button type="submit" disabled={!isValid}>
          {isEditing ? 'Salvar alterações' : 'Cadastrar unidade'}
        </Button>
      </div>
    </form>
  );
}

export default UnidadeForm;
