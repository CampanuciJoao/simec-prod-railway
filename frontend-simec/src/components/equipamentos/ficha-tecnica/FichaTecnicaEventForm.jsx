import React from 'react';
import PropTypes from 'prop-types';

import {
  Button,
  FormActions,
  Input,
  PageSection,
  Select,
  Textarea,
} from '@/components/ui';

const ORIGENS = [
  { value: '', label: 'Nao informado' },
  { value: 'usuario', label: 'Usuario / Operador' },
  { value: 'tecnico', label: 'Tecnico de plantao' },
  { value: 'enfermagem', label: 'Equipe de enfermagem' },
  { value: 'medico', label: 'Equipe medica' },
  { value: 'gestao', label: 'Gestao / Chefia' },
  { value: 'sistema', label: 'Sistema / Alarme' },
];

const STATUS_EQUIPAMENTO = [
  { value: '', label: 'Nao alterar' },
  { value: 'Operante', label: 'Operante' },
  { value: 'UsoLimitado', label: 'Uso limitado' },
  { value: 'Inoperante', label: 'Inoperante' },
];

function FichaTecnicaEventForm({
  novaOcorrencia,
  submitting,
  onChange,
  onSubmit,
  onCancel,
  onLimpar,
}) {
  return (
    <PageSection
      title="Registrar Ocorrencia"
      description="Descreva o problema detectado. Uma OS sera aberta e voce podera acompanhar o andamento, agendar visita e registrar a resolucao abaixo."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Input
            name="descricaoProblemaServico"
            label="Descricao do problema"
            value={novaOcorrencia.descricaoProblemaServico}
            onChange={onChange}
            placeholder="Ex.: Ruido intermitente no gantry durante rotacao"
            required
          />

          <Input
            name="solicitante"
            label="Quem relatou"
            value={novaOcorrencia.solicitante}
            onChange={onChange}
            placeholder="Ex.: Maria Silva (enfermagem)"
          />

          <Select
            name="origemAbertura"
            label="Origem da ocorrencia"
            value={novaOcorrencia.origemAbertura}
            onChange={onChange}
          >
            {ORIGENS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Input
            name="numeroChamado"
            label="Numero do chamado (opcional)"
            value={novaOcorrencia.numeroChamado}
            onChange={onChange}
            placeholder="Ex.: GE-12345 / HelpDesk #789"
          />

          <Input
            name="tecnicoResponsavel"
            label="Tecnico responsavel (opcional)"
            value={novaOcorrencia.tecnicoResponsavel}
            onChange={onChange}
            placeholder="Ex.: Joao Marcos"
          />

          <Select
            name="statusEquipamento"
            label="Status do equipamento agora"
            value={novaOcorrencia.statusEquipamento}
            onChange={onChange}
          >
            {STATUS_EQUIPAMENTO.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </div>

        <Textarea
          name="detalhe"
          label="Detalhes adicionais (opcional)"
          value={novaOcorrencia.detalhe}
          onChange={onChange}
          rows={3}
          placeholder="Contexto extra, condicoes em que ocorreu, frequencia, etc."
        />

        <FormActions
          onCancel={onCancel}
          loading={submitting}
          cancelLabel="Voltar"
          submitLabel="Abrir OS"
          cancelVariant="secondary"
        >
          {onLimpar && !submitting && (
            <Button type="button" variant="ghost" onClick={onLimpar}>
              Limpar
            </Button>
          )}
        </FormActions>
      </form>
    </PageSection>
  );
}

FichaTecnicaEventForm.propTypes = {
  novaOcorrencia: PropTypes.object.isRequired,
  submitting: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
  onLimpar: PropTypes.func,
};

export default FichaTecnicaEventForm;
