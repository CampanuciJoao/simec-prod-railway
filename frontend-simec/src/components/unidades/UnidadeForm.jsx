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
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

function UnidadeForm({ onSubmit, initialData, isEditing, onCancel }) {
  const { formData, handleChange, cepStatus, cepHint, isValid } = useUnidadeForm({
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
        description="Use o CEP para adiantar cidade, estado, bairro e logradouro."
      >
        <ResponsiveGrid cols={{ base: 1, md: 2, xl: 3 }}>
          <Input
            label="CEP"
            value={formData.cep}
            onChange={(e) => handleChange('cep', e.target.value)}
            placeholder="Ex.: 79000-000"
            hint={cepStatus === 'error' ? '' : cepHint}
            error={cepStatus === 'error' ? cepHint : ''}
          />

          <Select
            label="Estado"
            value={formData.estado}
            onChange={(e) => handleChange('estado', e.target.value)}
            options={ESTADOS}
            placeholder="Selecione o estado"
          />

          <Input
            label="Cidade"
            value={formData.cidade}
            onChange={(e) => handleChange('cidade', e.target.value)}
            placeholder="Ex.: Campo Grande"
          />

          <Input
            label="Bairro"
            value={formData.bairro}
            onChange={(e) => handleChange('bairro', e.target.value)}
            placeholder="Ex.: Centro"
          />

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
            hint="Normalmente este campo não vem pelo CEP."
          />

          <Input
            label="Complemento"
            value={formData.complemento}
            onChange={(e) => handleChange('complemento', e.target.value)}
            placeholder="Ex.: Bloco B"
            hint="Use para bloco, sala, recepção ou referência interna."
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
