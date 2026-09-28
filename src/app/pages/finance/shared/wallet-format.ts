/**
 * Formatting shared by every wallet screen, so a payment method or a status
 * never reads one way in a table and another in a dialog.
 */

/** Icon per payment method type. Keyed by the backend's own enum. */
export const METHOD_ICONS: Record<string, string> = {
  bank_account: 'solar:card-linear',
  vodafone_cash: 'solar:smartphone-linear',
  instapay: 'solar:card-transfer-linear',
  cash: 'solar:wad-of-money-linear',
};

/** The stages a withdrawal moves through, in order. */
export const WITHDRAWAL_STAGES = ['submitted', 'under_review', 'transferring', 'completed'];

/**
 * Colour for a withdrawal status. Rejected is the only red one: a request
 * still moving is not a problem, and colouring it red would say it was.
 */
export function withdrawalStatusClass(status: string): string {
  if (status === 'completed') return 'success';
  if (status === 'rejected') return 'error';
  return 'warning';
}

/** Colour for a payment method status, on the same reasoning. */
export function methodStatusClass(status: string): string {
  if (status === 'active') return 'success';
  if (status === 'disabled') return 'error';
  return 'warning';
}

/** A ledger entry paid into the wallet reads green; one paid out reads red. */
export function amountClass(amount: number): string {
  return amount >= 0 ? 'text-success' : 'text-error';
}

/** `2026-09-13T17:21:06.000Z` -> `2026-09-13 17:21`. */
export function formatDateTime(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    ` ${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** `2026-09-13T…` -> `2026-09-13`. */
export function formatDate(iso: string): string {
  return iso ? iso.slice(0, 10) : '';
}
