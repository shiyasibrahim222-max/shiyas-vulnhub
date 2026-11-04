/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Radio,
  Check,
  RotateCcw,
  Sliders,
  Shield,
  Zap,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Network,
  Server,
  Plus,
} from 'lucide-react';
import {
  useAppConfig,
  extractHostname,
  extractHostWithPort,
  isIpAddress,
  getIpClassification,
  getLiveReachableUrl,
  addRecentTarget,
} from '../../services/appConfig';
import { AddIpTargetModal } from './AddIpTargetModal';

interface GlobalTargetBarProps {
  onOpenDownloadModal?: () => void;
}

export const GlobalTargetBar: React.FC<GlobalTargetBarProps> = ({
}) => {
  const [appConfig, updateConfig] = useAppConfig();
  const [inputUrl, setInputUrl] = useState(appConfig.customAppUrl);
  const [isEditing, setIsEditing] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const [isIpModalOpen, setIsIpModalOpen] = useState(false);

  useEffect(() => {
    setInputUrl(appConfig.customAppUrl);
  }, [appConfig.customAppUrl]);

  const currentHost = extractHostname(appConfig.customAppUrl);
  const currentHostWithPort = extractHostWithPort(appConfig.customAppUrl);
  const isHttps = appConfig.customAppUrl.startsWith('https://');
  const isCurrentTargetIp = isIpAddress(appConfig.customAppUrl);
  const classification = getIpClassification(appConfig.customAppUrl);

  const handleApply = (urlToSet?: string) => {
    let clean = (urlToSet !== undefined ? urlToSet : inputUrl).trim();
    if (!clean) clean = 'https://sentinellab.shiyas.io';
    if (!/^https?:\/\//i.test(clean)) {
      const isIp = isIpAddress(clean.split('/')[0]);
      if (isIp && !clean.includes(':443') && !clean.includes(':8443')) {
        clean = `http://${clean}`;
      } else {
        clean = `https://${clean}`;
      }
    }
    updateConfig({ customAppUrl: clean });
    addRecentTarget(clean);
    setIsEditing(false);
    setShowSavedFeedback(true);
    setTimeout(() => setShowSavedFeedback(false), 2200);
  };

  const PRESETS = [
    { label: 'shiyasvulnerabilities.com', url: 'https://shiyasvulnerabilities.com', type: 'domain', tag: 'Production Domain' },
    { label: 'sentinellab.shiyas.io', url: 'https://sentinellab.shiyas.io', type: 'domain', tag: 'Custom Domain' },
    { label: '127.0.0.1:3000', url: 'http://127.0.0.1:3000', type: 'ip', tag: 'Localhost IP' },
    { label: '192.168.1.1:80', url: 'http://192.168.1.1:80', type: 'ip', tag: 'LAN Router' },
    { label: '192.168.1.100:8080', url: 'http://192.168.1.100:8080', type: 'ip', tag: 'LAN Server' },
  ];

  return (
    <>
      <div className="bg-[#0a0f19] border-b border-slate-800/80 px-4 sm:px-6 py-2.5 shadow-sm text-xs no-print">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          {/* Left: Active Target Indicator & Classification */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-slate-400 font-medium">Target:</span>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono font-semibold shadow-inner transition-all ${
                  isCurrentTargetIp
                    ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
                    : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                }`}
              >
                {isCurrentTargetIp ? (
                  <Network className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                <span className="truncate max-w-[200px] sm:max-w-[320px] text-white">
                  {appConfig.customAppUrl}
                </span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-sans font-bold uppercase tracking-wider ${
                    isHttps
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-cyan-500/20 text-cyan-300'
                  }`}
                >
                  {isHttps ? 'HTTPS' : 'HTTP'}
                </span>
                <span className="text-[10px] text-slate-400 font-sans hidden sm:inline">
                  ({classification})
                </span>
              </div>
            </div>

            {/* Quick 1-Click Target Switchers */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[11px] text-slate-400 hidden xl:inline">Presets:</span>
              {PRESETS.map((p, idx) => {
                const isActive = appConfig.customAppUrl === p.url;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApply(p.url)}
                    className={`px-2 py-1 rounded text-[11px] font-mono transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                      isActive
                        ? p.type === 'ip'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                        : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:bg-slate-800'
                    }`}
                    title={`Switch target to ${p.url}`}
                  >
                    {p.type === 'ip' ? (
                      <Network className="w-3 h-3 text-cyan-400/80" />
                    ) : (
                      <Globe className="w-3 h-3 text-emerald-400/80" />
                    )}
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Add IP Button & Target Change */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end shrink-0">
            {showSavedFeedback && (
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono animate-in fade-in">
                <Check className="w-3 h-3" />
                <span>Target updated globally!</span>
              </span>
            )}

            {/* Dedicated Add IP Address Button */}
            <button
              type="button"
              onClick={() => setIsIpModalOpen(true)}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-500/50 text-cyan-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Add IPv4 or IPv6 address target with custom port"
            >
              <Network className="w-3.5 h-3.5 text-cyan-400" />
              <span>+ Add IP Address</span>
            </button>

            {isEditing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleApply();
                }}
                className="flex items-center gap-1.5 w-full sm:w-auto"
              >
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="e.g. 192.168.1.100:8080 or domain.com"
                  autoFocus
                  className="bg-slate-900 border border-emerald-500/60 rounded px-2.5 py-1 text-xs font-mono text-emerald-300 focus:outline-none w-52 sm:w-64"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-xs cursor-pointer shadow-sm"
                >
                  Set
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 transition-colors cursor-pointer"
                >
                  Edit Target
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add IP Address Modal */}
      <AddIpTargetModal
        isOpen={isIpModalOpen}
        onClose={() => setIsIpModalOpen(false)}
        onTargetApplied={(url) => setInputUrl(url)}
      />
    </>
  );
};
