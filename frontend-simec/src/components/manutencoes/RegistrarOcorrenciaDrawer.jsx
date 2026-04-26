import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import { Button, Drawer, Input, Select, Textarea } from '@/components/ui';
import { getEquipamentos, getUnidades } from '@/services/api';

const ORIGENS = [
  { value: '', label: 'Nao informado' },
  { value: 'usuario', label: 'Usuario / Operador' },
  { value: 'tecnico', label: 'Tecnico de plantao' },
  { value: 'enfermagem', label: 'Equipe de enfermagem' },
  { value: 'medico', label: 'Equipe medica' },
  { value: 'gestao', label: 'Gestao / Chefia' },
  { value: 'sistema', label: 'Sistema / Alarme' },
  { value: 'manutencao', label: 'Equipe de manutencao' },
  { value: 'externo', label: 'Empresa / Tecnico externo' },
];

const STATUS_EQUIPAMENTO_OPCOES = [
  { value: '', label: 'Nao alterar' },
  { value: 'Operante', label: 'Operante' },
  { value: 'UsoLimitado', label: 'Uso limitado' },
  { value: 'Inoperante', label: 'Inoperante' },
];

const FORM_INICIAL = {
  unidadeId: '',
  equipamentoId: '',
  descricaoProblemaServico: '',
  solicitante: '',
  origemAbertura: '',
  numeroChamado: '',
  tecnicoResponsavel: '',
  statusEquipamento: '',
  detalhe: '',
};

function RegistrarOcorrenciaDrawer({ isOpen, onClose, onConfirm, submitting }) {
  const [form, setForm] = useState(FORM_INICIAL);
  const [unidades, setUnidades] = useState([]);
  const [todosEquipamentos, setTodosEquipamentos] = useState([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function carregar() {
      setCarregando(true);
      try {
        const [unidadesData, equipamentosData] = await Promise.all([
          getUnidades(),
          getEquipamentos({ page: 1, pageSize: 500, sortBy: 'modelo', sortDirection: 'asc' }),
        ]);
        setUnidades(Array.isArray(unidadesData) ? unidadesData : []);
        setTodosEquipamentos(Array.isArray(equipamentosData?.items) ? equipamentosData.items : []);
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, [isOpen]);

  const equipamentosFiltrados = form.unidadeId
    ? todosEquipamentos.filter(
        (e) => e.unidadeId === form.unidadeId || e.unidade?.id === form.unidadeId
      )
    : todosEquipamentos;

  function handleChange(campo, valor) {
    setForm((prev) => {
      if (campo === 'unidadeId') return { ...prev, unidadeId: valor, equipamentoId: '' };
      return { ...prev, [campo]: valor };
    });
  }

  function handleClose() {
    setForm(FORM_INICIAL);
    onClose();
  }

  async function handleConfirm() {
    if (!form.equipamentoId || !form.descricaoProblemaServico.trim() || submitting) return;
    const ok = await onConfirm(form);
    if (ok) handleClose();
  }

  const podeSalvar = Boolean(form.equipamentoId && form.descricaoProblemaServico.trim());

  const unidadesOptions = unidades.map((u) => ({ value: u.id, label: u.nomeSistema }));
  const equipamentosOptions = equipamentosFiltrados.map((e) => ({
    value: e.id,
    label: `${e.modelo} (${e.tag || 'Sem TAG'})`,
  }));

  return (
    <Drawer
      open={isOpen}
      onClose={handleClose}
      title="Registrar ocorrencia"
      subtitle="Abra uma OS corretiva para acompanhamento e triagem."
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!podeSalvar || submitting || carregando}
          >
            {submitting ? 'Registrando...' : 'Abrir OS'}
          </Button>
        </div>
      }
    >
      {carregando ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Carregando dados...
        </p>
      ) : (
        <div className="space-y-6">
          <div>
            <p
              className="mb-3 text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--text-muted)' }}
            >
              Equipamento
            </p>
            <div className="space-y-3">
              <Select
                label="Unidade"
                value={form.unidadeId}
                onChange={(e) => handleChange('unidadeId', e.target.value)}
                options={unidadesOptions}
              />
              <Select
                label="Equipamento"
                value={form.equipamentoId}
                onChange={(e) => handleChange('equipamentoId', e.target.value)}
                options={equipamentosOptions}
                disabled={!form.unidadeId}
              />
              {form.unidadeId && equipamentosOptions.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--color-warning)' }}>
                  Nenhum equipamento encontrado para esta unidade.
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <p
              className="mb-3 text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--text-muted)' }}
            >
              Ocorrencia
            </p>
            <div className="space-y-3">
              <Textarea
                label="Descricao do problema"
                value={form.descricaoProblemaServico}
                onChange={(e) => handleChange('descricaoProblemaServico', e.target.value)}
                rows={3}
                required
                placeholder="Descreva o problema relatado..."
              />
              <Select
                label="Origem da ocorrencia"
                value={form.origemAbertura}
                onChange={(e) => handleChange('origemAbertura', e.target.value)}
                options={ORIGENS}
              />
              <Input
                label="Relatado por (opcional)"
                value={form.solicitante}
                onChange={(e) => handleChange('solicitante', e.target.value)}
                placeholder="Nome do colaborador ou setor"
              />
            </div>
          </div>

          <div>
            <p
              className="mb-3 text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--text-muted)' }}
            >
              Contexto
            </p>
            <div className="space-y-3">
              <Input
                label="Numero do chamado (opcional)"
                value={form.numeroChamado}
                onChange={(e) => handleChange('numeroChamado', e.target.value)}
                placeholder="Ex.: GE-12345"
              />
              <Input
                label="Tecnico responsavel (opcional)"
                value={form.tecnicoResponsavel}
                onChange={(e) => handleChange('tecnicoResponsavel', e.target.value)}
              />
              <Select
                label="Status atual do equipamento"
                value={form.statusEquipamento}
                onChange={(e) => handleChange('statusEquipamento', e.target.value)}
                options={STATUS_EQUIPAMENTO_OPCOES}
              />
            </div>
          </div>

          <Textarea
            label="Detalhe adicional (opcional)"
            value={form.detalhe}
            onChange={(e) => handleChange('detalhe', e.target.value)}
            rows={2}
            placeholder="Sera registrado como primeira nota de andamento."
          />
        </div>
      )}
    </Drawer>
  );
}

RegistrarOcorrenciaDrawer.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
};

export default RegistrarOcorrenciaDrawer;
