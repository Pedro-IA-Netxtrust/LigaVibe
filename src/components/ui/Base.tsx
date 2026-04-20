import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  key?: React.Key;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export function Card({ children, className, title, subtitle, ...props }: CardProps) {
  return (
    <div className={cn("glass-card overflow-hidden", className)} {...props}>
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/30">
          {title && <h3 className="text-lg font-semibold text-slate-100">{title}</h3>}
          {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  title?: string;
}

export function Button({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md', 
  isLoading,
  disabled,
  ...props 
}: ButtonProps) {
  const variants = {
    primary: 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm active:translate-y-px',
    secondary: 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 active:translate-y-px',
    ghost: 'bg-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-100',
    danger: 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-600/20',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}
