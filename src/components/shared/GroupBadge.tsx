import React from 'react';
import { cn } from '../../lib/utils';
import { groupBadgeStyle, shortGroupLabel } from '../../lib/groupBadge';

interface GroupBadgeProps {
  groupName: string;
  rank?: number;
  className?: string;
  size?: 'sm' | 'md';
  key?: React.Key;
}

export function GroupBadge({ groupName, rank, className, size = 'sm' }: GroupBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-bold border rounded-md shrink-0',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1',
        groupBadgeStyle(groupName),
        className
      )}
      title={groupName}
    >
      {shortGroupLabel(groupName)}
      {rank !== undefined && <span className="opacity-80">· {rank}°</span>}
    </span>
  );
}
