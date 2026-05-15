import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { criarOsCorretiva } from '../../services/api/osCorretivaApi';
import { useToast } from '../../contexts/ToastContext';

const STATUS_OPTIONS = [
  { value: '', label: 'Selecione o status' },
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
  // datetime-local string (yyyy-MM-ddTHH:mm). Vazio = usa hora atual no backend.
  dataHoraInicioEvento: '',
};

export function useAbrirOsCorretivaPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  // Pré-preenchimento vindo de uma recomendação do agente (sem persistir
  // até o usuário clicar em "Abrir OS" neste formulário).
  const recomendacaoPayload = location.state?.recomendacao?.payload || null;
  const formInicial = recomendacaoPayload
    ? {
        ...INITIAL_FORM,
        equipamentoId: recomendacaoPayload.equipamentoId || '',
        solicitante: recomendacaoPayload.solicitante || '',
        descricaoProblema: recomendacaoPayload.descricaoProblema || '',
        statusEquipamentoAbertura:
          recomendacaoPayload.statusEquipamentoAbertura || '',
      }
    : INITIAL_FORM;

  const [form, setForm] = useState(formInicial);
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
      // Converte datetime-local (sem timezone) para ISO em UTC. Vazio omite.
      const payload = { ...form };
      if (form.dataHoraInicioEvento) {
        payload.dataHoraInicioEvento = new Date(form.dataHoraInicioEvento).toISOString();
      } else {
        delete payload.dataHoraInicioEvento;
      }
      const novaOs = await criarOsCorretiva(payload);
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
