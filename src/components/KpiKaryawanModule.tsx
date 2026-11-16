import React from 'react';
import { ScorecardMetric } from '../types';
import {
  Award,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
} from 'lucide-react';

interface KpiKaryawanModuleProps {
  scorecards: ScorecardMetric[];
}

export const KpiKaryawanModule: React.FC<KpiKaryawanModuleProps> = ({
  scorecards,
}) => {
  const grouped = scorecards.reduce<Record<string, ScorecardMetric[]>>((acc, m) => {
    if (!acc[m.karyawanName]) acc[m.karyawanName] = [];
    acc[m.karyawanName].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header Banner (OpsFlow Clean Header Card) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Scorecard KPI Karyawan
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Evaluasi berbasis bobot kerja: target maksimal vs batas minimal (batas skor 120 poin).
            </p>
          </div>
        </div>
      </div>

      {/* Cards per Karyawan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(grouped).map(([name, metrics], cardIdx) => {
          const totalBobot = metrics.reduce((a, b) => a + b.bobotPct, 0);
          const totalScore =
            Math.round(
              metrics.reduce((a, b) => a + (b.skor * b.bobotPct) / 100, 0) * 10
            ) / 10;
          const role = metrics[0]?.role || 'Team Member';
          const scorePct = Math.min(100, Math.round((totalScore / 120) * 100));

          const avatarStyle =
            cardIdx % 2 === 0
              ? 'bg-emerald-50 text-[#127a60] border-emerald-100'
              : 'bg-blue-50 text-blue-600 border-blue-100';

          return (
            <div
              key={name}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-2xl border flex items-center justify-center font-bold text-sm shrink-0 ${avatarStyle}`}
                      aria-hidden="true"
                    >
                      {name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{name}</h3>
                      <p className="text-xs text-slate-500">{role}</p>
                    </div>
                  </div>

                  {/* OpsFlow Mini Donut Ring + Total Score */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-2xs uppercase tracking-wider text-slate-500 font-semibold block">
                        Total Skor Akhir
                      </span>
                      <span className="text-xl font-bold text-[#127a60] font-mono tabular-nums">
                        {totalScore}{' '}
                        <span className="text-xs font-normal text-slate-500">/ 120</span>
                      </span>
                    </div>
                    <div className="relative w-12 h-12 shrink-0 hidden sm:flex items-center justify-center">
                      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                        <circle
                          cx="18"
                          cy="18"
                          r="15.5"
                          fill="transparent"
                          stroke="#F1F5F9"
                          strokeWidth="3.5"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.5"
                          fill="transparent"
                          stroke="#127a60"
                          strokeWidth="3.5"
                          strokeDasharray={`${scorePct} ${100 - scorePct}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-2xs font-bold text-slate-800 tabular-nums">
                        {scorePct}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metrics List */}
                <div className="space-y-3">
                  {metrics.map((m) => {
                    const itemPct = Math.min(100, Math.round((m.skor / 120) * 100));
                    return (
                      <div
                        key={m.id}
                        className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 flex flex-col gap-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">
                                {m.indicator}
                              </span>
                              <span className="text-2xs px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 font-semibold inline-flex items-center gap-1">
                                {m.direction === 'higher' ? (
                                  <>
                                    <ArrowUpRight
                                      className="w-3 h-3 text-emerald-600"
                                      aria-hidden="true"
                                    />
                                    Higher is better
                                  </>
                                ) : (
                                  <>
                                    <ArrowDownRight
                                      className="w-3 h-3 text-blue-600"
                                      aria-hidden="true"
                                    />
                                    Lower is better
                                  </>
                                )}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 tabular-nums">
                              Target: {m.target} · Realisasi: <b className="text-slate-900">{m.realisasi}</b> · Bobot: {m.bobotPct}%
                            </p>
                          </div>

                          <div className="text-right tabular-nums shrink-0">
                            <span className="font-bold text-sm text-slate-900">
                              {m.skor}
                            </span>
                            <span className="text-2xs text-slate-500 block">
                              Poin: {m.skorBobot}
                            </span>
                          </div>
                        </div>

                        {/* In-card Progress Bar */}
                        <div className="h-1.5 w-full bg-slate-200/70 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              m.skor >= 100 ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${itemPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="tabular-nums font-medium">Total Bobot: {totalBobot}%</span>
                <span className="text-[#127a60] font-semibold inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#127a60]" aria-hidden="true" />
                  Realisasi Lengkap &amp; Tervalidasi
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
