/**
 * Reads the human-enterable key back out of an `otpauth://` URI.
 *
 * The server sends both the URI and the stored secret, but those are two
 * different encodings of the same bytes: the stored secret is hex, and only
 * the base32 form inside the URI is what an authenticator app will accept.
 * Offering the hex string as a manual-entry fallback produces an enrolment
 * that looks fine and then rejects every code the user types.
 *
 * Rather than have the server send the base32 key a second time as its own
 * field — two sources for one value, which is how they drift — this pulls it
 * out of the URI that already carries it.
 */
export function manualEntryKey(otpauthUrl: string | undefined): string | null {
  if (!otpauthUrl) return null

  try {
    // `URL` won't parse the `otpauth:` scheme usefully, so swap it for one it
    // understands. Only the query string matters here.
    const parsed = new URL(otpauthUrl.replace(/^otpauth:\/\//, 'https://'))
    return parsed.searchParams.get('secret')
  } catch {
    return null
  }
}

/**
 * Groups a base32 key into blocks of four.
 *
 * Purely presentational, and worth it: this is a 32-character string a user
 * may have to copy by hand across two devices, and unbroken it is very easy
 * to lose your place in. Authenticator apps ignore whitespace in a pasted
 * key, so the spaces are safe to include.
 */
export function formatEntryKey(key: string): string {
  return key.replace(/(.{4})/g, '$1 ').trim()
}
