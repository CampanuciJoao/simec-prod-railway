import React, { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave } from '@fortawesome/free-solid-svg-icons';
import { Button, Card, Input, Select, Textarea } from '@/components/ui';
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
  const [selectedApelido, setSelectedApelido] = useState('');

  useEffect(() => {
    getUnidades().then((data) => setUnidades(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedUnidade) {
      setEquipamentos([]);
      setSelectedApelido('');
      return;
    }
    getEquipamentos({ unidadeId: selectedUnidade, pageSize: 200 })
      .then((data) => {
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setEquipamentos(items.filter((eq) => eq.status !== 'Desativado'));
      })
      .catch(() => {});
  }, [selectedUnidade]);

  const apelidos = useMemo(() => {
    const seen = new Set();
    return equipamentos
      .map((eq) => eq.apelido)
      .filter((a) => a && !seen.has(a) && seen.add(a))
      .sort();
  }, [equipamentos]);

  const equipamentosFiltrados = useMemo(() => {
    if (!selectedApelido) return equipamentos;
    return equipamentos.filter((eq) => eq.apelido === selectedApelido);
  }, [equipamentos, selectedApelido]);

  const unidadesOptions = [
    { value: '', label: 'Selecione a unidade' },
    ...unidades.map((u) => ({ value: u.id, label: u.nomeSistema })),
  ];

  const semApelidos = selectedUnidade && equipamentos.length > 0 && apelidos.length === 0;

  const apelidosOptions = [
    {
      value: '',
      label: !selectedUnidade
        ? 'Selecione a unidade'
        : semApelidos
        ? 'Nenhum apelido cadastrado'
        : 'Todos os apelidos',
    },
    ...apelidos.map((a) => ({ value: a, label: a })),
  ];

  const equipamentosOptions = [
    {
      value: '',
      label: !selectedUnidade
        ? 'Selecione a unidade primeiro'
        : equipamentosFiltrados.length === 0
        ? 'Nenhum equipamento encontrado'
        : 'Selecione pelo nº de série',
    },
    ...equipamentosFiltrados.map((eq) => ({
      value: eq.id,
      label: eq.apelido ? `${eq.tag} — ${eq.apelido}` : `${eq.tag} (${eq.modelo})`,
    })),
  ];

  return (
    <Card className="max-w-2xl rounded-3xl p-6">
      <form onSubmit={onSubmit} className="space-y-5">
        <Select
          label="Unidade"
          placeholder=""
          value={selectedUnidade}
          onChange={(e) => {
            setSelectedUnidade(e.target.value);
            setSelectedApelido('');
            onChange('equipamentoId', '');
          }}
          options={unidadesOptions}
        />

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Select
              label="Apelido"
              placeholder=""
              value={selectedApelido}
              onChange={(e) => {
                setSelectedApelido(e.target.value);
                onChange('equipamentoId', '');
              }}
              options={apelidosOptions}
              disabled={!selectedUnidade || semApelidos}
            />
          </div>
          <div className="col-span-2">
            <Select
              label="Equipamento *"
              placeholder=""
              value={form.equipamentoId}
              onChange={(e) => onChange('equipamentoId', e.target.value)}
              options={equipamentosOptions}
              disabled={!selectedUnidade}
            />
            <FieldError error={fieldErrors.equipamentoId} />
          </div>
        </div>

        <div>
          <Input
            label="Solicitante *"
            type="text"
            placeholder="Nome de quem relatou o problema"
            value={form.solicitante}
            onChange={(e) => onChange('solicitante', e.target.value)}
            maxLength={120}
            error={fieldErrors.solicitante}
          />
        </div>

        <div>
          <Select
            label="Status do equipamento na abertura *"
            placeholder=""
            value={form.statusEquipamentoAbertura}
            onChange={(e) => onChange('statusEquipamentoAbertura', e.target.value)}
            options={statusOptions}
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
