import React from 'react';
import PropTypes from 'prop-types';
import logoSimec from '../../assets/images/logo-simec.png';

function AuthLayout({ children }) {
  return (
    <div className="min-h-screen">
      <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative hidden overflow-hidden lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_36%),linear-gradient(160deg,#0f172a_0%,#111827_45%,#020617_100%)]" />

          <div className="relative z-10 flex h-full w-full flex-col justify-between px-12 py-10 text-white">
            <div>
              <img src={logoSimec} alt="SIMEC" className="max-w-[220px]" />

              <div className="mt-12 max-w-xl space-y-5">
                <span className="inline-flex rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">
                  Plataforma SaaS
                </span>

                <h1 className="text-4xl font-bold leading-tight xl:text-5xl text-white">
                  Engenharia clínica com histórico, operação e inteligência no mesmo fluxo.
                </h1>

                <p className="text-base leading-7 text-slate-200 xl:text-lg">
                  Centralize ativos, contratos, seguros, manutenção, alertas e análise operacional
                  com contexto por empresa e governança por tenant.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white/15 bg-white/8 p-4 backdrop-blur-sm">
                <div className="text-xs uppercase tracking-wide text-slate-300">Multi-tenant</div>
                <div className="mt-2 text-sm font-semibold text-white">Escopo por empresa</div>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/8 p-4 backdrop-blur-sm">
                <div className="text-xs uppercase tracking-wide text-slate-300">Operação</div>
                <div className="mt-2 text-sm font-semibold text-white">Alertas e workflows</div>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/8 p-4 backdrop-blur-sm">
                <div className="text-xs uppercase tracking-wide text-slate-300">BI</div>
                <div className="mt-2 text-sm font-semibold text-white">Leitura executiva</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

AuthLayout.propTypes = {
  children: PropTypes.node,
};

export default AuthLayout;
