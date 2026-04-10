import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faWrench } from '@fortawesome/free-solid-svg-icons';

function ManutencoesPageHeader({ onCreate }) {
  return (
    <div className="page-title-card shadow-xl bg-slate-800 border-none mb-8">
      <h1 className="page-title-internal flex items-center gap-3 text-white font-bold">
        <FontAwesomeIcon icon={faWrench} className="text-yellow-400" />
        Gerenciamento de Manutenções
      </h1>

      <button
        type="button"
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-bold shadow-lg transition-all flex items-center gap-2 border-none cursor-pointer"
        onClick={onCreate}
      >
        <FontAwesomeIcon icon={faPlus} /> Agendar Nova
      </button>
    </div>
  );
}

export default ManutencoesPageHeader;