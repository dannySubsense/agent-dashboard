/**
 * requireEnv — returns the value of the named environment variable.
 * Logs a console.warn and returns "" if the variable is missing or empty.
 * Callers must handle "" returns — empty string signals an unavailable data
 * source, not a crash. Does NOT throw.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.warn(
      `[env] Missing required environment variable: ${name}. ` +
        `Dependent features will degrade gracefully.`
    );
    return '';
  }
  return value;
}

/**
 * optionalEnv — returns the value of the named environment variable,
 * or the provided defaultValue if the variable is absent or empty.
 * Does NOT throw.
 */
export function optionalEnv(name: string, defaultValue: string): string {
  const value = process.env[name];
  if (!value) {
    return defaultValue;
  }
  return value;
}
