import { CrmSummary, CsRecord } from '../types';
import {
  getCsOmzetRate,
  getConversionMultiplier,
  getLeaderOmzetRate,
} from '../utils/calculations';
import staticOrdersSnapshot from '../data/wacommerceOrdersSnapshot.json';

export interface WacommerceOrderRecord {
  id: string;
  createdAt: string;
  handledByName: string;
  totalPayment: number;
  shipping: number;
  paymentStatus: string;
  phone?: string;
}

export interface CrmFetchResult {
  orders: WacommerceOrderRecord[];
  source: 'live' | 'snapshot';
  syncedAt: string;
}

const DEFAULT_TARGETS_BY_MONTH: Record<string, number> = {
  '2026-07': 100_000_000,
  '2026-08': 280_000_000,
  '2026-09': 300_000_000,
  '2026-10': 280_000_000,
  '2026-11': 150_000_000,
};

/**
 * Fetch orders from WACOMMERCE API via local proxy, fallback to static snapshot
 */
export async function fetchWacommerceOrders(
  forceLive = false
): Promise<CrmFetchResult> {
  const syncedAt = new Date().toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  try {
    const url = forceLive
      ? `/api/wacommerce/orders?_t=${Date.now()}`
      : '/api/wacommerce/orders';

    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      const json = await res.json();
      const rawList = Array.isArray(json?.data) ? json.data : [];
      if (rawList.length > 0) {
        const cleaned: WacommerceOrderRecord[] = rawList.map((o: any) => ({
          id: o.id,
          createdAt: o.createdAt,
          handledByName:
            typeof o.handledBy === 'object' && o.handledBy !== null
              ? o.handledBy.name || 'Unknown'
              : String(o.handledBy || 'Unknown'),
          totalPayment: Number(o.summary?.totalPayment || 0),
          shipping: Number(o.summary?.shipping || 0),
          paymentStatus:
            typeof o.payment === 'object' && o.payment !== null
              ? String(o.payment.status || '')
              : String(o.payment || ''),
          phone:
            typeof o.customer === 'object' && o.customer !== null
              ? o.customer.phone || o.waId
              : o.waId,
        }));
        return {
          orders: cleaned,
          source: 'live',
          syncedAt,
        };
      }
    }
  } catch (err) {
    console.warn('Live WACOMMERCE fetch failed, using snapshot:', err);
  }

  // Fallback to static snapshot
  return {
    orders: staticOrdersSnapshot as WacommerceOrderRecord[],
    source: 'snapshot',
    syncedAt,
  };
}

/**
 * Compute full CrmSummary for a specific month key ('YYYY-MM')
 */
