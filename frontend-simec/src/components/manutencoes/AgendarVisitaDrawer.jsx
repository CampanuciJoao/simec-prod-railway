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
      subtitle="Defina a data, hora e responsavel pela visita."
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
      <div className="space-y-6">
        {/* Inicio */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Inicio previsto
          </p>
          <div className="grid grid-cols-2 gap-3">
            <DateInput
              label="Data"
              value={form.agendamentoDataInicioLocal}
              onChange={(e) => handleChange('agendamentoDataInicioLocal', e.target.value)}
              required
            />
            <TimeInput
              label="Hora"
              value={form.agendamentoHoraInicioLocal}
              onChange={(e) => handleChange('agendamentoHoraInicioLocal', e.target.value)}
              required
            />
          </div>
        </div>

        {/* Fim */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Termino previsto
          </p>
          <div className="grid grid-cols-2 gap-3">
            <DateInput
              label="Data"
              value={form.agendamentoDataFimLocal}
              onChange={(e) => handleChange('agendamentoDataFimLocal', e.target.value)}
              required
            />
            <TimeInput
              label="Hora"
              value={form.agendamentoHoraFimLocal}
              onChange={(e) => handleChange('agendamentoHoraFimLocal', e.target.value)}
              required
            />
          </div>
        </div>

        {/* Responsavel */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Responsavel
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
