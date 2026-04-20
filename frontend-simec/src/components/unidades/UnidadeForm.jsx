import React from 'react';

import {
  FormActions,
  FormSection,
  Input,
  ResponsiveGrid,
  Select,
} from '@/components/ui';

import { useUnidadeForm } from '@/hooks/unidades/useUnidadeForm';

const ESTADOS = [
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'GO', label: 'Goiás' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'PR', label: 'Paraná' },
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
      <FormSection
        title="Informações da unidade"
        description="Dados principais para identificação e cadastro da unidade."
      >
        <ResponsiveGrid preset="form">
          <Input
            label="Nome da unidade"
            value={formData.nomeSistema}
            onChange={(e) => handleChange('nomeSistema', e.target.value)}
            placeholder="Ex.: Unidade Matriz"
            required
          />

          <Input
            label="Nome fantasia"
            value={formData.nomeFantasia}
            onChange={(e) => handleChange('nomeFantasia', e.target.value)}
            placeholder="Ex.: SIMEC Matriz"
            required
          />

          <Input
            label="CNPJ"
            value={formData.cnpj}
            onChange={(e) => handleChange('cnpj', e.target.value)}
            placeholder="00.000.000/0001-00"
          />
        </ResponsiveGrid>
      </FormSection>

      <FormSection
        title="Endereço"
        description="Dados de localização e correspondência da unidade."
      >
        <ResponsiveGrid cols={{ base: 1, md: 2, xl: 3 }}>
          <Input
            label="Logradouro"
            value={formData.logradouro}
            onChange={(e) => handleChange('logradouro', e.target.value)}
            placeholder="Ex.: Av. das Nações"
          />

          <Input
            label="Número"
            value={formData.numero}
            onChange={(e) => handleChange('numero', e.target.value)}
            placeholder="Ex.: 1200"
          />

          <Input
            label="Complemento"
            value={formData.complemento}
            onChange={(e) => handleChange('complemento', e.target.value)}
            placeholder="Ex.: Bloco B"
          />

          <Input
            label="Bairro"
            value={formData.bairro}
            onChange={(e) => handleChange('bairro', e.target.value)}
            placeholder="Ex.: Centro"
          />

          <Input
            label="CEP"
            value={formData.cep}
            onChange={(e) => handleChange('cep', e.target.value)}
            placeholder="Ex.: 79000-000"
          />

          <Input
            label="Cidade"
            value={formData.cidade}
            onChange={(e) => handleChange('cidade', e.target.value)}
            placeholder="Ex.: Campo Grande"
          />

          <Select
            label="Estado"
            value={formData.estado}
            onChange={(e) => handleChange('estado', e.target.value)}
            options={ESTADOS}
            placeholder="Selecione o estado"
          />
        </ResponsiveGrid>
      </FormSection>

      <FormActions
        onCancel={onCancel}
        submitLabel={isEditing ? 'Salvar alterações' : 'Cadastrar unidade'}
      />
    </form>
  );
}

export default UnidadeForm;
