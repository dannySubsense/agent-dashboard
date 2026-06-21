'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function AddProjectInput() {
  const [value, setValue]             = useState('');
  const [error, setError]             = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit() {
    if (value.trim() === '' || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res  = await fetch('/api/projects/paths', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ path: value.trim() }),
      });
      const json = await res.json() as { error?: string; data?: unknown };
      if (res.ok && !json.error) {
        setValue('');
        router.refresh();
      } else {
        setError(json.error ?? 'An unexpected error occurred');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="px-4 py-3 border-t border-border flex flex-col gap-1.5">
      <div className="flex gap-2">
        <Input
          className="flex-1 font-mono text-sm"
          placeholder="/absolute/path/to/repo"
          aria-label="Add project path"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !isSubmitting && value.trim() !== '') {
              void handleSubmit();
            }
          }}
          disabled={isSubmitting}
        />
        <Button
          className="shrink-0"
          onClick={() => void handleSubmit()}
          disabled={value.trim() === '' || isSubmitting}
        >
          {isSubmitting ? 'Adding...' : 'Add'}
        </Button>
      </div>
      {error !== null && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
