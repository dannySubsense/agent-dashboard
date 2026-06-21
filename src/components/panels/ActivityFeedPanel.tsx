'use client';

import { useState } from 'react';
import { PanelShell } from '@/components/shared/PanelShell';
import { PanelUnavailable } from '@/components/shared/PanelUnavailable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { ActivityEvent, ActivityEventType, ApiResponse } from '@/types';

interface ActivityFeedPanelProps {
  initialData: ApiResponse<ActivityEvent[]>;
}

const TYPE_LABELS: Record<ActivityEventType, string> = {
  'lore-capture': 'LORE capture',
  'git-commit': 'Git commit',
  'pr-merge': 'PR merge',
};

const TYPE_DOT_CLASSES: Record<ActivityEventType, string> = {
  'lore-capture': 'bg-violet-500',
  'git-commit': 'bg-sky-500',
  'pr-merge': 'bg-emerald-500',
};

function formatAbsoluteTimestamp(date: Date | string | number): string {
  const d = new Date(date)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const min = String(d.getUTCMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

export function ActivityFeedPanel({ initialData }: ActivityFeedPanelProps) {
  const [filterProject, setFilterProject] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<ActivityEventType | null>(null);

  const events = initialData.data ?? [];

  // Sorted distinct repoNames for the project dropdown
  const repoNames = Array.from(new Set(events.map(e => e.repoName))).sort();

  // Client-side filtering: events must match BOTH active filters
  const filteredEvents = events.filter(e => {
    if (filterProject !== null && e.repoName !== filterProject) return false;
    if (filterType !== null && e.type !== filterType) return false;
    return true;
  });

  const hasActiveFilter = filterProject !== null || filterType !== null;

  // When data is null we bypass PanelShell's null-gate so FeedFilterBar stays visible.
  // Unavailable state is rendered manually inside children.
  const shellResponse: ApiResponse<ActivityEvent[]> =
    initialData.data !== null
      ? initialData
      : { data: [], error: null, stale: false, cachedAt: null };

  return (
    <PanelShell title="Unified Activity Feed" response={shellResponse}>
      {/* Filter bar — always visible */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Project:</span>
          <Select
            value={filterProject ?? '__all__'}
            onValueChange={val =>
              setFilterProject(val === '__all__' ? null : val)
            }
          >
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              {repoNames.map(name => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Type:</span>
          <Select
            value={filterType ?? '__all__'}
            onValueChange={val =>
              setFilterType(
                val === '__all__' ? null : (val as ActivityEventType)
              )
            }
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              <SelectItem value="lore-capture">LORE capture</SelectItem>
              <SelectItem value="git-commit">Git commit</SelectItem>
              <SelectItem value="pr-merge">PR merge</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilter && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              setFilterProject(null);
              setFilterType(null);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Timeline — or unavailable state when data is null */}
      {initialData.data === null ? (
        <PanelUnavailable error={initialData.error} />
      ) : filteredEvents.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          {hasActiveFilter
            ? 'No events match the current filters.'
            : 'No activity in the last 14 days.'}
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-auto">
          {filteredEvents.map(event => (
            <li key={event.id} className="flex items-start gap-3 px-4 py-3">
              {/* Type indicator dot */}
              <span
                className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${TYPE_DOT_CLASSES[event.type]}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">
                    {formatAbsoluteTimestamp(event.timestamp)}
                  </span>
                  <span className="font-medium text-foreground">
                    {TYPE_LABELS[event.type]}
                  </span>
                  <span className="text-sm">{event.repoName}</span>
                </div>
                <p className="mt-0.5 truncate text-sm">{event.summary}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PanelShell>
  );
}
