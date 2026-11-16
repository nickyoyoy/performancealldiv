/**
 * Calculation rules matching Scentplus Brief Versi 5 (13 November 2026)
 */

// --- LIVE HOST CALCULATIONS ---

export function getHostTierMultiplier(capaianPct: number): number {
  if (capaianPct < 0.5) return 0.0;
  if (capaianPct < 0.8) return 0.5;
  if (capaianPct < 1.0) return 0.8;
  return 1.0;
}

export function getDivisionFactor(capaianDivisiPct: number): number {
  return capaianDivisiPct < 1.0 ? 0.8 : 1.0;
}

export function getAttendanceBonusRate(kehadiranPct: number): number {
  if (kehadiranPct < 0.8) return 0.0;
  if (kehadiranPct < 0.9) return 0.001; // 0.10%
  if (kehadiranPct < 1.0) return 0.0015; // 0.15%
  return 0.002; // 0.20%
}

export function calculateLiveHostCommission(
  dasarOrganik: number,
  capaianHostPct: number,
  capaianDivisiPct: number,
  kehadiranPct: number
) {
  const pengaliHost = getHostTierMultiplier(capaianHostPct);
  const faktorDivisi = getDivisionFactor(capaianDivisiPct);
  const tarifKehadiran = getAttendanceBonusRate(kehadiranPct);

  // Komisi utama = dasar * 1.3% * pengaliHost * faktorDivisi (dibulatkan ke bawah)
  const komisiUtama = Math.floor(dasarOrganik * 0.013 * pengaliHost * faktorDivisi);
  // Bonus kehadiran = dasar * tarifKehadiran (dibulatkan ke bawah)
  const bonusKehadiran = Math.floor(dasarOrganik * tarifKehadiran);
  const totalKomisi = komisiUtama + bonusKehadiran;

  return {
    pengaliHost,
    faktorDivisi,
    tarifKehadiran,
    komisiUtama,
    bonusKehadiran,
    totalKomisi,
  };
}

// --- CUSTOMER HAPPINESS CALCULATIONS ---

export function calculateIndicatorScore(realisasi: number, target: number, bobotPct: number): number {
  if (!target || target <= 0) return 0;
  const ratio = realisasi / target;
  // Capped at 120% (1.20)
  const cappedRatio = Math.min(ratio, 1.2);
  // Returns weighted points: e.g. 1.10 * 30 = 33 points
  return Math.round(cappedRatio * bobotPct * 10) / 10;
}

// --- CRM CS CALCULATIONS ---

export function getCsOmzetRate(omzet: number, syaratLolos: boolean): number {
  if (!syaratLolos) return 0.0;
  if (omzet < 15_000_000) return 0.0;
  if (omzet < 40_000_000) return 0.01;
  if (omzet < 65_000_000) return 0.015;
  if (omzet < 100_000_000) return 0.02;
  return 0.025;
}

export function getConversionMultiplier(convRate: number): number {
  if (convRate < 0.08) return 0;
  if (convRate < 0.1) return 15;
  if (convRate < 0.12) return 20;
  if (convRate < 0.15) return 25;
  if (convRate < 0.18) return 30;
  return 35;
}

export function getLeaderOmzetRate(capaianTimPct: number): number {
  if (capaianTimPct < 0.65) return 0.0;
  if (capaianTimPct < 0.75) return 0.005;
  if (capaianTimPct < 0.85) return 0.0075;
  if (capaianTimPct < 0.95) return 0.01;
  return 0.015;
}

