import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faClockRotateLeft,
  faCircleXmark,
  faCircleExclamation,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { Button, Input, PageSection, Select, Textarea } from '@/components/ui';

function FieldError({ error }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-red-500">{error}</p>;
}

function ConfirmacaoFinalVisitaCorretiva({ visita, onConfirm, submitting, fieldErrors }) {
  const [modo, setModo] = useState(null);
  const [dataHoraFimReal, setDataHoraFimReal] = useState('');
  const [novaDataHoraInicioPrevista, setNovaDataHoraInicioPrevista] = useState('');
  const [novaDataHoraFimPrevista, setNovaDataHoraFimPrevista] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [motivoNaoRealizacao, setMotivoNaoRealizacao] = useState('');
  const [novoStatusEquipamento, setNovoStatusEquipamento] = useState('UsoLimitado');

  // Coerencia de datas: tudo-ou-nada. Se admin preencheu uma so, o
  // outro fica obrigatorio. Vazio nos dois = sem nova visita (OS vai
  // pra EmAndamento ate marcar depois).
  const datasCoerentes = (() => {
    const temInicio = !!novaDataHoraInicioPrevista;
    const temFim = !!novaDataHoraFimPrevista;
    if (temInicio !== temFim) return false; // so um preenchido
    return true;
  })();

  const canConfirm =
    modo === 'operante'
      ? !!dataHoraFimReal
      : modo === 'estender'
      ? datasCoerentes
      : modo === 'nao_realizada'
      ? !!(motivoNaoRealizacao.trim().length >= 3 && datasCoerentes)
      : modo === 'problema_persiste'
      ? !!(novoStatusEquipamento && observacoes.trim().length >= 3)
      : false;

  function handleConfirm() {
    if (!modo) return;
    const payload = {};
    if (modo === 'operante') {
      payload.resultado = 'Operante';
      payload.dataHoraFimReal = new Date(dataHoraFimReal).toISOString();
      if (observacoes) payload.observacoes = observacoes;
    } else if (modo === 'estender') {
      payload.resultado = 'PrazoEstendido';
      // Datas opcionais. Quando ausentes, OS vai pra EmAndamento.
      if (novaDataHoraInicioPrevista && novaDataHoraFimPrevista) {
        payload.novaDataHoraInicioPrevista = new Date(novaDataHoraInicioPrevista).toISOString();
        payload.novaDataHoraFimPrevista = new Date(novaDataHoraFimPrevista).toISOString();
      }
      if (observacoes) payload.observacoes = observacoes;
    } else if (modo === 'nao_realizada') {
      // nao_realizada: manutencao nao aconteceu, reagenda sem trocar
      // status do equipamento. Motivo eh obrigatorio. Datas opcionais.
      payload.resultado = 'NaoRealizada';
      payload.motivoNaoRealizacao = motivoNaoRealizacao.trim();
      if (novaDataHoraInicioPrevista && novaDataHoraFimPrevista) {
        payload.novaDataHoraInicioPrevista = new Date(novaDataHoraInicioPrevista).toISOString();
        payload.novaDataHoraFimPrevista = new Date(novaDataHoraFimPrevista).toISOString();
      }
    } else {
      // problema_persiste: visita aconteceu mas problema continua.
      // SEM nova data ainda — OS volta pra EmAndamento. Equipamento
      // vira UsoLimitado ou Inoperante (escolha do admin).
      payload.resultado = 'ProblemaPersiste';
      payload.novoStatusEquipamento = novoStatusEquipamento;
      payload.observacoes = observacoes.trim();
    }
    onConfirm(payload);
  }

  return (
    <PageSection
      title="Confirmacao final da visita"
      description="Informe o resultado da visita do prestador e o estado final do equipamento."
    >
      <div
        className="flex items-start gap-3 rounded-xl border p-4"
        style={{
          backgroundColor: 'var(--color-warning-soft)',
          borderColor: 'var(--color-warning)',
        }}
      >
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor: 'var(--color-warning-soft)',
            color: 'var(--color-warning)',
          }}
        >
          <FontAwesomeIcon icon={faTriangleExclamation} />
        </span>
        <div>
          <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            Prazo da visita encerrou
          </p>
          <p style={{ color: 'var(--text-secondary)' }}>
            {visita?.prestadorNome ? `Prestador: ${visita.prestadorNome}. ` : ''}
            Registre o resultado da visita de manutencao.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <p className="mb-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Como o equipamento ficou?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={modo === 'operante' ? 'success' : 'secondary'}
              onClick={() => setModo('operante')}
            >
              <FontAwesomeIcon icon={faCheckCircle} />
              Ficou operante
            </Button>
            <Button
              type="button"
              variant={modo === 'estender' ? 'primary' : 'secondary'}
              onClick={() => setModo('estender')}
            >
              <FontAwesomeIcon icon={faClockRotateLeft} />
              Continua inoperante — estender prazo
            </Button>
            <Button
              type="button"
              variant={modo === 'nao_realizada' ? 'danger' : 'secondary'}
              onClick={() => setModo('nao_realizada')}
            >
              <FontAwesomeIcon icon={faCircleXmark} />
              Manutenção não ocorreu — reagendar
            </Button>
            <Button
              type="button"
              variant={modo === 'problema_persiste' ? 'warning' : 'secondary'}
              onClick={() => setModo('problema_persiste')}
            >
              <FontAwesomeIcon icon={faCircleExclamation} />
              Visita executada — problema persiste
            </Button>
          </div>
        </div>

        {modo === 'operante' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Input
                label="Que horas finalizou? *"
                type="datetime-local"
                value={dataHoraFimReal}
                onChange={(e) => setDataHoraFimReal(e.target.value)}
              />
              <FieldError error={fieldErrors?.dataHoraFimReal} />
            </div>
            <div className="md:col-span-2">
              <Textarea
                label="Observacoes finais"
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Descreva o que foi feito, pecas trocadas, pendencias..."
              />
            </div>
          </div>
        )}

        {modo === 'estender' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Input
                label="Nova previsão de início (opcional)"
                type="datetime-local"
                value={novaDataHoraInicioPrevista}
                onChange={(e) => setNovaDataHoraInicioPrevista(e.target.value)}
              />
              <FieldError error={fieldErrors?.novaDataHoraInicioPrevista} />
            </div>
            <div>
              <Input
                label="Nova previsão de término (opcional)"
                type="datetime-local"
                value={novaDataHoraFimPrevista}
                onChange={(e) => setNovaDataHoraFimPrevista(e.target.value)}
              />
              <FieldError error={fieldErrors?.novaDataHoraFimPrevista} />
            </div>
            <div className="md:col-span-2">
              <Textarea
                label="Motivo da extensão"
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Explique por que o equipamento continua inoperante e o que será feito."
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                Se você ainda não tem previsão de nova visita, deixe as duas datas em branco.
                A OS continua aberta em <strong>Em Andamento</strong> até você agendar a próxima visita.
              </p>
            </div>
          </div>
        )}

        {modo === 'nao_realizada' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Textarea
                label="Por que a manutenção não ocorreu? *"
                rows={3}
                value={motivoNaoRealizacao}
                onChange={(e) => setMotivoNaoRealizacao(e.target.value)}
                placeholder="Ex: técnico não compareceu, peça não chegou, prestador remarcou..."
              />
              <FieldError error={fieldErrors?.motivoNaoRealizacao} />
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                Status do equipamento não será alterado.
              </p>
            </div>
            <div>
              <Input
                label="Nova previsão de início (opcional)"
                type="datetime-local"
                value={novaDataHoraInicioPrevista}
                onChange={(e) => setNovaDataHoraInicioPrevista(e.target.value)}
              />
              <FieldError error={fieldErrors?.novaDataHoraInicioPrevista} />
            </div>
            <div>
              <Input
                label="Nova previsão de término (opcional)"
                type="datetime-local"
                value={novaDataHoraFimPrevista}
                onChange={(e) => setNovaDataHoraFimPrevista(e.target.value)}
              />
              <FieldError error={fieldErrors?.novaDataHoraFimPrevista} />
            </div>
            <div className="md:col-span-2">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Se ainda não tem previsão de nova visita, deixe as duas datas em branco.
                A OS continua aberta em <strong>Em Andamento</strong> até você agendar.
              </p>
            </div>
          </div>
        )}

        {modo === 'problema_persiste' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Textarea
                label="O que foi feito e por que o problema persiste? *"
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: trocada bobina X, mas problema no conector 5 continua. Aguardando peça Y para nova tentativa."
              />
              <FieldError error={fieldErrors?.observacoes} />
            </div>
            <div className="md:col-span-2">
              <Select
                label="Status do equipamento *"
                value={novoStatusEquipamento}
                onChange={(e) => setNovoStatusEquipamento(e.target.value)}
              >
                <option value="UsoLimitado">Uso limitado (operante com restrição)</option>
                <option value="Inoperante">Inoperante</option>
              </Select>
              <FieldError error={fieldErrors?.novoStatusEquipamento} />
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                A OS continua aberta em <strong>Em Andamento</strong> (sem prazo de visita).
                Agende nova visita quando tiver previsão pelo botão &quot;Agendar visita&quot;.
              </p>
            </div>
          </div>
        )}

        {modo && (
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={submitting || !canConfirm}
            >
              {submitting ? 'Salvando...' : 'Confirmar e atualizar sistema'}
            </Button>
          </div>
        )}
      </div>
    </PageSection>
  );
}

ConfirmacaoFinalVisitaCorretiva.propTypes = {
  visita: PropTypes.object,
  onConfirm: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
  fieldErrors: PropTypes.object,
};

ConfirmacaoFinalVisitaCorretiva.defaultProps = {
  visita: null,
  submitting: false,
  fieldErrors: {},
};

export default ConfirmacaoFinalVisitaCorretiva;
