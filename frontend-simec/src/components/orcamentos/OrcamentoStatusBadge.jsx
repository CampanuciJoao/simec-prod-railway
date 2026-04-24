import { Badge } from '@/components/ui';

const CONFIG = {
  RASCUNHO:  { label: 'Rascunho',  variant: 'slate'  },
  PENDENTE:  { label: 'Pendente',  variant: 'yellow' },
  APROVADO:  { label: 'Aprovado',  variant: 'green'  },
  REJEITADO: { label: 'Rejeitado', variant: 'red'    },
};

function OrcamentoStatusBadge({ status }) {
  const cfg = CONFIG[status] || { label: status, variant: 'slate' };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export default OrcamentoStatusBadge;
