import { getStatusTone } from '@/components/ui';

export function getEquipamentoCardStyles(status) {
  const tone = getStatusTone(status);

  return {
    cardStyle: {
      backgroundColor: 'var(--bg-surface)',
      borderColor: 'var(--border-soft)',
      borderLeftColor: tone.strong,
      boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
    },
    toggleStyle: {
      backgroundColor: 'var(--bg-surface)',
      borderColor: 'var(--border-soft)',
      color: tone.strong,
    },
    expandedStyle: {
      borderTop: '1px solid var(--border-soft)',
      backgroundColor: 'var(--bg-surface)',
    },
    infoCardStyle: {
      backgroundColor: tone.soft,
      borderColor: 'transparent',
    },
  };
}
