import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faFileInvoiceDollar } from '@fortawesome/free-solid-svg-icons';

import { Button, PageSection } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { exportarOrcamentoCqPDF } from '@/services/api/pdfApi';

// Cartao reutilizavel pra cada relatorio pre-formatado.
function RelatorioRapidoCard({ icon, titulo, descricao, ctaLabel, onClick, loading }) {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-4"
      style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'var(--brand-primary-soft)', color: 'var(--brand-primary)' }}
        >
          <FontAwesomeIcon icon={icon} />
        </div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {titulo}
        </h3>
      </div>
      <p className="flex-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {descricao}
      </p>
      <Button variant="secondary" onClick={onClick} disabled={loading}>
        <FontAwesomeIcon icon={faFilePdf} />
        <span className="ml-2">{loading ? 'Gerando PDF...' : ctaLabel}</span>
      </Button>
    </div>
  );
}

function RelatoriosRapidosSection() {
  const { addToast } = useToast();
  const [loadingId, setLoadingId] = useState(null);

  const handleOrcamentoCq = async () => {
    setLoadingId('orcamento_cq');
    try {
      await exportarOrcamentoCqPDF();
      addToast('Relatório de orçamento de CQ baixado.', 'success');
    } catch (err) {
      addToast(
        err?.response?.data?.message || 'Erro ao gerar PDF. Tente novamente.',
        'error'
      );
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <PageSection
      title="Relatórios prontos"
      subtitle="Documentos pré-formatados para uso operacional — clique e baixe"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <RelatorioRapidoCard
          icon={faFileInvoiceDollar}
          titulo="Orçamento de Controle de Qualidade"
          descricao="Inventário dos equipamentos das modalidades reguladas (RM, TC, RX, Mamografia, US, Densitometria) com modelo, fabricante, número de série e CNPJ da unidade. Ideal para solicitar cotação a prestadores credenciados."
          ctaLabel="Baixar PDF"
          onClick={handleOrcamentoCq}
          loading={loadingId === 'orcamento_cq'}
        />
      </div>
    </PageSection>
  );
}

export default RelatoriosRapidosSection;
