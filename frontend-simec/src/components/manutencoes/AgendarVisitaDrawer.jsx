import React, { useState } from 'react';
import PropTypes from 'prop-types';

import { Button, DateInput, Drawer, Input, Textarea, TimeInput } from '@/components/ui';

function AgendarVisitaDrawer({ isOpen, onClose, onConfirm, submitting }) {
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

  async function handleConfirm() {
    if (!podeSalvar || submitting) return;
    const ok = await onConfirm(form);
    if (ok) handleClose();
  }

  return (
    <Drawer
      open={isOpen}
      onClose={handleClose}
      title="Agendar visita tecnica"
      subtitle="Defina a data, hora e responsavel pela visita ao equipamento."
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!podeSalvar || submitting}
          >
            {submitting ? 'Agendando...' : 'Agendar visita'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
            Periodo da visita
          </p>
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
          <div className="mt-3 grid grid-cols-2 gap-3">
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
        </div>

        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
            Responsavel e chamado
          </p>
          <div className="space-y-3">
            <Input
              label="Tecnico responsavel (opcional)"
              value={form.tecnicoResponsavel}
              onChange={(e) => handleChange('tecnicoResponsavel', e.target.value)}
              placeholder="Ex.: Carlos Silva / GE Servicos"
            />
            <Input
              label="Chamado externo (opcional)"
              value={form.numeroChamado}
              onChange={(e) => handleChange('numeroChamado', e.target.value)}
              placeholder="Ex.: GE-12345"
            />
          </div>
        </div>

        <Textarea
          label="Observacao (opcional)"
          value={form.observacao}
          onChange={(e) => handleChange('observacao', e.target.value)}
          rows={3}
          placeholder="Ex.: Tecnico da GE confirmou disponibilidade para o periodo."
        />
      </div>
    </Drawer>
  );
}

AgendarVisitaDrawer.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
};

export default AgendarVisitaDrawer;
