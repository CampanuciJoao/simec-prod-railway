import React from 'react';
import PropTypes from 'prop-types';

import PageSection from '@/components/ui/layout/PageSection';
import ResponsiveGrid from '@/components/ui/layout/ResponsiveGrid';
import Button from '@/components/ui/primitives/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faCircleInfo,
  faSave,
} from '@fortawesome/free-solid-svg-icons';

const TIPOS_OCORRENCIA = [
  'Operacional',
  'Falha',
  'Ajuste',
  'Manutencao',
  'Inspecao',
  'Observacao',
];

const ORIGENS = ['usuario', 'agente', 'sistema'];
const GRAVIDADES = ['baixa', 'media', 'alta'];

function FormField({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    />
  );
}

function SelectInput({ children, ...props }) {
  return (
    <select
      {...props}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    >
      {children}
    </select>
  );
}

function TextareaInput(props) {
  return (
    <textarea
      {...props}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    />
  );
}

function FichaTecnicaEventForm({
  novoEvento,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}) {
  return (
    <PageSection
      title="Registrar evento"
      description="Cadastre rapidamente ocorrências, falhas, ajustes, inspeções e observações do equipamento."
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <FontAwesomeIcon icon={faCircleInfo} />
        </span>

        <div>
          <p className="text-sm font-semibold text-slate-900">
            Event Log operacional
          </p>
          <p className="text-sm text-slate-500">
            Esta base será útil para rastreabilidade, análise técnica e IA futura.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <ResponsiveGrid cols={{ base: 1, md: 2, xl: 5 }}>
          <FormField label="Título">
            <TextInput
              name="titulo"
              value={novoEvento.titulo}
              onChange={onChange}
              placeholder="Ex.: Ruído intermitente no gantry"
              required
            />
          </FormField>

          <FormField label="Tipo">
            <SelectInput
              name="tipo"
              value={novoEvento.tipo}
              onChange={onChange}
            >
              {TIPOS_OCORRENCIA.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </SelectInput>
          </FormField>

          <FormField label="Origem">
            <SelectInput
              name="origem"
              value={novoEvento.origem}
              onChange={onChange}
            >
              {ORIGENS.map((origem) => (
                <option key={origem} value={origem}>
                  {origem}
                </option>
              ))}
            </SelectInput>
          </FormField>

          <FormField label="Gravidade">
            <SelectInput
              name="gravidade"
              value={novoEvento.gravidade}
              onChange={onChange}
            >
              {GRAVIDADES.map((gravidade) => (
                <option key={gravidade} value={gravidade}>
                  {gravidade}
                </option>
              ))}
            </SelectInput>
          </FormField>

          <FormField label="Responsável / Técnico">
            <TextInput
              name="tecnico"
              value={novoEvento.tecnico}
              onChange={onChange}
              placeholder="Ex.: João Marcos"
            />
          </FormField>
        </ResponsiveGrid>

        <FormField label="Descrição">
          <TextareaInput
            name="descricao"
            value={novoEvento.descricao}
            onChange={onChange}
            rows={4}
            placeholder="Descreva o evento técnico observado..."
          />
        </FormField>

        <FormField label="Metadata JSON">
          <TextareaInput
            name="metadataTexto"
            value={novoEvento.metadataTexto}
            onChange={onChange}
            rows={5}
            placeholder='Ex.: { "temperaturaSala": 21, "mensagemPainel": "E104", "turno": "noite" }'
          />
        </FormField>

        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Voltar
          </Button>

          <Button type="submit" disabled={submitting}>
            <FontAwesomeIcon icon={faSave} />
            {submitting ? 'Salvando...' : 'Salvar evento'}
          </Button>
        </div>
      </form>
    </PageSection>
  );
}

FichaTecnicaEventForm.propTypes = {
  novoEvento: PropTypes.object.isRequired,
  submitting: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default FichaTecnicaEventForm;