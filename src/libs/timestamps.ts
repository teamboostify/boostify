/**
 * Helpers for the `TimestampString(3)` columns of the Prisma 8 contract.
 *
 * The timestamp columns map to PostgreSQL `timestamp(3)` (without time zone)
 * and are exchanged as PostgreSQL's own text form, so no JavaScript `Date` and
 * no `Temporal` object ever reaches the database. Values are always written in
 * UTC, which is what the previous Prisma 7 client did as well.
 */

const TIMESTAMP_PATTERN =
  /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?$/;

/**
 * Formats a date as a PostgreSQL `timestamp` literal in UTC, e.g.
 * `2026-10-21 21:37:51.261`.
 */
export function toTimestampString(date: Date): string {
  return date.toISOString().replace("T", " ").replace("Z", "");
}

/**
 * The current time as a PostgreSQL `timestamp` literal in UTC.
 */
export function nowTimestampString(): string {
  return toTimestampString(new Date());
}

/**
 * Parses a PostgreSQL `timestamp` value read from the database into a
 * `Date`. The stored value has no time zone, so it is read as UTC.
 */
export function fromTimestampString(value: string): Date {
  const match = TIMESTAMP_PATTERN.exec(value);
  if (!match) return new Date(value);

  const [, date, time, fraction] = match;
  const milliseconds = `${fraction ?? ""}000`.slice(0, 3);
  return new Date(`${date}T${time}.${milliseconds}Z`);
}
