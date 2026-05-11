import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import {
  faBuilding,
  faEnvelope,
  faPaperPlane,
  faPlus,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';

import { PageHeader, PageLayout, ResponsiveGrid } from '@/components/ui';
import { CadastroNavigationCard } from '@/components/shared';

const CADASTROS = [
  {
    icon: faBuilding,
    title: 'Unidades',
    description: 'Gerencie as unidades cadastradas no sistema.',
    tone: 'blue',
    path: '/cadastros/unidades',
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
  {
    icon: faPaperPlane,
    title: 'Telegram',
    description: 'Configure chats e grupos do Telegram para receber alertas.',
    tone: 'sky',
    path: '/cadastros/telegram',
  },
];

/**
 * Hub de cadastros administrativos.
 *
 * `embedded`: quando renderizado como aba dentro de outra página
 * (ex: Gerenciamento), evita duplicar PageLayout/PageHeader — entrega
 * apenas o grid de cards.
 */
function CadastrosGeraisPage({ embedded = false }) {
  const navigate = useNavigate();

  const grid = (
    <ResponsiveGrid cols={{ base: 1, md: 2, xl: 3 }}>
      {CADASTROS.map((item) => (
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
  );

  if (embedded) return grid;

  return (
    <PageLayout padded fullHeight>
      <div className="space-y-6">
        <PageHeader
          title="Cadastros Gerais"
          subtitle="Centralize os cadastros administrativos do sistema"
          icon={faPlus}
        />
        {grid}
      </div>
    </PageLayout>
  );
}

CadastrosGeraisPage.propTypes = {
  embedded: PropTypes.bool,
};

export default CadastrosGeraisPage;
