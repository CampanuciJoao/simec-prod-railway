import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faCheck,
  faCheckDouble,
  faClock,
  faPlus,
  faXmark,
  faLink,
} from '@fortawesome/free-solid-svg-icons';

import { useLembretes } from '@/contexts/LembretesContext';
import { useToast } from '@/contexts/ToastContext';
import {
  concluirLembrete,
  marcarLembreteLido,
  marcarTodosLembretesLidos,
} from '@/services/api';

import ModalLembrete from './ModalLembrete';

const LABELS_ENTIDADE = {
  OS_CORRETIVA: 'OS',
  EQUIPAMENTO: 'Equipamento',
  UNIDADE: 'Unidade',
  SEGURO: 'Seguro',
  CONTRATO: 'Contrato',
};
const ROTAS_ENTIDADE = {
  OS_CORRETIVA: (id) => `/manutencoes/ocorrencia/${id}`,
  EQUIPAMENTO: (id) => `/equipamentos/detalhes/${id}`,
  UNIDADE: (id) => `/unidades/${id}`,
  SEGURO: (id) => `/seguros/detalhes/${id}`,
  CONTRATO: (id) => `/contratos/detalhes/${id}`,
};

function formatarDataHora(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SinoLembretes() {
  const navigate = useNavigate();
  const toast = useToast();
  const { lembretes, badge, loading, recarregar } = useLembretes();

  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleAbrirLembrete = useCallback(
    async (lembrete) => {
      try {
        if (!lembrete.lidoEm) await marcarLembreteLido(lembrete.id);
        setOpen(false);
        if (lembrete.entidadeTipo && lembrete.entidadeId) {
          const r = ROTAS_ENTIDADE[lembrete.entidadeTipo];
          if (r) {
            navigate(r(lembrete.entidadeId));
            return;
          }
        }
        navigate('/lembretes');
      } finally {
        recarregar();
      }
    },
    [navigate, recarregar]
  );

  const handleConcluir = useCallback(
    async (lembrete) => {
      try {
        await concluirLembrete(lembrete.id);
        toast?.addToast?.('Lembrete concluído.', 'success');
        recarregar();
      } catch (err) {
        toast?.addToast?.(err?.response?.data?.message || 'Erro ao concluir.', 'error');
      }
    },
    [toast, recarregar]
  );

  const handleMarcarTodosLidos = useCallback(async () => {
    try {
      await marcarTodosLembretesLidos();
      recarregar();
    } catch (err) {
      toast?.addToast?.('Erro ao marcar todos como lidos.', 'error');
    }
  }, [toast, recarregar]);

  const totalBadge = Number(badge?.total || 0);
  const recentes = Array.isArray(lembretes) ? lembretes.slice(0, 6) : [];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 transition hover:bg-slate-700 hover:text-white"
        title="Lembretes"
        aria-label="Lembretes"
      >
        <FontAwesomeIcon icon={faBell} />
        {totalBadge > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {totalBadge > 9 ? '9+' : totalBadge}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-950/30 md:hidden"
            onClick={() => setOpen(false)}
            aria-label="Fechar lembretes"
          />

          <div className="fixed inset-x-3 bottom-3 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:mt-3 md:w-[420px] md:max-w-[calc(100vw-32px)]">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900">Lembretes</h3>
                <p className="text-xs text-slate-500">
                  {badge?.naoLidos || 0} não lidos · {badge?.atrasados || 0} atrasados
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(true);
                    setOpen(false);
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition hover:bg-blue-50"
                  title="Novo lembrete"
                  aria-label="Novo lembrete"
                >
                  <FontAwesomeIcon icon={faPlus} />
                </button>

                <button
                  type="button"
                  onClick={handleMarcarTodosLidos}
                  disabled={!badge?.naoLidos}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Marcar todos como lidos"
                  aria-label="Marcar todos como lidos"
                >
                  <FontAwesomeIcon icon={faCheckDouble} />
                </button>

                <Link
                  to="/lembretes"
                  onClick={() => setOpen(false)}
                  className="text-xs font-semibold text-blue-600 transition hover:underline"
                >
                  Ver todos
                </Link>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Fechar"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            </div>

            <div className="max-h-[min(70vh,420px)] overflow-y-auto md:max-h-[420px]">
              {loading && recentes.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-500">Carregando...</div>
              ) : recentes.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  <FontAwesomeIcon icon={faBell} className="mb-2 text-2xl text-slate-300" />
                  <p>Nenhum lembrete pendente.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(true);
                      setOpen(false);
                    }}
                    className="mt-3 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    <FontAwesomeIcon icon={faPlus} /> Criar lembrete
                  </button>
                </div>
              ) : (
                recentes.map((l) => {
                  const atrasado = new Date(l.lembrarEm) < new Date() && l.status === 'PENDENTE';
                  const naoLido = l.status === 'ENVIADO' && !l.lidoEm;
                  return (
                    <div
                      key={l.id}
                      className={[
                        'border-b border-slate-100 px-4 py-3 last:border-b-0',
                        naoLido ? 'bg-amber-50/50' : atrasado ? 'bg-red-50/40' : 'bg-white',
                      ].join(' ')}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                        <button
                          type="button"
                          onClick={() => handleAbrirLembrete(l)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {l.titulo}
                            </p>
                            {naoLido && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />}
                            {atrasado && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />}
                          </div>
                          {l.descricao ? (
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{l.descricao}</p>
                          ) : null}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <FontAwesomeIcon icon={faClock} />
                              {formatarDataHora(l.lembrarEm)}
                            </span>
                            {l.entidadeTipo ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">
                                <FontAwesomeIcon icon={faLink} />
                                {LABELS_ENTIDADE[l.entidadeTipo] || 'Vínculo'}
                              </span>
                            ) : null}
                            {l.criadoPor?.id !== l.destinatario?.id && l.criadoPor?.nome && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                                de {l.criadoPor.nome.split(' ')[0]}
                              </span>
                            )}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleConcluir(l)}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-green-600 transition hover:bg-green-50"
                          title="Concluir"
                        >
                          <FontAwesomeIcon icon={faCheck} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      <ModalLembrete
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          recarregar();
        }}
      />
    </div>
  );
}

export default SinoLembretes;
