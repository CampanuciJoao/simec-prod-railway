import React from 'react';
import PropTypes from 'prop-types';

import {
  Button,
  FormActions,
  Input,
  PageSection,
  Textarea,
} from '@/components/ui';

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
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            name="descricaoProblemaServico"
            label="Descricao do problema"
            value={novaOcorrencia.descricaoProblemaServico}
            onChange={onChange}
            placeholder="Ex.: Ruido intermitente no gantry durante rotacao"
            required
          />

          <Input
            name="tecnicoResponsavel"
            label="Responsavel / Tecnico (opcional)"
            value={novaOcorrencia.tecnicoResponsavel}
            onChange={onChange}
            placeholder="Ex.: Joao Marcos"
          />
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
