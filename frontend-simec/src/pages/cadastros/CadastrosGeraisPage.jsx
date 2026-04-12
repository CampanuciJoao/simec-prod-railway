import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding,
  faMicrochip,
  faUsers,
  faEnvelope,
  faPlus,
} from '@fortawesome/free-solid-svg-icons';

import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';

function CadastroCard({ icon, title, description, onClick, tone = 'blue' }) {
  const toneMap = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-emerald-100 text-emerald-600',
    yellow: 'bg-amber-100 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <Card className="h-full">
        <div className="flex flex-col gap-4">
          <div
            className={[
              'inline-flex h-12 w-12 items-center justify-center rounded-2xl',
              toneMap[tone] || toneMap.blue,
            ].join(' ')}
          >
            <FontAwesomeIcon icon={icon} />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          </div>
        </div>
      </Card>
    </button>
  );
}

function CadastrosGeraisPage() {
  const navigate = useNavigate();

  return (
    <PageLayout background="slate" padded fullHeight>
      <PageHeader
        title="Cadastros Gerais"
        subtitle="Centralize os cadastros administrativos do sistema"
        icon={faPlus}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CadastroCard
          icon={faBuilding}
          title="Unidades"
          description="Gerencie as unidades cadastradas no sistema."
          tone="blue"
          onClick={() => navigate('/cadastros/unidades')}
        />

        <CadastroCard
          icon={faMicrochip}
          title="Equipamentos"
          description="Cadastre e mantenha o parque de equipamentos."
          tone="green"
          onClick={() => navigate('/cadastros/equipamentos/adicionar')}
        />

        <CadastroCard
          icon={faUsers}
          title="Usuários"
          description="Gerencie usuários e permissões de acesso."
          tone="yellow"
          onClick={() => navigate('/gerenciamento/usuarios')}
        />

        <CadastroCard
          icon={faEnvelope}
          title="E-mails de Notificação"
          description="Configure e-mails usados para alertas e comunicação."
          tone="slate"
          onClick={() => navigate('/gerenciamento/emails')}
        />
      </div>
    </PageLayout>
  );
}

export default CadastrosGeraisPage;