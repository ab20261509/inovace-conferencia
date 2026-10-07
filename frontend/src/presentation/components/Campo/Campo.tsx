import {
  InputHTMLAttributes,
  forwardRef,
  ClipboardEvent,
  DragEvent,
  KeyboardEvent,
  MouseEvent,
} from 'react';
import { Label } from '../Label/Label';
import './Campo.css';

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  variant?: 'default' | 'scanner' | 'compact';
  error?: string;
  bloquearColar?: boolean;
  onTentativaColar?: () => void;
}

export const Campo = forwardRef<HTMLInputElement, CampoProps>(
  (
    {
      label,
      variant = 'default',
      error,
      className = '',
      id,
      bloquearColar,
      onTentativaColar,
      onPaste,
      onDrop,
      onKeyDown,
      onContextMenu,
      ...props
    },
    ref
  ) => {
    const inputId = id || `campo-${label?.replace(/\s/g, '-').toLowerCase()}`;
    const deveBloquearColar = bloquearColar ?? (variant === 'scanner');

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
      if (deveBloquearColar) {
        e.preventDefault();
        onTentativaColar?.();
        return;
      }
      onPaste?.(e);
    };

    const handleDrop = (e: DragEvent<HTMLInputElement>) => {
      if (deveBloquearColar) {
        e.preventDefault();
        onTentativaColar?.();
        return;
      }
      onDrop?.(e);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (deveBloquearColar) {
        const isCtrlV = (e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V');
        const isShiftInsert = e.shiftKey && e.key === 'Insert';
        if (isCtrlV || isShiftInsert) {
          e.preventDefault();
          onTentativaColar?.();
          return;
        }
      }
      onKeyDown?.(e);
    };

    const handleContextMenu = (e: MouseEvent<HTMLInputElement>) => {
      if (deveBloquearColar) {
        e.preventDefault();
      }
      onContextMenu?.(e);
    };

    return (
      <div className={`ui-campo ui-campo--${variant} ${error ? 'ui-campo--error' : ''} ${className}`}>
        {label && <Label htmlFor={inputId}>{label}</Label>}
        <input
          ref={ref}
          id={inputId}
          className="ui-campo__input"
          onPaste={handlePaste}
          onDrop={handleDrop}
          onKeyDown={handleKeyDown}
          onContextMenu={handleContextMenu}
          {...props}
        />
        {error && <span className="ui-campo__error">{error}</span>}
      </div>
    );
  }
);

Campo.displayName = 'Campo';
