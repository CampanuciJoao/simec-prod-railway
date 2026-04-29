import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { criarOsCorretiva } from '../../services/api/osCorretivaApi';
import { useToast } from '../../contexts/ToastContext';

const STATUS_OPTIONS = [
  { value: '', label: 'Selecione' },
  { value: 'Operante', label: 'Operante' },
  { value: 'Inoperante', label: 'Inoperante' },
  { value: 'EmManutencao', label: 'Em manutenção' },
  { value: 'UsoLimitado', label: 'Uso limitado' },
];

const INITIAL_FORM = {
  equipamentoId: '',
  solicitante: '',
  descricaoProblema: '',
  statusEquipamentoAbertura: '',
};

export function useAbrirOsCorretivaPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = useCallback((campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setFieldErrors((prev) => ({ ...prev, [campo]: undefined }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    setFieldErrors({});

    const errors = {};
    if (!form.equipamentoId) errors.equipamentoId = 'Equipamento é obrigatório.';
    if (!form.solicitante.trim()) errors.solicitante = 'Solicitante é obrigatório.';
    if (!form.descricaoProblema.trim()) errors.descricaoProblema = 'Descrição do problema é obrigatória.';
    if (!form.statusEquipamentoAbertura) errors.statusEquipamentoAbertura = 'Status do equipamento é obrigatório.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const novaOs = await criarOsCorretiva(form);
      addToast(`OS ${novaOs.numeroOS} aberta com sucesso.`, 'success');
      navigate(`/manutencoes/ocorrencia/${novaOs.id}`);
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data || {};

      if (status === 409 && data.conflito?.id) {
        addToast(data.message || 'Já existe uma OS aberta para este equipamento.', 'error');
        navigate(`/manutencoes/ocorrencia/${data.conflito.id}`);
        return;
      }

      const msg = data.message || 'Erro ao abrir OS Corretiva.';
      setFieldErrors(data.fieldErrors || {});
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [form, navigate, addToast]);

  return {
    form,
    submitting,
    fieldErrors,
    statusOptions: STATUS_OPTIONS,
    handleChange,
    handleSubmit,
  };
}