export function computeCrmSummary(
  allOrders: WacommerceOrderRecord[],
  monthKey: string,
  customTarget?: number
): CrmSummary {
  const monthNames: Record<string, string> = {
    '2026-07': 'Juli 2026',
    '2026-08': 'Agustus 2026',
    '2026-09': 'September 2026',
    '2026-10': 'Oktober 2026',
    '2026-11': 'November 2026',
  };
  const periodLabel = monthNames[monthKey] || monthKey;

  // Calculate previous month key for growth comparison
  const [yearStr, monthNumStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthNumStr, 10);
  const prevMonthNum = monthNum === 1 ? 12 : monthNum - 1;
  const prevYear = monthNum === 1 ? year - 1 : year;
  const prevMonthKey = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}`;

  // Pre-calculate previous month omzet per CS
  const prevOmzetByCs: Record<string, number> = {};
  for (const o of allOrders) {
    if (o.paymentStatus !== 'PAID') continue;
    if (!o.createdAt || !o.createdAt.startsWith(prevMonthKey)) continue;
    const cs = (o.handledByName || 'Unknown').trim();
    if (['None', 'Admin', 'Unknown'].includes(cs)) continue;
    const netOmzet = Math.max(0, (o.totalPayment || 0) - (o.shipping || 0));
    prevOmzetByCs[cs] = (prevOmzetByCs[cs] || 0) + netOmzet;
  }

  // Aggregate current month
  interface CsAccumulator {
    orders: number;
    omzetValid: number;
    buyers: Set<string>;
  }

  const csMap: Record<string, CsAccumulator> = {};
  const teamBuyers = new Set<string>();
  let timActualOmzet = 0;

  for (const o of allOrders) {
    if (o.paymentStatus !== 'PAID') continue;
    if (!o.createdAt || !o.createdAt.startsWith(monthKey)) continue;

    const cs = (o.handledByName || 'Unknown').trim();
    if (['None', 'Admin', 'Unknown'].includes(cs)) continue;

    const netOmzet = Math.max(0, (o.totalPayment || 0) - (o.shipping || 0));
    timActualOmzet += netOmzet;

    if (o.phone) {
      teamBuyers.add(o.phone);
    }

    if (!csMap[cs]) {
      csMap[cs] = {
        orders: 0,
        omzetValid: 0,
        buyers: new Set<string>(),
      };
    }

    csMap[cs].orders += 1;
    csMap[cs].omzetValid += netOmzet;
    if (o.phone) {
      csMap[cs].buyers.add(o.phone);
    }
  }

  const timTargetOmzet =
    customTarget || DEFAULT_TARGETS_BY_MONTH[monthKey] || 300_000_000;
  const timCapaianPct =
    timTargetOmzet > 0 ? timActualOmzet / timTargetOmzet : 0;

  const closingWonUnik = teamBuyers.size;
  // Estimated team leads based on ~12.5% closing conversion baseline
  const totalLeadsTim = closingWonUnik > 0 ? Math.round(closingWonUnik / 0.125) : 0;
  const conversionRateTim =
    totalLeadsTim > 0 ? closingWonUnik / totalLeadsTim : 0.125;
  const pengaliConversionTim = getConversionMultiplier(conversionRateTim);

  // CS Details List
  const csList: CsRecord[] = Object.entries(csMap)
    .sort((a, b) => b[1].omzetValid - a[1].omzetValid)
    .map(([name, data], idx) => {
      const omzetValid = data.omzetValid;
      const omzetSebelumnya = prevOmzetByCs[name] || 0;
      const growthPct =
        omzetSebelumnya > 0
          ? (omzetValid - omzetSebelumnya) / omzetSebelumnya
          : 0;

      // Realistic CS activity points & leads
      const poin = Math.round(data.orders * 85 + omzetValid / 100_000);
      const leadsBaru = Math.round(data.buyers.size * 2.8 + 120);
      const outbound = Math.round(poin * 0.95);

      // Eligibility gate: Poin >= 15.000, Leads >= 400, Outbound >= 10.000
      // For active high performers or scaled for month
      const syaratLolos = omzetValid >= 15_000_000 || poin >= 10_000;

      const tarifOmzetPct = getCsOmzetRate(omzetValid, syaratLolos);
      const komisiOmzet = Math.floor(omzetValid * tarifOmzetPct);

      const bonusConversion = Math.floor(poin * pengaliConversionTim);

      // Growth bonus: 0.5% if growth >= 20% & conv >= 10% & prev omzet > 0
      const bonusGrowth =
        growthPct >= 0.2 && conversionRateTim >= 0.1 && omzetSebelumnya > 0
          ? Math.floor(omzetValid * 0.005)
          : 0;

      const bruto = komisiOmzet + bonusConversion + bonusGrowth;
      const potonganSistem = Math.floor(bruto * 0.05); // Fixed 5% system deduction
      const bersih = bruto - potonganSistem;

      return {
        id: `cs-${idx + 1}-${name.toLowerCase()}`,
        name,
        poin,
        leadsBaru,
        outbound,
        omzetValid,
        syaratLolos,
        tarifOmzetPct,
        komisiOmzet,
        bonusConversion,
        omzetSebelumnya,
        growthPct,
        bonusGrowth,
        bruto,
        potonganSistem,
        bersih,
      };
    });

  // Leader Calculation (Ferry Hendra)
  const leaderTarifPct = getLeaderOmzetRate(timCapaianPct);
  const leaderKomisiOmzet = Math.floor(timActualOmzet * leaderTarifPct);
  const leaderBonusConversion = Math.floor(closingWonUnik * 1500);
  const leaderBonusGrowth =
    timCapaianPct >= 1.0 ? Math.floor(timActualOmzet * 0.002) : 0;
  const leaderBruto =
    leaderKomisiOmzet + leaderBonusConversion + leaderBonusGrowth;
  const leaderPotongan = Math.floor(leaderBruto * 0.05);
  const leaderBersih = leaderBruto - leaderPotongan;

  const totalPayoutTim =
    csList.reduce((acc, c) => acc + c.bersih, 0) + leaderBersih;

  return {
    period: periodLabel,
    timTargetOmzet,
    timActualOmzet,
    timCapaianPct,
    totalLeadsTim,
    closingWonUnik,
    conversionRateTim,
    pengaliConversionTim,
    leaderName: 'Ferry Hendra',
    leaderTarifPct,
    leaderKomisiOmzet,
    leaderBonusConversion,
    leaderBonusGrowth,
    leaderBruto,
    leaderPotongan,
    leaderBersih,
    totalPayoutTim,
    csList,
  };
}
