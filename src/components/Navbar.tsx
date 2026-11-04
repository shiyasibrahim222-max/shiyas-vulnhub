/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Terminal,
  Lock,
  Activity,
  Globe,
  Download,
} from 'lucide-react';
import { LabSecurityLevel } from '../services/controlledLabServer';

export type AppTab =
  | 'scanner'
  | 'headers'
  | 'auth'
  | 'lab'
  | 'report';

interface NavbarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  securityLevel: LabSecurityLevel;
  onToggleSecurityLevel: () => void;
  onOpenDownloadModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  securityLevel,
  onToggleSecurityLevel,
  onOpenDownloadModal,
}) => {

  const NAV_ITEMS: { id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'scanner', label: 'Vuln Scanner', icon: Activity },
    { id: 'headers', label: 'Headers & TLS', icon: Globe },
    { id: 'auth', label: 'Secure Auth', icon: Lock },
    { id: 'lab', label: 'Controlled Lab', icon: Terminal },
    { id: 'report', label: 'Project Kit', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#070b12]/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-white whitespace-nowrap leading-tight">
              SHIYAS NetLab
            </span>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline leading-none">
              Web Security Platform
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Clean tab bar with overflow scrolling on medium screens) */}
        <nav className="hidden xl:flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800/80">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions (Download App, Domain & Security Mode) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenDownloadModal}
            title="Download SentinelLab Desktop App (Windows, macOS, Linux) or Open in App"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download App</span>
            <span className="sm:hidden">App</span>
          </button>

          <button
            onClick={onToggleSecurityLevel}
            title="Toggle between Vulnerable and Hardened defense mode in the controlled lab"
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              securityLevel === 'VULNERABLE'
                ? 'bg-red-950/40 border-red-500/40 text-red-300 hover:bg-red-950/70'
                : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/70'
            }`}
          >
            {securityLevel === 'VULNERABLE' ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden sm:inline">Lab: </span><span>Vuln</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Lab: </span><span>Hardened</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub-navigation bar for medium and smaller screens */}
      <div className="flex xl:hidden items-center gap-1 mt-2.5 pt-2 border-t border-slate-800/80 overflow-x-auto no-scrollbar pb-1 text-xs">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
