import type { AppRole } from '../services/auth';
import type { ViewKey } from '../components/ViewToolbar';

export const ROLE_LABEL: Record<AppRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  finance: 'Finance',
  live_team: 'Live Team',
};

/** Tab yang boleh dibuka per role. */
export const ROLE_VIEWS: Record<AppRole, ViewKey[]> = {
  owner: ['live', 'komisi', 'skema', 'akun', 'pengguna'],
  admin: ['live', 'komisi', 'skema', 'akun'],
  finance: ['komisi', 'skema', 'akun'],
  live_team: ['live', 'akun'],
};

export function canView(role: AppRole, view: ViewKey): boolean {
  return ROLE_VIEWS[role].includes(view);
}

/** Hanya Owner yang boleh sync / menarik ulang sumber data. */
export function canSyncSources(role: AppRole): boolean {
  return role === 'owner';
}

/** Ekspor CSV rekap komisi: semua role yang bisa melihat Komisi. */
export function canExportCommission(role: AppRole): boolean {
  return canView(role, 'komisi');
}

/** Ubah skema komisi (target, parameter, kehadiran): Owner, Admin, Finance. */
export function canEditSkema(role: AppRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'finance';
}
