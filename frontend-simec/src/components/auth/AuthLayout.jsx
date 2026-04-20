import React from 'react';
import PropTypes from 'prop-types';

import logoSimec from '@/assets/images/logo-simec.png';

function AuthLayout({ children }) {
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(14,165,233,0.16), transparent 34%), linear-gradient(180deg, #08111f 0%, #0f172a 42%, #111827 100%)',
      }}
    >
      <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
        <section className="relative hidden overflow-hidden border-r border-white/10 lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.2),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(16,185,129,0.14),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.14),transparent_26%)]" />

          <div className="relative z-10 flex h-full w-full flex-col justify-between px-12 py-12 text-white xl:px-16">
            <div className="max-w-2xl space-y-10">
              <img src={logoSimec} alt="SIMEC" className="max-w-[220px]" />

              <div className="space-y-5">
                <span className="inline-flex rounded-full border border-sky-300/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-100">
                  SaaS multi-tenant
                </span>

                <h1 className="text-4xl font-bold leading-tight xl:text-5xl">
                  Governanca operacional para engenharia clinica, ativos e manutencao em um unico fluxo.
                </h1>

                <p className="max-w-xl text-base leading-7 text-slate-300 xl:text-lg">
                  O SIMEC unifica parque de equipamentos, contratos, seguros, alertas,
                  historico do ativo e leitura analitica com isolamento por empresa.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Operacao
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    Alertas, OS e historico unificado
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Seguranca
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    Sessao por tenant e governanca por perfil
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Analise
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    BI, ajuda interna e contexto operacional
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-xl rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-slate-300 backdrop-blur">
              Estrutura pronta para operar varios clientes no mesmo produto, com area
              tenant, backoffice global e trilha de auditoria.
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-lg">{children}</div>
        </section>
      </div>
    </div>
  );
}

AuthLayout.propTypes = {
  children: PropTypes.node,
};

export default AuthLayout;
