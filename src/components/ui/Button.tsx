import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'subtle';
  /** 'lg' = the big two-tap-friendly phone buttons. */
  size?: 'md' | 'lg';
  icon?: ReactNode;
  block?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  block,
  className = '',
  type = 'button',
  children,
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${size === 'lg' ? 'btn-lg' : ''} ${block ? 'btn-block' : ''} ${className}`}
      {...rest}
    >
      {icon}
      {children && <span>{children}</span>}
    </button>
  );
}
