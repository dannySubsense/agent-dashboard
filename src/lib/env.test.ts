/**
 * Acceptance criteria covered (US-09, US-08 env utilities):
 * - requireEnv logs console.warn and returns "" when variable is missing (does NOT throw)
 * - requireEnv returns the actual value when the variable is set
 * - optionalEnv returns the provided default when the variable is missing
 * - optionalEnv returns the actual value when the variable is set
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requireEnv, optionalEnv } from './env';

describe('requireEnv', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    delete process.env['TEST_REQUIRE_VAR'];
  });

  afterEach(() => {
    warnSpy.mockRestore();
    delete process.env['TEST_REQUIRE_VAR'];
  });

  it('logs console.warn and returns "" when variable is missing', () => {
    const result = requireEnv('TEST_REQUIRE_VAR');

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toContain('TEST_REQUIRE_VAR');
    expect(result).toBe('');
  });

  it('does not throw when variable is missing', () => {
    expect(() => requireEnv('TEST_REQUIRE_VAR')).not.toThrow();
  });

  it('returns the actual value when variable is set', () => {
    process.env['TEST_REQUIRE_VAR'] = 'hello-world';

    const result = requireEnv('TEST_REQUIRE_VAR');

    expect(result).toBe('hello-world');
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('optionalEnv', () => {
  beforeEach(() => {
    delete process.env['TEST_OPTIONAL_VAR'];
  });

  afterEach(() => {
    delete process.env['TEST_OPTIONAL_VAR'];
  });

  it('returns the default value when variable is missing', () => {
    const result = optionalEnv('TEST_OPTIONAL_VAR', 'my-default');

    expect(result).toBe('my-default');
  });

  it('returns the actual value when variable is set', () => {
    process.env['TEST_OPTIONAL_VAR'] = 'actual-value';

    const result = optionalEnv('TEST_OPTIONAL_VAR', 'my-default');

    expect(result).toBe('actual-value');
  });
});
