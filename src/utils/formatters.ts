/**
 * Enterprise formatters for Scentplus All-Div KPI & Commission Dashboard.
 */

export function formatCurrencyIDR(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '-';
  }
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val);

  return formatted.replace(/\s+/g, ' ');
}

export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '-';
  }
  return new Intl.NumberFormat('id-ID').format(val);
}

export function formatPercent(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '-';
  }
  const pct = val * 100;
  return `${pct.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

export function formatRoas(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '-';
  }
  const str = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
  return `${str}x`;
}
