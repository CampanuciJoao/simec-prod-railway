import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  faBuilding,
  faEnvelope,
  faMicrochip,
  faPlus,
  faSatelliteDish,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';

import { PageHeader, PageLayout, ResponsiveGrid } from '@/components/ui';
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
      icon: faSatelliteDish,
      title: 'PACS',
      description: 'Configure conexoes PACS read-only e acompanhe os ciclos de ingestao.',
      tone: 'blue',
      path: '/cadastros/pacs',
    },
    {
      icon: faUsers,
      title: 'Usuarios',
      description: 'Gerencie usuarios e permissoes de acesso.',
      tone: 'yellow',
      path: '/gerenciamento/usuarios',
    },
    {
      icon: faEnvelope,
      title: 'E-mails de Notificacao',
      description: 'Configure e-mails usados para alertas e comunicacao.',
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

        <ResponsiveGrid cols={{ base: 1, md: 2, xl: 5 }}>
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
