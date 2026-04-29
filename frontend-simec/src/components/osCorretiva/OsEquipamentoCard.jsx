import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrochip, faHospital, faUser, faClock, faExclamationTriangle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { Card } from '@/components/ui';
import { formatarDataHora } from '@/utils/timeUtils';

const STATUS_EQUIPAMENTO_COLORS = {
  Operante: '#16a34a',
  Inoperante: '#dc2626',
  UsoLimitado: '#f97316',
  EmManutencao: '#7c3aed',
  Desativado: '#64748b',
};

const STATUS_EQUIPAMENTO_LABELS = {
  Operante: 'Operante',
  Inoperante: 'Inoperante',
  UsoLimitado: 'Uso limitado',
  EmManutencao: 'Em manutenção',
  Desativado: 'Desativado',
};

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <FontAwesomeIcon icon={icon} className="mt-0.5 shrink-0 text-sm" style={{ color: 'var(--text-muted)' }} />
      <div className="min-w-0">
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value || 'N/A'}</p>
      </div>
    </div>
  );
}

function OsEquipamentoCard({ os }) {
  const eq = os.equipamento;
  const statusAtual = eq?.status;
  const statusAbertura = os.statusEquipamentoAbertura;

  const statusAtualColor = STATUS_EQUIPAMENTO_COLORS[statusAtual] || '#64748b';
  const statusAberturaColor = STATUS_EQUIPAMENTO_COLORS[statusAbertura] || '#64748b';

  return (
    <Card className="rounded-3xl p-6 space-y-4">
      <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
        Dados do equipamento
      </h2>

      {/* Status em destaque */}
      <div className="space-y-2">
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ backgroundColor: `${statusAberturaColor}18` }}
        >
          <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: statusAberturaColor }} />
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status na abertura</p>
            <p className="text-sm font-bold" style={{ color: statusAberturaColor }}>
              {STATUS_EQUIPAMENTO_LABELS[statusAbertura] || statusAbertura}
            </p>
          </div>
        </div>

        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ backgroundColor: `${statusAtualColor}18` }}
        >
          <FontAwesomeIcon icon={statusAtual === 'Operante' ? faCheckCircle : faExclamationTriangle} style={{ color: statusAtualColor }} />
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status atual</p>
            <p className="text-sm font-bold" style={{ color: statusAtualColor }}>
              {STATUS_EQUIPAMENTO_LABELS[statusAtual] || statusAtual || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t pt-4" style={{ borderColor: 'var(--border-soft)' }}>
        <InfoRow icon={faMicrochip} label="Modelo" value={eq?.modelo} />
        <InfoRow icon={faMicrochip} label="TAG / Patrimônio" value={eq?.numeroPatrimonio ? `${eq.tag} / ${eq.numeroPatrimonio}` : eq?.tag} />
        <InfoRow icon={faHospital} label="Unidade" value={eq?.unidade?.nomeSistema} />
        <InfoRow icon={faMicrochip} label="Fabricante" value={eq?.fabricante} />
        <InfoRow icon={faUser} label="Solicitante" value={os.solicitante} />
        <InfoRow icon={faClock} label="Abertura" value={formatarDataHora(os.dataHoraAbertura)} />
        {os.dataHoraConclusao && (
          <InfoRow icon={faCheckCircle} label="Conclusão" value={formatarDataHora(os.dataHoraConclusao)} />
        )}
      </div>
    </Card>
  );
}

OsEquipamentoCard.propTypes = {
  os: PropTypes.object.isRequired,
};

export default OsEquipamentoCard;
