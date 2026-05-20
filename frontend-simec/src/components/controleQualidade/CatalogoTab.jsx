import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave } from '@fortawesome/free-solid-svg-icons';

import {
  PageSection,
  PageState,
  Button,
  Input,
} from '@/components/ui';
import { useCatalogoTipos } from '@/hooks/controleQualidade';

function CatalogoTab() {
  const { tipos, loading, error, edits, salvandoId, onChangeField, salvar } = useCatalogoTipos();

  if (loading) return <PageSection><PageState loading /></PageSection>;
  if (error) return <PageSection><PageState error={error} /></PageSection>;

  const porModalidade = tipos.reduce((acc, t) => {
    const m = t.modalidade || 'Sem modalidade';
    if (!acc[m]) acc[m] = [];
    acc[m].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(porModalidade).map(([modalidade, lista]) => (
        <PageSection key={modalidade} title={modalidade}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }} className="text-left text-xs uppercase">
                  <th className="px-2 py-2">Código</th>
                  <th className="px-2 py-2">Nome</th>
                  <th className="px-2 py-2">Frequência (dias)</th>
                  <th className="px-2 py-2">Obrigatório</th>
                  <th className="px-2 py-2">Ativo</th>
                  <th className="px-2 py-2">Norma</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((tipo) => {
                  const dirty = edits[tipo.id] || {};
                  const valor = (campo) => (dirty[campo] !== undefined ? dirty[campo] : tipo[campo]);
                  const temMudanca = Object.keys(dirty).length > 0;

                  return (
                    <tr key={tipo.id} style={{ borderTop: '1px solid var(--border-soft)' }}>
                      <td className="px-2 py-2 font-mono text-xs">{tipo.codigo}</td>
                      <td className="px-2 py-2">{tipo.nome}</td>
                      <td className="px-2 py-2 max-w-[120px]">
                        <Input
                          type="number"
                          min="1"
                          max="3650"
                          value={valor('frequenciaDias')}
                          onChange={(e) => onChangeField(tipo.id, 'frequenciaDias', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={!!valor('obrigatorio')}
                          onChange={(e) => onChangeField(tipo.id, 'obrigatorio', e.target.checked)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={!!valor('ativo')}
                          onChange={(e) => onChangeField(tipo.id, 'ativo', e.target.checked)}
                        />
                      </td>
                      <td className="px-2 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {tipo.normaReferencia || '—'}
                      </td>
                      <td className="px-2 py-2">
                        {temMudanca ? (
                          <Button
                            size="sm"
                            onClick={() => salvar(tipo)}
                            disabled={salvandoId === tipo.id}
                          >
                            <FontAwesomeIcon icon={faSave} />
                            <span className="ml-2">{salvandoId === tipo.id ? '...' : 'Salvar'}</span>
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PageSection>
      ))}
    </div>
  );
}

export default CatalogoTab;
