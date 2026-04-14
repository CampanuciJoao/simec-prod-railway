import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave,
  faSpinner,
  faCalendarDays,
  faClock,
  faWandMagicSparkles,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import Button from '../ui/Button';
import PageState from '../ui/PageState';

const ESTADO_INICIAL_VAZIO = {
  equipamentoId: '',
  tipo: 'Preventiva',
  descricaoProblemaServico: '',
  tecnicoResponsavel: '',
  dataLocal: '',
  horaLocalInicio: '',
  horaLocalFim: '',
  numeroChamado: '',
};

const DURACAO_PADRAO_POR_TIPO = {
  Preventiva: 60,
  Corretiva: 120,
  Calibracao: 90,
  Inspecao: 45,
};

function hojeLocalISO() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function horaLocalAtualHHmm() {
  const agora = new Date();
  const hora = String(agora.getHours()).padStart(2, '0');
  const minuto = String(agora.getMinutes()).padStart(2, '0');
  return `${hora}:${minuto}`;
}

function parseHoraParaMinutos(hora) {
  if (!hora || typeof hora !== 'string') return null;

  const match = hora.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;

  const h = Number(match[1]);
  const m = Number(match[2]);

  if (h < 0 || h > 23 || m < 0 || m > 59) return null;

  return h * 60 + m;
}

function minutosParaHora(totalMinutos) {
  const normalizado = ((totalMinutos % 1440) + 1440) % 1440;
  const horas = Math.floor(normalizado / 60);
  const minutos = normalizado % 60;

  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

function somarMinutosNaHora(hora, minutos) {
  const base = parseHoraParaMinutos(hora);
  if (base === null) return '';
  return minutosParaHora(base + minutos);
}

function getDuracaoPadrao(tipo) {
  return DURACAO_PADRAO_POR_TIPO[tipo] || 60;
}

function formatarTipoLabel(tipo) {
  return String(tipo || '').replace(/([A-Z])/g, ' $1').trim();
}

function extrairDataLocal(initialData) {
  return (
    initialData?.formulario?.agendamentoDataLocal ||
    initialData?.agendamentoLocal?.data ||
    initialData?.agendamentoDataLocal ||
    ''
  );
}

function extrairHoraInicioLocal(initialData) {
  return (
    initialData?.formulario?.agendamentoHoraInicioLocal ||
    initialData?.agendamentoLocal?.horaInicio ||
    initialData?.agendamentoHoraInicioLocal ||
    ''
  );
}

function extrairHoraFimLocal(initialData) {
  return (
    initialData?.formulario?.agendamentoHoraFimLocal ||
    initialData?.agendamentoLocal?.horaFim ||
    initialData?.agendamentoHoraFimLocal ||
    ''
  );
}

function FormField({ label, required = false, hint = '', children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required ? ' *' : ''}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

FormField.propTypes = {
  label: PropTypes.string.isRequired,
  required: PropTypes.bool,
  hint: PropTypes.string,
  children: PropTypes.node.isRequired,
};

function DateField({ name, value, onChange, required = false }) {
  const handleHoje = () => {
    onChange({
      target: {
        name,
        value: hojeLocalISO(),
      },
    });
  };

  const handleLimpar = () => {
    onChange({
      target: {
        name,
        value: '',
      },
    });
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <FontAwesomeIcon
          icon={faCalendarDays}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="date"
          name={name}
          value={value || ''}
          onChange={onChange}
          required={required}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pl-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleHoje}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
        >
          <FontAwesomeIcon icon={faCalendarDays} />
          Hoje
        </button>

        {!!value && (
          <button
            type="button"
            onClick={handleLimpar}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <FontAwesomeIcon icon={faXmark} />
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}

DateField.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  required: PropTypes.bool,
};

function TimeField({ name, value, onChange, placeholder = 'HH:mm' }) {
  const handleLimpar = () => {
    onChange({
      target: {
        name,
        value: '',
      },
    });
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <FontAwesomeIcon
          icon={faClock}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="time"
          name={name}
          value={value || ''}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pl-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </div>

      {!!value && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleLimpar}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
          >
            Limpar
          </button>
        </div>
      )}
    </div>
  );
}

TimeField.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
};

