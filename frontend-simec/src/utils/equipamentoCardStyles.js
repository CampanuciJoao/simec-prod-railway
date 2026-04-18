import { getStatusTone } from '@/components/ui';

export function getEquipamentoCardStyles(status) {
  const tone = getStatusTone(status);

  return {
    cardStyle: {
      backgroundColor: tone.soft,
      borderColor: tone.border,
      borderLeftColor: tone.strong,
    },
    toggleStyle: {
      backgroundColor: 'var(--bg-surface)',
      borderColor: tone.border,
      color: tone.strong,
    },
    expandedStyle: {
      borderTop: `1px solid ${tone.border}`,
      backgroundColor: 'var(--bg-surface)',
    },
    infoCardStyle: {
      backgroundColor: 'var(--bg-surface)',
      borderColor: tone.border,
    },
  };
}
