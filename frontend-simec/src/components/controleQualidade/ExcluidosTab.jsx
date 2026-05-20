import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotateLeft } from '@fortawesome/free-solid-svg-icons';

import {
  PageSection,
  PageState,
  Button,
  Badge,
} from '@/components/ui';
import { useTestesExcluidos } from '@/hooks/controleQualidade';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

function ExcluidosTab() {
  const { testes, loading, error, restaurandoId, restaurar } = useTestesExcluidos();

  if (loading) return <PageSection><PageState loading /></PageSection>;
  if (error) return <PageSection><PageState error={error} /></PageSection>;

  if (testes.length === 0) {
    return (
      <PageSection>
        <PageState
          isEmpty
          emptyMessage="Nenhum teste excluído. Os laudos PDF permanecem arquivados por 5 anos mesmo após exclusão (RDC 611/2022)."
        />
      </PageSection>
    );
  }

  return (
    <PageSection>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr style={{ color: 'var(--text-muted)' }} className="text-left text-xs uppercase">
              <th className="px-2 py-2">Equipamento</th>
              <th className="px-2 py-2">Tipo</th>
              <th className="px-2 py-2">Data execução</th>
              <th className="px-2 py-2">Excluído em</th>
              <th className="px-2 py-2">Justificativa</th>
              <th className="px-2 py-2">Resultado</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {testes.map((t) => (
              <tr key={t.id} style={{ borderTop: '1px solid var(--border-soft)' }}>
                <td className="px-2 py-2">
                  <div className="font-medium">{t.equipamento?.modelo}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {t.equipamento?.tag}
                  </div>
                </td>
                <td className="px-2 py-2 font-mono text-xs">{t.tipoTeste?.codigo}</td>
                <td className="px-2 py-2">{fmt(t.dataExecucao)}</td>
                <td className="px-2 py-2">{fmt(t.deletadoEm)}</td>
                <td className="px-2 py-2 max-w-md text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t.motivoExclusao || '—'}
                </td>
                <td className="px-2 py-2">
                  <Badge variant="slate">{t.resultado || 'Pendente'}</Badge>
                </td>
                <td className="px-2 py-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => restaurar(t)}
                    disabled={restaurandoId === t.id}
                  >
                    <FontAwesomeIcon icon={faRotateLeft} />
                    <span className="ml-2">{restaurandoId === t.id ? '...' : 'Restaurar'}</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageSection>
  );
}

export default ExcluidosTab;
