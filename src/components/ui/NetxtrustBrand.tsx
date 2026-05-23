import React from 'react';
import { cn } from '../../lib/utils';

interface NetxtrustBrandProps {
  prefix?: string;
  className?: string;
  netxClassName?: string;
  trustClassName?: string;
}

/** "Netx" en verde, "trust" en rojo (case-insensitive en el texto fuente). */
export function NetxtrustBrand({
  prefix,
  className,
  netxClassName = 'text-emerald-500',
  trustClassName = 'text-red-500'
}: NetxtrustBrandProps) {
  return (
    <span className={cn('inline-flex items-baseline gap-0.5', className)}>
      {prefix ? <span className="text-inherit">{prefix}</span> : null}
      <span className={cn('font-semibold', netxClassName)}>Netx</span>
      <span className={cn('font-semibold', trustClassName)}>trust</span>
    </span>
  );
}
