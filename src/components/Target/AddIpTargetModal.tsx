/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Network,
  Server,
  Check,
  Globe,
  Radio,
  Sliders,
  AlertCircle,
  Clock,
  Trash2,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  useAppConfig,
  isIpAddress,
  getIpClassification,
  getRecentTargets,
  addRecentTarget,
  extractHostname,
} from '../../services/appConfig';

interface AddIpTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTargetApplied?: (url: string) => void;
}

export const AddIpTargetModal: React.FC<AddIpTargetModalProps> = ({
  isOpen,
  onClose,
  onTargetApplied,
}) => {
  const [appConfig, updateConfig] = useAppConfig();

  const [protocol, setProtocol] = useState<'http' | 'https'>('http');
  const [ipAddress, setIpAddress] = useState<string>('192.168.1.100');
  const [port, setPort] = useState<string>('8080');
  const [apiPath, setApiPath] = useState<string>('/api/v1');
  const [environmentLabel, setEnvironmentLabel] = useState<string>('LAN Testing Server');
  const [recentList, setRecentList] = useState<string[]>(() => getRecentTargets());
  const [appliedFeedback, setAppliedFeedback] = useState(false);

  if (!isOpen) return null;

  // Validation
  const trimmedIp = ipAddress.trim();
  const isValidIpv4 =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
      trimmedIp
    ) || trimmedIp === '127.0.0.1' || trimmedIp === 'localhost';
  const isValidIpv6 = trimmedIp.includes(':') && trimmedIp.length >= 3;
  const isIpValid = isValidIpv4 || isValidIpv6;

  const portNum = parseInt(port, 10);
  const isPortValid = !port || (portNum >= 1 && portNum <= 65535);

  const formattedPort = port && port !== '80' && port !== '443' ? `:${port}` : port === '80' && protocol === 'https' ? ':80' : port === '443' && protocol === 'http' ? ':443' : '';
  const cleanPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  const computedTargetUrl = `${protocol}://${trimmedIp}${formattedPort}${cleanPath}`;
  const ipClassification = getIpClassification(trimmedIp);

  const COMMON_PORTS = [
    { port: '3000', label: 'Dev Server (3000)' },
    { port: '8080', label: 'App Server (8080)' },
    { port: '8000', label: 'API Backend (8000)' },
    { port: '5000', label: 'Flask / Node (5000)' },
    { port: '80', label: 'HTTP Standard (80)' },
    { port: '443', label: 'HTTPS Secure (443)' },
  ];

  const COMMON_PRESETS = [
    {
      label: 'Localhost Dev Loopback',
      ip: '127.0.0.1',
      port: '3000',
      proto: 'http' as const,
      tag: 'Loopback',
    },
    {
      label: 'LAN Web Server',
      ip: '192.168.1.100',
      port: '8080',
      proto: 'http' as const,
      tag: 'Private LAN',
    },
    {
      label: 'Default Gateway Router',
      ip: '192.168.1.1',
      port: '80',
      proto: 'http' as const,
      tag: 'Gateway',
    },
    {
      label: 'Internal Subnet API',
      ip: '10.0.0.15',
      port: '8000',
      proto: 'http' as const,
      tag: 'Subnet 10.0.0.0/8',
    },
    {
      label: 'Public Staging IP',
      ip: '54.210.12.34',
      port: '443',
      proto: 'https' as const,
      tag: 'Public Cloud',
    },
  ];

  const handleApply = (urlToApply?: string) => {
    const finalUrl = urlToApply || computedTargetUrl;
    updateConfig({
      customAppUrl: finalUrl,
      environment: trimmedIp === '127.0.0.1' || trimmedIp === 'localhost' ? 'local' : 'custom',
      customPort: port,
      targetApiPath: cleanPath,
      notes: `Target IP: ${trimmedIp} (${ipClassification})`,
    });

    const updated = addRecentTarget(finalUrl);
    setRecentList(updated);

    setAppliedFeedback(true);
    if (onTargetApplied) onTargetApplied(finalUrl);

    setTimeout(() => {
      setAppliedFeedback(false);
      onClose();
    }, 800);
  };

  const handleSelectRecent = (url: string) => {
    handleApply(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#090d16] border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#070a10]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Add IP Address Target</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-800/40 font-semibold">
                  IPv4 / IPv6
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Configure a raw IP address for penetration testing, local development, or internal subnet auditing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs font-sans">
          {/* Quick Preset Buttons */}
          <div>
            <label className="text-xs font-mono text-slate-400 block mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Common IP Environment Presets:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {COMMON_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setIpAddress(p.ip);
                    setPort(p.port);
                    setProtocol(p.proto);
                  }}
                  className="p-2.5 rounded-lg border border-slate-800/90 bg-slate-950/60 hover:bg-slate-900 hover:border-cyan-500/40 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-slate-300 font-mono font-semibold group-hover:text-cyan-300">
                    <span>{p.ip}:{p.port}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-sans">
                      {p.tag}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 truncate">{p.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* IP Target Input Form */}
          <div className="border border-slate-800/90 bg-slate-950/70 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Protocol */}
              <div className="sm:col-span-3">
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Protocol</label>
                <div className="flex rounded-lg border border-slate-800 bg-black/60 p-1">
                  <button
                    type="button"
                    onClick={() => setProtocol('http')}
                    className={`flex-1 py-1.5 rounded text-center font-mono font-bold transition-all cursor-pointer ${
                      protocol === 'http'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    HTTP
                  </button>
                  <button
                    type="button"
                    onClick={() => setProtocol('https')}
                    className={`flex-1 py-1.5 rounded text-center font-mono font-bold transition-all cursor-pointer ${
                      protocol === 'https'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    HTTPS
                  </button>
                </div>
              </div>

              {/* IP Address */}
              <div className="sm:col-span-6">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono text-slate-400">
                    IP Address (IPv4 / IPv6)
                  </label>
                  {isIpValid && (
                    <span className="text-[10px] font-mono text-cyan-400">
                      {ipClassification}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value.trim())}
                  placeholder="e.g. 192.168.1.100 or 127.0.0.1"
                  className={`w-full bg-black/70 border rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none transition-colors ${
                    isIpValid
                      ? 'border-slate-800 focus:border-cyan-500'
                      : 'border-red-500/50 text-red-300'
                  }`}
                />
              </div>

              {/* Port */}
              <div className="sm:col-span-3">
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Port</label>
                <input
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value.trim())}
                  placeholder="e.g. 8080"
                  className="w-full bg-black/70 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Port Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-500 font-mono">Common Ports:</span>
              {COMMON_PORTS.map((cp) => (
                <button
                  key={cp.port}
                  type="button"
                  onClick={() => setPort(cp.port)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                    port === cp.port
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  :{cp.port}
                </button>
              ))}
            </div>

            {/* Subpath & Environment Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  API Path / Subdirectory
                </label>
                <input
                  type="text"
                  value={apiPath}
                  onChange={(e) => setApiPath(e.target.value.trim())}
                  placeholder="/api/v1"
                  className="w-full bg-black/70 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Environment Label (Optional)
                </label>
                <input
                  type="text"
                  value={environmentLabel}
                  onChange={(e) => setEnvironmentLabel(e.target.value)}
                  placeholder="e.g. Staging VPC Server"
                  className="w-full bg-black/70 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-sans text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Generated Target Live Preview */}
            <div className="p-3 rounded-lg bg-black/80 border border-slate-800 font-mono text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-hidden">
                <Server className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-slate-500 select-none">Active Target:</span>
                <span className="text-cyan-300 font-bold truncate">{computedTargetUrl}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50 shrink-0">
                {ipClassification}
              </span>
            </div>
          </div>

          {/* Recent Targets History */}
          {recentList.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Recent Targets History:</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Click to switch</span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {recentList.map((target, idx) => {
                  const isCurrent = appConfig.customAppUrl === target;
                  const isIp = isIpAddress(target);
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectRecent(target)}
                      className={`p-2 rounded-lg border font-mono text-xs flex items-center justify-between cursor-pointer transition-all ${
                        isCurrent
                          ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300'
                          : 'border-slate-800/70 bg-slate-950/40 hover:bg-slate-900 text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {isIp ? (
                          <Network className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        ) : (
                          <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                        <span className="truncate">{target}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800 shrink-0 ml-2">
                        {isCurrent ? 'ACTIVE' : isIp ? 'IP' : 'DOMAIN'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#070a10] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-850 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleApply()}
            disabled={!isIpValid || !isPortValid}
            className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {appliedFeedback ? (
              <>
                <Check className="w-4 h-4" />
                <span>Target Applied!</span>
              </>
            ) : (
              <>
                <Network className="w-4 h-4" />
                <span>Set IP as Active Target</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
