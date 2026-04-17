import React from 'react';
import PropTypes from 'prop-types';

const variants = {
  primary: 'text-white border border-transparent',
  secondary: 'border',
  danger: 'text-white border border-transparent ui-button-danger',
  success: 'text-white border border-transparent ui-button-success',
  ghost: 'border border-transparent bg-transparent',
};

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

function getVariantStyle(variant) {
  if (variant === 'primary') {
    return {
      '--button-bg': 'var(--brand-primary)',
      '--button-bg-hover': 'var(--button-primary-hover)',
      '--button-text': 'var(--text-inverse)',
      '--button-border': 'transparent',
    };
  }

  if (variant === 'danger') {
    return {
      '--button-bg': 'var(--color-danger)',
      '--button-bg-hover': 'var(--button-danger-hover)',
      '--button-text': 'var(--text-inverse)',
      '--button-border': 'transparent',
    };
  }

  if (variant === 'success') {
    return {
      '--button-bg': 'var(--color-success)',
      '--button-bg-hover': 'var(--button-success-hover)',
      '--button-text': 'var(--text-inverse)',
      '--button-border': 'transparent',
    };
  }

  if (variant === 'secondary') {
    return {
      '--button-bg': 'var(--button-secondary-bg)',
      '--button-bg-hover': 'var(--button-secondary-hover)',
      '--button-text': 'var(--button-secondary-text)',
      '--button-border': 'var(--button-secondary-border)',
    };
  }

  if (variant === 'ghost') {
    return {
      '--button-bg': 'transparent',
      '--button-bg-hover': 'var(--button-ghost-hover)',
      '--button-text': 'var(--text-primary)',
      '--button-border': 'transparent',
    };
  }

  return {};
}

function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  fullWidth = false,
  ...props
}) {
  return (
    <button
      type={type}
      style={getVariantStyle(variant)}
      className={[
        'ui-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold',
        'ui-transition ui-brand-ring disabled:cursor-not-allowed disabled:opacity-60',
        'hover:-translate-y-[1px]',
        sizes[size],
        variants[variant],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  variant: PropTypes.oneOf([
    'primary',
    'secondary',
    'danger',
    'success',
    'ghost',
  ]),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
  fullWidth: PropTypes.bool,
};

export default Button;