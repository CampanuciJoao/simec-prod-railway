import React from 'react';
import PropTypes from 'prop-types';

const variants = {
  primary:
    'text-white border border-transparent',
  secondary:
    'border ui-transition',
  danger:
    'text-white border border-transparent',
  success:
    'text-white border border-transparent',
  ghost:
    'border border-transparent bg-transparent',
};

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

function getInlineStyle(variant) {
  if (variant === 'primary') {
    return {
      backgroundColor: 'var(--brand-primary)',
    };
  }

  if (variant === 'danger') {
    return {
      backgroundColor: 'var(--color-danger)',
    };
  }

  if (variant === 'success') {
    return {
      backgroundColor: 'var(--color-success)',
    };
  }

  if (variant === 'secondary') {
    return {
      backgroundColor: 'var(--button-secondary-bg)',
      color: 'var(--button-secondary-text)',
      borderColor: 'var(--button-secondary-border)',
    };
  }

  if (variant === 'ghost') {
    return {
      color: 'var(--text-secondary)',
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
  ...props
}) {
  return (
    <button
      type={type}
      style={getInlineStyle(variant)}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold',
        'ui-transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-60',
        'hover:translate-y-[-1px]',
        variant === 'ghost' ? 'hover:bg-black/5 dark:hover:bg-white/5' : '',
        sizes[size],
        variants[variant],
        className,
      ].join(' ')}
      {...props}
      onMouseEnter={(e) => {
        if (variant === 'primary') {
          e.currentTarget.style.backgroundColor = 'var(--brand-primary-hover)';
        }
        if (variant === 'secondary') {
          e.currentTarget.style.backgroundColor = 'var(--button-secondary-hover)';
        }
        if (variant === 'danger') {
          e.currentTarget.style.filter = 'brightness(0.95)';
        }
        if (variant === 'success') {
          e.currentTarget.style.filter = 'brightness(0.95)';
        }
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        Object.assign(e.currentTarget.style, getInlineStyle(variant));
        e.currentTarget.style.filter = '';
        props.onMouseLeave?.(e);
      }}
    >
      {children}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'success', 'ghost']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
};

export default Button;