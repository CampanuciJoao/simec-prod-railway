import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave } from '@fortawesome/free-solid-svg-icons';
import { Button, Card, Select, Textarea } from '@/components/ui';
import { getEquipamentos } from '@/services/api/equipamentosApi';
import { getUnidades } from '@/services/api';

function FieldError({ error }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-red-500">{error}</p>;
}

function AbrirOsForm({ form, submitting, fieldErrors, statusOptions, onChange, onSubmit }) {
  const [unidades, setUnidades] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [selectedUnidade, setSelectedUnidade] = useState('');

  useEffect(() => {
    getUnidades().then((data) => setUnidades(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedUnidade) { setEquipamentos([]); return; }
    getEquipamentos({ unidadeId: selectedUnidade, pageSize: 200 })
      .then((data) => {
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setEquipamentos(items.filter((eq) => eq.status !== 'Desativado'));
      })
      .catch(() => {});
  }, [selectedUnidade]);

  const equipamentoSelecionado = equipamentos.find((eq) => eq.id === form.equipamentoId);

  const unidadesOptions = [
    { value: '', label: 'Selecione a unidade' },
    ...unidades.map((u) => ({ value: u.id, label: u.nomeSistema })),
  ];

  const equipamentosOptions = [
    { value: '', label: selectedUnidade ? 'Selecione o equipamento' : 'Selecione a unidade primeiro' },
    ...equipamentos.map((eq) => ({
      value: eq.id,
      label: eq.tipo ? `${eq.modelo} (${eq.tag}) — ${eq.tipo}` : `${eq.modelo} (${eq.tag})`,
    })),
  ];

  return (
    <Card className="max-w-2xl rounded-3xl p-6">
      <form onSubmit={onSubmit} className="space-y-5">
        <Select
          label="Unidade"
          value={selectedUnidade}
          onChange={(e) => {
            setSelectedUnidade(e.target.value);
            onChange('equipamentoId', '');
          }}
          options={unidadesOptions}
        />

        <div>
          <Select
            label="Equipamento *"
            value={form.equipamentoId}
            onChange={(e) => onChange('equipamentoId', e.target.value)}
            options={equipamentosOptions}
            disabled={!selectedUnidade}
          />
          {equipamentoSelecionado?.tipo && (
            <p className="mt-1.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Tipo: <span style={{ color: 'var(--text-secondary)' }}>{equipamentoSelecionado.tipo}</span>
            </p>
          )}
          <FieldError error={fieldErrors.equipamentoId} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Solicitante *
          </label>
          <input
            type="text"
            className="input w-full"
            placeholder="Nome de quem relatou o problema"
            value={form.solicitante}
            onChange={(e) => onChange('solicitante', e.target.value)}
            maxLength={120}
          />
          <FieldError error={fieldErrors.solicitante} />
        </div>

        <div>
          <Select
            label="Status do equipamento na abertura *"
            value={form.statusEquipamentoAbertura}
            onChange={(e) => onChange('statusEquipamentoAbertura', e.target.value)}
            options={[{ value: '', label: 'Selecione' }, ...statusOptions]}
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Este status será aplicado imediatamente ao equipamento no sistema.
          </p>
          <FieldError error={fieldErrors.statusEquipamentoAbertura} />
        </div>

        <div>
          <Textarea
            label="Descrição do problema *"
            value={form.descricaoProblema}
            onChange={(e) => onChange('descricaoProblema', e.target.value)}
            placeholder="Descreva detalhadamente o problema relatado..."
            rows={5}
            maxLength={2000}
          />
          <FieldError error={fieldErrors.descricaoProblema} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={submitting}>
            <FontAwesomeIcon icon={faSave} />
            {submitting ? 'Registrando...' : 'Registrar Ocorrência'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

AbrirOsForm.propTypes = {
  form: PropTypes.object.isRequired,
  submitting: PropTypes.bool,
  fieldErrors: PropTypes.object,
  statusOptions: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

AbrirOsForm.defaultProps = {
  submitting: false,
  fieldErrors: {},
};

export default AbrirOsForm;
