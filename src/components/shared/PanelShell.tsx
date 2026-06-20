import type { ApiResponse } from '@/types';
import { PanelUnavailable } from './PanelUnavailable';

interface PanelShellProps {
  title: string;
  response: ApiResponse<unknown>;
  children: React.ReactNode;
}

export function PanelShell({ title, response, children }: PanelShellProps) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-card text-card-foreground h-full overflow-hidden">
      {/* Title bar */}
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      </div>

      {/* Stale notice — only when data is present but stale */}
      {response.stale && response.data !== null && (
        <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/50 border-b border-border">
          Showing cached data — data source currently unreachable.
          {response.error && (
            <span className="ml-1 font-mono">({response.error})</span>
          )}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {response.data === null ? (
          <PanelUnavailable error={response.error} />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
