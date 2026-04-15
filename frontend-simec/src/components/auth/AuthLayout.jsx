import React from 'react';
import logoSimec from '../../assets/images/logo-simec.png';

function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <div className="grid w-full grid-cols-1 lg:grid-cols-2">

        {/* Branding */}
        <div className="hidden lg:flex flex-col justify-between bg-slate-900 px-12 py-10 text-white">
          <div>
            <img src={logoSimec} className="max-w-[220px]" />

            <div className="mt-10 space-y-4">
              <h1 className="text-4xl font-bold">SIMEC</h1>
              <p className="text-slate-300">
                Sistema de Engenharia Clínica
              </p>
            </div>
          </div>

          <div className="text-sm text-slate-500">
            Plataforma de gestão
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex items-center justify-center bg-slate-100 px-4 py-10">
          {children}
        </div>

      </div>
    </div>
  );
}

export default AuthLayout;