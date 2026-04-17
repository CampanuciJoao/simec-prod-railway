import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleInfo,
} from '@fortawesome/free-solid-svg-icons';

import {
  FormActions,
  Input,
  PageSection,
  ResponsiveGrid,
  Select,
  Textarea,
} from '@/components/ui';

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
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: 'var(--brand-primary-soft)',
              color: 'var(--brand-primary)',
            }}
          >
            <FontAwesomeIcon icon={faCircleInfo} />
          </span>

          <div className="min-w-0">
            <p
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Event Log operacional
            </p>
            <p
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              Esta base será útil para rastreabilidade, análise técnica e IA futura.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <ResponsiveGrid cols={{ base: 1, md: 2, xl: 5 }}>
            <Input
              name="titulo"
              label="Título"
              value={novoEvento.titulo}
              onChange={onChange}
              placeholder="Ex.: Ruído intermitente no gantry"
              required
            />

            <Select
              name="tipo"
              label="Tipo"
              value={novoEvento.tipo}
              onChange={onChange}
            >
              {TIPOS_OCORRENCIA.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </Select>

            <Select
              name="origem"
              label="Origem"
              value={novoEvento.origem}
              onChange={onChange}
            >
              {ORIGENS.map((origem) => (
                <option key={origem} value={origem}>
                  {origem}
                </option>
              ))}
            </Select>

            <Select
              name="gravidade"
              label="Gravidade"
              value={novoEvento.gravidade}
              onChange={onChange}
            >
              {GRAVIDADES.map((gravidade) => (
                <option key={gravidade} value={gravidade}>
                  {gravidade}
                </option>
              ))}
            </Select>

            <Input
              name="tecnico"
              label="Responsável / Técnico"
              value={novoEvento.tecnico}
              onChange={onChange}
              placeholder="Ex.: João Marcos"
            />
          </ResponsiveGrid>

          <Textarea
            name="descricao"
            label="Descrição"
            value={novoEvento.descricao}
            onChange={onChange}
            rows={4}
            placeholder="Descreva o evento técnico observado..."
          />

          <Textarea
            name="metadataTexto"
            label="Metadata JSON"
            value={novoEvento.metadataTexto}
            onChange={onChange}
            rows={5}
            placeholder='Ex.: { "temperaturaSala": 21, "mensagemPainel": "E104", "turno": "noite" }'
          />

          <FormActions
            onCancel={onCancel}
            loading={submitting}
            cancelLabel="Voltar"
            submitLabel="Salvar evento"
          />
        </form>
      </div>
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