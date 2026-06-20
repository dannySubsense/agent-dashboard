interface PanelUnavailableProps {
  error?: string | null;
}

export function PanelUnavailable({ error }: PanelUnavailableProps) {
  return (
    <div className="flex flex-col gap-2 p-4 text-sm">
      <p className="font-semibold text-destructive">Data unavailable</p>
      {error && (
        <p className="text-muted-foreground font-mono text-xs">{error}</p>
      )}
    </div>
  );
}
