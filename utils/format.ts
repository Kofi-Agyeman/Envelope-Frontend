import { currency } from '@/constants/config';

export function formatMoney(amount: number, opts?: { decimals?: boolean }): string {
  const decimals = opts?.decimals ?? true;
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  });
  return `${currency.code} ${formatted}`;
}

export function formatAmountCompact(amount: number): string {
  if (Number.isInteger(amount)) return `${currency.code} ${amount}`;
  return `${currency.code} ${amount.toFixed(2)}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  return `•••• ${digits.slice(-4)}`;
}

/**
 * Reads a backend timestamp.
 *
 * FastAPI serialises `expiry_at`/`created_at` with an explicit UTC offset, but a
 * naive timestamp would be interpreted as device-local time and silently shift
 * the countdown by the device's offset. Anything without a zone designator is
 * therefore read as UTC. `null` means "the server has not said", which is not
 * the same as "expired".
 */
export function parseServerDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const ms = Date.parse(hasZone ? trimmed : `${trimmed}Z`);
  return Number.isNaN(ms) ? null : ms;
}

/** True only once the server's own expiry has passed. */
export function isExpired(value: string | null | undefined, now = Date.now()): boolean {
  const ms = parseServerDate(value);
  return ms !== null && ms <= now;
}

export function formatTime(iso: string | null | undefined): string {
  const ms = parseServerDate(iso);
  if (ms === null) return '—';
  return new Date(ms).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(iso: string | null | undefined): string {
  const ms = parseServerDate(iso);
  if (ms === null) return '—';
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateLong(iso: string | null | undefined): string {
  const ms = parseServerDate(iso);
  if (ms === null) return '—';
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function relativeTime(iso: string | null | undefined): string {
  const then = parseServerDate(iso);
  if (then === null) return '—';
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  return formatDate(iso);
}

/**
 * Countdown to the backend's `expiry_at`. This is the only thing that decides
 * how long a link is still good -- the app holds no window of its own.
 */
export function countdownLabel(iso: string | null | undefined, now = Date.now()): string {
  const ms = parseServerDate(iso);
  if (ms === null) return 'Expiry pending';
  const diff = ms - now;
  if (diff <= 0) return 'Expired';
  if (diff < 60_000) return 'Under a minute left';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days}d left`;
}

export function dayLabel(iso: string | null | undefined): string {
  const ms = parseServerDate(iso);
  if (ms === null) return '—';
  const d = new Date(ms);
  const now = new Date();
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

export function greetingForHour(hour = new Date().getHours()): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export function initialsFromName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function initialsFromCode(code: string): string {
  return code.slice(0, 2).toUpperCase();
}
