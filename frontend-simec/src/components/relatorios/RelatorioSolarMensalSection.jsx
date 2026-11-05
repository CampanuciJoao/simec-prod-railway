// Seção dedicada ao relatório PDF mensal de energia solar. Fica dentro de
// Relatórios, ao lado dos outros tipos. Usuario escolhe planta + mês/ano
// e baixa o PDF via axios (passa Authorization header do apiClient).

import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faSolarPanel, faSpinner } from '@fortawesome/free-solid-svg-icons';

import { Card, SelectMenu, Button, PageSection, InlineEmptyState } from '@/components/ui';
import { getSolarPlants, baixarSolarRelatorioPdf } from '@/services/api/solarApi';

const MESES = [
  { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' }, { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' }, { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' },
];

function anosDisponiveis() {
  const anoAtual = new Date().getFullYear();
  return [anoAtual, anoAtual - 1, anoAtual - 2].map((a) => ({ value: a, label: String(a) }));
}

function mesDefault() {
  const d = new Date();
  // Default: mes anterior se ainda estiver no inicio do mes
  if (d.getDate() <= 5) {
    const anterior = new Date(d);
    anterior.setMonth(anterior.getMonth() - 1);
    return { ano: anterior.getFullYear(), mes: anterior.getMonth() + 1 };
  }
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 };
}

export default function RelatorioSolarMensalSection() {
  const [plants, setPlants] = useState([]);
  const [plantId, setPlantId] = useState('');
  const defaults = mesDefault();
  const [ano, setAno] = useState(defaults.ano);
  const [mes, setMes] = useState(defaults.mes);
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    getSolarPlants()
      .then((list) => {
        setPlants(list || []);
        if (list?.length && !plantId) setPlantId(list[0].id);
      })
      .catch(() => {});
  }, []);

  const baixar = async () => {
    setBaixando(true);
    setErro('');
    try {
      await baixarSolarRelatorioPdf(plantId, { ano, mes });
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Falha ao gerar PDF';
      setErro(String(msg));
    } finally {
      setBaixando(false);
    }
  };

  return (
    <PageSection title="Relatório de Energia Solar">
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <FontAwesomeIcon icon={faSolarPanel} style={{ color: 'var(--brand-primary)' }} />
          <p className="text-sm font-semibold">Relatório mensal em PDF</p>
        </div>

        {plants.length === 0 ? (
          <InlineEmptyState message="Nenhuma planta solar cadastrada. Cadastre em Gerenciamento → Integrações → Energia Solar." />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <SelectMenu
                label="Planta"
                value={plantId}
                onChange={setPlantId}
                options={plants.map((p) => ({
                  value: p.id,
                  label: `${p.unidade?.nomeSistema || ''} — ${p.nome}`,
                }))}
              />
              <SelectMenu
                label="Mês"
                value={mes}
                onChange={(v) => setMes(Number(v))}
                options={MESES}
              />
              <SelectMenu
                label="Ano"
                value={ano}
                onChange={(v) => setAno(Number(v))}
                options={anosDisponiveis()}
              />
            </div>

            {erro && (
              <div className="mt-3 rounded-lg px-3 py-2 text-sm"
                   style={{ backgroundColor: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>
                {erro}
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <Button
                onClick={baixar}
                disabled={!plantId || baixando}
              >
                <FontAwesomeIcon
                  icon={baixando ? faSpinner : faFilePdf}
                  spin={baixando}
                />
                {baixando ? 'Gerando PDF...' : 'Baixar relatório'}
              </Button>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Inclui geração diária, falhas, quedas de energia e comparativo com mês anterior.
              </p>
            </div>
          </>
        )}
      </Card>
    </PageSection>
  );
}
