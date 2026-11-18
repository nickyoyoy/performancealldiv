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

export function formatDateWIB(dateStr: string | null | undefined): string {
  if (!dateStr || dateStr === 'N/A') return '-';
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return dateStr;
  const [, year, month, day] = match;
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];
  const mIndex = parseInt(month, 10) - 1;
  const mName = monthNames[mIndex] || month;
  return `${parseInt(day, 10)} ${mName} ${year}`;
}
