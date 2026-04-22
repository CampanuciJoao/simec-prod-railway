import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  faBolt,
  faChartColumn,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

import BarChart from '@/components/charts/BarChart';
import {
  InfoCard,
  LoadingState,
  PageSection,
  ResponsiveGrid,
} from '@/components/ui';
import {
  getPacsFeaturesByEquipamento,
  getPacsPredictionByEquipamento,
} from '@/services/api';

function TabPacs({ equipamentoId }) {
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState([]);
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const [featuresData, predictionData] = await Promise.all([
          getPacsFeaturesByEquipamento(equipamentoId),
          getPacsPredictionByEquipamento(equipamentoId),
        ]);

        if (!active) return;

        setFeatures(Array.isArray(featuresData) ? featuresData : []);
        setPrediction(predictionData || null);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [equipamentoId]);

  const chartData = useMemo(
    () =>
      [...features]
        .reverse()
        .map((item) => ({
          name: new Date(item.data).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
          }),
          value: Number(item.volumeEstudos || 0),
        })),
    [features]
  );

  if (loading) {
    return <LoadingState message="Carregando dados PACS..." />;
  }

  const latestFeature = features[0] || prediction?.feature || null;
  let latestSignals = [];

  try {
    latestSignals = JSON.parse(latestFeature?.sinaisAnomalia || '[]');
  } catch {
    latestSignals = [];
  }

  return (
    <div className="space-y-6">
      <ResponsiveGrid cols={{ base: 1, md: 2, xl: 4 }}>
        <InfoCard
          icon={faChartColumn}
          label="Volume 30 dias"
          value={features.reduce((sum, item) => sum + Number(item.volumeEstudos || 0), 0)}
        />
        <InfoCard
          icon={faBolt}
          label="Disponibilidade"
          value={
            latestFeature?.disponibilidade != null
              ? `${latestFeature.disponibilidade}%`
              : 'N/A'
          }
        />
        <InfoCard
          icon={faTriangleExclamation}
          label="Anomalia PACS"
          value={latestFeature?.anomalia ? 'Detectada' : 'Nao detectada'}
        />
        <InfoCard
          icon={faTriangleExclamation}
          label="Ultimo sinal"
          value={latestSignals[0]?.detail || 'Sem sinais recentes'}
        />
      </ResponsiveGrid>

      <PageSection
        title="Volume de estudos"
        description="Serie diaria dos ultimos 30 dias agregados para este equipamento."
      >
        <div className="h-72">
          <BarChart
            data={chartData}
            datasetLabel="Estudos"
            emptyMessage="Nenhuma feature PACS disponivel para este equipamento."
          />
        </div>
      </PageSection>
    </div>
  );
}

TabPacs.propTypes = {
  equipamentoId: PropTypes.string.isRequired,
};

export default TabPacs;
