import React from 'react';
import { AppTab } from '../types';
import { Mic2, HeartHandshake, Users } from 'lucide-react';

interface NavigationTabsProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  liveHostCount: number;
  happinessScore: number;
  crmCsCount: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onTabChange,
  liveHostCount,
  happinessScore: _happinessScore,
  crmCsCount,
}) => {
  const tabs = [
    {
      id: 'live-host' as AppTab,
      label: 'Live Host',
      icon: Mic2,
      badge: `${liveHostCount}`,
      activeIconColor: 'text-blue-600',
    },
    {
      id: 'customer-happiness' as AppTab,
      label: 'Customer Happiness',
      icon: HeartHandshake,
      badge: '28',
      activeIconColor: 'text-[#127a60]',
    },
    {
      id: 'crm-cs' as AppTab,
      label: 'CRM CS & Leader',
      icon: Users,
      badge: `${crmCsCount}`,
      activeIconColor: 'text-amber-600',
    },
  ];

  return (
    <nav
      aria-label="Navigasi Modul KPI"
      className="bg-white border-b border-slate-200/70 py-2 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-start">
        {/* Compact Segmented Pill Bar */}
        <div
          role="tablist"
          className="inline-flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/70 overflow-x-auto max-w-full no-scrollbar"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isActive ? tab.activeIconColor : 'text-slate-400'
                  }`}
                  aria-hidden="true"
                />
                <span>{tab.label}</span>
                <span
                  className={`text-3xs px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive
                      ? 'bg-[#127a60] text-white'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