function ManutencaoForm({
  onSubmit,
  initialData = null,
  isEditing = false,
  todosEquipamentos = [],
  unidadesDisponiveis = [],
}) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(ESTADO_INICIAL_VAZIO);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState('');
  const [modeloSelecionado, setModeloSelecionado] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fimFoiEditadoManualmente, setFimFoiEditadoManualmente] = useState(false);

  useEffect(() => {
    if (isEditing && initialData && todosEquipamentos.length > 0) {
      const equipamentoDaOs = todosEquipamentos.find(
        (eq) => String(eq.id) === String(initialData.equipamentoId)
      );

      if (equipamentoDaOs) {
        setUnidadeSelecionada(equipamentoDaOs.unidadeId || '');
        setModeloSelecionado(equipamentoDaOs.modelo || '');
      }

      const horaFimLocal = extrairHoraFimLocal(initialData);

      setFormData({
        equipamentoId: initialData.equipamentoId || '',
        tipo: initialData.tipo || 'Preventiva',
        descricaoProblemaServico: initialData.descricaoProblemaServico || '',
        tecnicoResponsavel: initialData.tecnicoResponsavel || '',
        dataLocal: extrairDataLocal(initialData),
        horaLocalInicio: extrairHoraInicioLocal(initialData),
        horaLocalFim: horaFimLocal,
        numeroChamado: initialData.numeroChamado || '',
      });

      setFimFoiEditadoManualmente(!!horaFimLocal);
    } else {
      setFormData(ESTADO_INICIAL_VAZIO);
      setUnidadeSelecionada('');
      setModeloSelecionado('');
      setFimFoiEditadoManualmente(false);
    }
  }, [initialData, isEditing, todosEquipamentos]);

  const modelosFiltrados = useMemo(() => {
    if (!unidadeSelecionada) return [];

    return [
      ...new Set(
        todosEquipamentos
          .filter((eq) => String(eq.unidadeId) === String(unidadeSelecionada))
          .map((eq) => eq.modelo)
          .filter(Boolean)
      ),
    ].sort((a, b) => String(a).localeCompare(String(b)));
  }, [unidadeSelecionada, todosEquipamentos]);

  const seriesFiltradas = useMemo(() => {
    if (!unidadeSelecionada || !modeloSelecionado) return [];

    return todosEquipamentos.filter(
      (eq) =>
        String(eq.unidadeId) === String(unidadeSelecionada) &&
        String(eq.modelo) === String(modeloSelecionado)
    );
  }, [unidadeSelecionada, modeloSelecionado, todosEquipamentos]);

  const duracaoPadraoTexto = useMemo(() => {
    const minutos = getDuracaoPadrao(formData.tipo);
    if (minutos % 60 === 0) {
      return `${minutos / 60}h`;
    }
    return `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, '0')}`;
  }, [formData.tipo]);

  const sugestoesFim = useMemo(() => {
    if (!formData.horaLocalInicio) return [];

    const duracao = getDuracaoPadrao(formData.tipo);
    const base = parseHoraParaMinutos(formData.horaLocalInicio);

    if (base === null) return [];

    return [
      minutosParaHora(base + duracao),
      minutosParaHora(base + duracao + 30),
      minutosParaHora(base + duracao + 60),
    ].filter((hora, index, arr) => arr.indexOf(hora) === index);
  }, [formData.horaLocalInicio, formData.tipo]);

  const aplicarSugestaoFim = (hora) => {
    setFimFoiEditadoManualmente(true);
    setFormData((prev) => ({
      ...prev,
      horaLocalFim: hora,
    }));
  };

  const preencherFimAutomaticamente = (tipo, horaInicio) => {
    if (!horaInicio) return;

    const horaSugerida = somarMinutosNaHora(horaInicio, getDuracaoPadrao(tipo));
    if (!horaSugerida) return;

    setFormData((prev) => ({
      ...prev,
      horaLocalFim: horaSugerida,
    }));
  };

  const handleUnidadeChange = (e) => {
    const novaUnidade = e.target.value;
    setUnidadeSelecionada(novaUnidade);
    setModeloSelecionado('');
    setFormData((prev) => ({
      ...prev,
      equipamentoId: '',
    }));
  };

  const handleModeloChange = (e) => {
    const novoModelo = e.target.value;
    setModeloSelecionado(novoModelo);
    setFormData((prev) => ({
      ...prev,
      equipamentoId: '',
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'tipo') {
      if (!fimFoiEditadoManualmente && formData.horaLocalInicio) {
        const horaCalculada = somarMinutosNaHora(
          formData.horaLocalInicio,
          getDuracaoPadrao(value)
        );

        setFormData((prev) => ({
          ...prev,
          tipo: value,
          horaLocalFim: horaCalculada || prev.horaLocalFim,
        }));
        return;
      }

      setFormData((prev) => ({
        ...prev,
        tipo: value,
      }));
      return;
    }

    if (name === 'horaLocalInicio') {
      setFormData((prev) => ({
        ...prev,
        horaLocalInicio: value,
        horaLocalFim:
          !fimFoiEditadoManualmente && value
            ? somarMinutosNaHora(value, getDuracaoPadrao(prev.tipo))
            : prev.horaLocalFim,
      }));
      return;
    }

    if (name === 'horaLocalFim') {
      setFimFoiEditadoManualmente(!!value);
      setFormData((prev) => ({
        ...prev,
        horaLocalFim: value,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAplicarAgoraHoje = () => {
    const data = hojeLocalISO();
    const horaInicio = horaLocalAtualHHmm();
    const horaFim = somarMinutosNaHora(horaInicio, getDuracaoPadrao(formData.tipo));

    setFimFoiEditadoManualmente(false);
    setFormData((prev) => ({
      ...prev,
      dataLocal: data,
      horaLocalInicio: horaInicio,
      horaLocalFim: horaFim,
    }));
  };

  const handleSugerirFim = () => {
    if (!formData.horaLocalInicio) return;
    setFimFoiEditadoManualmente(false);
    preencherFimAutomaticamente(formData.tipo, formData.horaLocalInicio);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const isPreventiva = formData.tipo === 'Preventiva';
    const temDescricao = formData.descricaoProblemaServico.trim() !== '';

    if (!formData.equipamentoId || !formData.dataLocal) {
      setError('Seleção de equipamento e data são obrigatórios.');
      return;
    }

    if (!formData.horaLocalInicio) {
      setError('O horário de início é obrigatório.');
      return;
    }

    if (!isPreventiva && !temDescricao) {
      setError('Para manutenções não preventivas, a descrição é obrigatória.');
      return;
    }

    if (
      formData.tipo === 'Corretiva' &&
      !String(formData.numeroChamado || '').trim()
    ) {
      setError('O número do chamado é obrigatório para manutenção corretiva.');
      return;
    }

    setIsSubmitting(true);

    try {
      const dadosParaApi = {
        equipamentoId: formData.equipamentoId,
        tipo: formData.tipo,
        descricaoProblemaServico:
          !temDescricao && isPreventiva
            ? 'Manutenção Preventiva de Rotina'
            : formData.descricaoProblemaServico,
        tecnicoResponsavel: formData.tecnicoResponsavel,
        numeroChamado: formData.numeroChamado,
        agendamentoDataLocal: formData.dataLocal,
        agendamentoHoraInicioLocal: formData.horaLocalInicio,
        agendamentoHoraFimLocal: formData.horaLocalFim || null,
      };

      await onSubmit(dadosParaApi);
    } catch (apiError) {
      setError(
        apiError?.response?.data?.message || 'Erro ao processar manutenção.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      {error ? <PageState error={error} /> : null}

      <div className="space-y-4">
        <div className="border-b border-slate-200 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">
            Seleção de equipamento
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <FormField label="Unidade / Local" required>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              value={unidadeSelecionada}
              onChange={handleUnidadeChange}
              required
              disabled={isEditing}
            >
              <option value="">Selecione a unidade</option>
              {unidadesDisponiveis.map((unidade) => (
                <option key={unidade.id} value={unidade.id}>
                  {unidade.nomeSistema}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Modelo" required>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              value={modeloSelecionado}
              onChange={handleModeloChange}
              required
              disabled={!unidadeSelecionada || isEditing}
            >
              <option value="">Selecione o modelo</option>
              {modelosFiltrados.map((modelo) => (
                <option key={modelo} value={modelo}>
                  {modelo}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Nº de Série (Tag)" required>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              name="equipamentoId"
              value={formData.equipamentoId}
              onChange={handleChange}
              required
              disabled={!modeloSelecionado || isEditing}
            >
              <option value="">Selecione a tag</option>
              {seriesFiltradas.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.tag}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </div>

      <div className="space-y-4">
        <div className="border-b border-slate-200 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">
            Detalhes da manutenção
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField label="Tipo de manutenção" required>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              name="tipo"
              value={formData.tipo}
              onChange={handleChange}
              required
            >
              <option value="Preventiva">Preventiva</option>
              <option value="Corretiva">Corretiva</option>
              <option value="Calibracao">Calibração</option>
              <option value="Inspecao">Inspeção</option>
            </select>
          </FormField>

          <FormField
            label="Técnico responsável"
            hint="Opcional. Você pode preencher manualmente."
          >
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              name="tecnicoResponsavel"
              value={formData.tecnicoResponsavel}
              onChange={handleChange}
              placeholder="Ex.: Ciro Gomes"
            />
          </FormField>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Agendamento</h4>
              <p className="text-sm text-slate-500">
                Digite manualmente ou use os atalhos de apoio.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleAplicarAgoraHoje}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                <FontAwesomeIcon icon={faWandMagicSparkles} />
                Usar agora
              </button>

              <button
                type="button"
                onClick={handleSugerirFim}
                disabled={!formData.horaLocalInicio}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faClock} />
                Sugerir fim ({duracaoPadraoTexto})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <FormField
              label="Data do agendamento"
              required
              hint="Você pode selecionar no calendário ou digitar."
            >
              <DateField
                name="dataLocal"
                value={formData.dataLocal}
                onChange={handleChange}
                required
              />
            </FormField>

            <FormField
              label="Horário de início"
              required
              hint="Aceita digitação e seleção no campo nativo."
            >
              <TimeField
                name="horaLocalInicio"
                value={formData.horaLocalInicio}
                onChange={handleChange}
              />
            </FormField>

            <FormField
              label="Previsão de fim"
              hint={`Sugestão automática atual para ${formatarTipoLabel(
                formData.tipo
              )}: ${duracaoPadraoTexto}. Se for menor que o início, o sistema entende como dia seguinte.`}
            >
              <TimeField
                name="horaLocalFim"
                value={formData.horaLocalFim}
                onChange={handleChange}
              />
            </FormField>
          </div>

          {sugestoesFim.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Sugestões de término
              </p>

              <div className="flex flex-wrap gap-2">
                {sugestoesFim.map((hora) => (
                  <button
                    key={`fim-${hora}`}
                    type="button"
                    onClick={() => aplicarSugestaoFim(hora)}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                  >
                    {hora}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <FormField
          label={
            formData.tipo !== 'Preventiva'
              ? 'Descrição *'
              : 'Descrição (opcional para preventiva)'
          }
          hint={
            formData.tipo !== 'Preventiva'
              ? 'Explique o problema ou serviço executado.'
              : 'Se não preencher, o sistema usará uma descrição padrão.'
          }
          required={formData.tipo !== 'Preventiva'}
        >
          <textarea
            className="min-h-[110px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            name="descricaoProblemaServico"
            value={formData.descricaoProblemaServico}
            onChange={handleChange}
            rows={4}
            placeholder={
              formData.tipo === 'Preventiva'
                ? 'Ex.: Preventiva de rotina, limpeza, checagem e testes'
                : 'Descreva o problema encontrado ou o serviço necessário'
            }
          />
        </FormField>

        {formData.tipo === 'Corretiva' && (
          <FormField
            label="Número do chamado"
            required
            hint="Obrigatório para manutenção corretiva."
          >
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              name="numeroChamado"
              value={formData.numeroChamado}
              onChange={handleChange}
              placeholder="Ex.: CH-2026-001"
            />
          </FormField>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/manutencoes')}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin />
              Salvando...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faSave} />
              {isEditing ? 'Atualizar manutenção' : 'Agendar manutenção'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

ManutencaoForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  isEditing: PropTypes.bool,
  todosEquipamentos: PropTypes.array,
  unidadesDisponiveis: PropTypes.array,
};

export default ManutencaoForm;