import React, { useState } from 'react';
import PropTypes from 'prop-types';

import { DateInput, Input, ModalConfirmacao, Textarea, TimeInput } from '@/components/ui';

function AgendarVisitaModal({ isOpen, onClose, onConfirm, submitting }) {
  const [form, setForm] = useState({
    agendamentoDataInicioLocal: '',
    agendamentoHoraInicioLocal: '',
    agendamentoDataFimLocal: '',
    agendamentoHoraFimLocal: '',
    numeroChamado: '',
    tecnicoResponsavel: '',
    observacao: '',
  });

  function handleChange(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  const podeSalvar =
    form.agendamentoDataInicioLocal &&
    form.agendamentoHoraInicioLocal &&
    form.agendamentoDataFimLocal &&
    form.agendamentoHoraFimLocal;

  function handleConfirm() {
    if (!podeSalvar) return;
    onConfirm(form);
  }

  function handleClose() {
    setForm({
      agendamentoDataInicioLocal: '',
      agendamentoHoraInicioLocal: '',
      agendamentoDataFimLocal: '',
      agendamentoHoraFimLocal: '',
      numeroChamado: '',
      tecnicoResponsavel: '',
      observacao: '',
    });
    onClose();
  }

  return (
    <ModalConfirmacao
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title="Agendar visita tecnica"
      confirmText={submitting ? 'Agendando...' : 'Agendar visita'}
      cancelText="Cancelar"
      confirmDisabled={!podeSalvar || submitting}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <DateInput
            label="Data de inicio"
            value={form.agendamentoDataInicioLocal}
            onChange={(e) => handleChange('agendamentoDataInicioLocal', e.target.value)}
            required
          />
          <TimeInput
            label="Hora inicial"
            value={form.agendamentoHoraInicioLocal}
            onChange={(e) => handleChange('agendamentoHoraInicioLocal', e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <DateInput
            label="Data de termino"
            value={form.agendamentoDataFimLocal}
            onChange={(e) => handleChange('agendamentoDataFimLocal', e.target.value)}
            required
          />
          <TimeInput
            label="Hora final"
            value={form.agendamentoHoraFimLocal}
            onChange={(e) => handleChange('agendamentoHoraFimLocal', e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Chamado externo (opcional)"
            value={form.numeroChamado}
            onChange={(e) => handleChange('numeroChamado', e.target.value)}
            placeholder="Ex.: GE-12345"
          />
          <Input
            label="Tecnico responsavel (opcional)"
            value={form.tecnicoResponsavel}
            onChange={(e) => handleChange('tecnicoResponsavel', e.target.value)}
            placeholder="Ex.: Carlos Silva"
          />
        </div>

        <Textarea
          label="Observacao (opcional)"
          value={form.observacao}
          onChange={(e) => handleChange('observacao', e.target.value)}
          rows={2}
          placeholder="Ex.: Tecnico da GE confirmou visita."
        />
      </div>
    </ModalConfirmacao>
  );
}

AgendarVisitaModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
};

export default AgendarVisitaModal;
