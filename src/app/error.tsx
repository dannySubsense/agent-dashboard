'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[app error boundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-lg font-semibold text-destructive">
        Something went wrong
      </h2>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        {error.message ?? 'An unexpected error occurred in the dashboard layout.'}
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground">
          Digest: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
