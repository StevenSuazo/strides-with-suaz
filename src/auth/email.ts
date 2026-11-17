/**
 * email.ts: a quick shape check so typos never reach Supabase.
 *
 * isValidEmail(value): trims spaces, then needs something@something.something
 * with no spaces and one @. Supabase does the real check when it sends.
 */
export const isValidEmail: (value: string) => boolean = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
