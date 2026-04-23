import React from 'react';
import PropTypes from 'prop-types';

import {
  Checkbox,
  DateInput,
  FormActions,
  FormSection,
  Input,
  PageState,
  ResponsiveGrid,
  Select,
} from '@/components/ui';

import { useEquipamentoForm } from '@/hooks/equipamentos/useEquipamentoForm';

const TIPOS = [
  'Angiógrafo',
  'Arco Cirúrgico',
  'Bomba Injetora de Contraste',
  'CR (Radiografia Computadorizada)',
  'DR (Radiografia Digital)',
  'Densitômetro Ósseo',
  'Eletrocardiógrafo (ECG)',
  'Ergômetro / Esteira',
  'Fluoroscópio',
  'Holter',
  'Mamógrafo',
  'Monitor Cardíaco',
  'Monitor Multiparâmetros',
  'PET-CT',
  'Processadora de Filme',
  'Raio-X',
  'Ressonância Magnética',
  'SPECT / Cintilógrafo',
  'Tomografia Computadorizada',
  'Ultrassom',
  'Ventilador Pulmonar',
  'Outro',
];

function EquipamentoForm({
  onSubmit,
  onCancel,
  initialData,
  isEditing,
}) {
  const {
    formData,
    unidades,
    loadingUnidades,
    submitting,
    error,
    semPatrimonio,
    setSubmitting,
    setError,
    handleChange,
    toggleSemPatrimonio,
    validate,
  } = useEquipamentoForm({ initialData, isEditing });

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(formData);
    } catch {
      setError('Erro ao salvar equipamento.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? <PageState error={error} /> : null}

      {/* 🔹 INFORMAÇÕES GERAIS */}
      <FormSection
        title="Informações gerais"
        description="Dados principais do equipamento."
      >
        <ResponsiveGrid preset="form">
          <Input
            label="Tag"
            value={formData.tag}
            onChange={(e) => handleChange('tag', e.target.value)}
            placeholder="Ex.: RX-1024"
            required
          />

          <Input
            label="Modelo"
            value={formData.modelo}
            onChange={(e) => handleChange('modelo', e.target.value)}
            placeholder="Ex.: Aquilion CT"
            required
          />

          <Select
            label="Tipo"
            value={formData.tipo}
            onChange={(e) => handleChange('tipo', e.target.value)}
            options={TIPOS.map((tipo) => ({
              value: tipo,
              label: tipo,
            }))}
            placeholder="Selecione o tipo"
            required
          />

          <Select
            label="Unidade"
            value={formData.unidadeId}
            onChange={(e) => handleChange('unidadeId', e.target.value)}
            options={unidades.map((unidade) => ({
              value: unidade.id,
              label: unidade.nomeSistema,
            }))}
            placeholder={
              loadingUnidades
                ? 'Carregando unidades...'
                : 'Selecione a unidade'
            }
            disabled={loadingUnidades}
            required
          />
        </ResponsiveGrid>
      </FormSection>

      {/* 🔹 DADOS TÉCNICOS */}
      <FormSection
        title="Dados técnicos"
        description="Informações complementares do equipamento."
      >
        <ResponsiveGrid preset="form">
          <DateInput
            label="Data de instalação"
            value={formData.dataInstalacao}
            onChange={(e) =>
              handleChange('dataInstalacao', e.target.value)
            }
          />

          <Input
            label="Fabricante"
            value={formData.fabricante}
            onChange={(e) =>
              handleChange('fabricante', e.target.value)
            }
            placeholder="Ex.: Siemens"
          />

          <Input
            label="Ano de fabricação"
            type="number"
            value={formData.anoFabricacao}
            onChange={(e) =>
              handleChange('anoFabricacao', e.target.value)
            }
            placeholder="Ex.: 2021"
            min="1900"
            max="2100"
          />
        </ResponsiveGrid>
      </FormSection>

      {/* 🔹 PATRIMÔNIO */}
      <FormSection
        title="Patrimônio"
        description="Controle patrimonial do equipamento."
      >
        <div className="space-y-5">
          <ResponsiveGrid preset="form">
            <Input
              label="Número de patrimônio"
              value={formData.numeroPatrimonio}
              disabled={semPatrimonio}
              onChange={(e) =>
                handleChange('numeroPatrimonio', e.target.value)
              }
              placeholder={
                semPatrimonio
                  ? 'Patrimônio desabilitado'
                  : 'Informe o patrimônio'
              }
              hint={
                semPatrimonio
                  ? 'Marcado como sem patrimônio.'
                  : undefined
              }
            />
          </ResponsiveGrid>

          <Checkbox
            label="Sem patrimônio"
            description="Marque esta opção quando o equipamento não possuir número patrimonial."
            checked={semPatrimonio}
            onChange={(e) =>
              toggleSemPatrimonio(e.target.checked)
            }
          />
        </div>
      </FormSection>

      <FormSection
        title="Integracao e suporte"
        description="Campos operacionais usados na integracao PACS e no contato tecnico."
      >
        <ResponsiveGrid preset="form">
          <Input
            label="AE Title"
            value={formData.aeTitle}
            onChange={(e) =>
              handleChange('aeTitle', e.target.value.toUpperCase())
            }
            placeholder="Ex.: CT_SCANNER_01"
            maxLength={16}
            hint="Vinculo primario para resolver estudos do PACS."
          />

          <Input
            label="Telefone de suporte"
            value={formData.telefoneSuporte}
            onChange={(e) =>
              handleChange('telefoneSuporte', e.target.value)
            }
            placeholder="Ex.: (65) 99999-9999"
          />
        </ResponsiveGrid>
      </FormSection>

      <FormActions
        loading={submitting}
        onCancel={onCancel}
        submitLabel={
          isEditing
            ? 'Salvar alterações'
            : 'Cadastrar equipamento'
        }
      />
    </form>
  );
}

EquipamentoForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
  initialData: PropTypes.object,
  isEditing: PropTypes.bool,
};

export default EquipamentoForm;
