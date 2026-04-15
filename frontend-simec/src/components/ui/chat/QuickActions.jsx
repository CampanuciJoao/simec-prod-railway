// src/components/chat/ChatQuickActions.jsx

import React from 'react';
import Button from '@/components/ui/primitives/Button';
import PageSection from '@/components/ui/layout/PageSection';

function ChatQuickActions({ onAction }) {
  const actions = [
    {
      label: 'Agendar manutenção',
      message: 'Quero agendar uma manutenção',
    },
    {
      label: 'Ver relatórios',
      message: 'Quero um relatório de manutenções',
    },
    {
      label: 'Buscar seguro',
      message: 'Quero consultar um seguro',
    },
  ];

  return (
    <PageSection title="Ações rápidas">
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="secondary"
            onClick={() => onAction(action.message)}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </PageSection>
  );
}

export default ChatQuickActions;