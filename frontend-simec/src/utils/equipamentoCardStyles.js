import { getStatusTone } from '@/components/ui';

export function getEquipamentoCardStyles(status) {
  const tone = getStatusTone(status);

  return {
    cardStyle: {
      backgroundColor: tone.soft,
      borderColor: tone.border,
      borderLeftColor: tone.strong,
      boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
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
      backgroundColor: tone.soft,
      borderColor: 'transparent',
    },
  };
}
