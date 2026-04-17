import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  faBuilding,
  faMicrochip,
  faUsers,
  faEnvelope,
  faPlus,
} from '@fortawesome/free-solid-svg-icons';

import {
  PageHeader,
  PageLayout,
  ResponsiveGrid,
} from '@/components/ui';
import { CadastroNavigationCard } from '@/components/shared';

function CadastrosGeraisPage() {
  const navigate = useNavigate();

  const cadastros = [
    {
      icon: faBuilding,
      title: 'Unidades',
      description: 'Gerencie as unidades cadastradas no sistema.',
      tone: 'blue',
      path: '/cadastros/unidades',
    },
    {
      icon: faMicrochip,
      title: 'Equipamentos',
      description: 'Cadastre e mantenha o parque de equipamentos.',
      tone: 'green',
      path: '/cadastros/equipamentos/adicionar',
    },
    {
      icon: faUsers,
      title: 'Usuários',
      description: 'Gerencie usuários e permissões de acesso.',
      tone: 'yellow',
      path: '/gerenciamento/usuarios',
    },
    {
      icon: faEnvelope,
      title: 'E-mails de Notificação',
      description: 'Configure e-mails usados para alertas e comunicação.',
      tone: 'slate',
      path: '/cadastros/emails',
    },
  ];

  return (
    <PageLayout padded fullHeight>
      <div className="space-y-6">
        <PageHeader
          title="Cadastros Gerais"
          subtitle="Centralize os cadastros administrativos do sistema"
          icon={faPlus}
        />

        <ResponsiveGrid cols={{ base: 1, md: 2, xl: 4 }}>
          {cadastros.map((item) => (
            <CadastroNavigationCard
              key={item.title}
              icon={item.icon}
              title={item.title}
              description={item.description}
              tone={item.tone}
              onClick={() => navigate(item.path)}
            />
          ))}
        </ResponsiveGrid>
      </div>
    </PageLayout>
  );
}

export default CadastrosGeraisPage;