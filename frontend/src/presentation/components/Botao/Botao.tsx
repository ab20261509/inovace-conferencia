import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';
import './Botao.css';

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

export const Botao = forwardRef<HTMLButtonElement, BotaoProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={`ui-botao ui-botao--${variant} ui-botao--${size} ${fullWidth ? 'ui-botao--full' : ''} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <span className="ui-botao__spinner" /> : children}
      </button>
    );
  }
);

Botao.displayName = 'Botao';
