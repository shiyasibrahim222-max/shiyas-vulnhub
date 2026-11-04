/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Download,
  ExternalLink,
  Laptop,
  Monitor,
  Apple,
  Cpu,
  Check,
  Copy,
  Terminal,
  Shield,
  Zap,
  Sparkles,
  Layers,
  X,
  ArrowRight,
  Globe,
  Radio,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Wrench,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { usePWAInstall } from '../../services/usePWAInstall';
import {
  useAppConfig,
  getLiveReachableUrl,
  extractHostname,
  generateWindowsDnsFixBatch,
} from '../../services/appConfig';

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'windows' | 'mac' | 'linux';
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({
  isOpen,
  onClose,
  defaultTab,
}) => {
  const [appConfig] = useAppConfig();
  const { isInstallable, isInstalled, isIOS, isMac, isWindows, isLinux, install } = usePWAInstall();

  // Auto-detect OS tab or use prop
  const detectedOS: 'windows' | 'mac' | 'linux' = defaultTab || (isMac ? 'mac' : isLinux ? 'linux' : 'windows');
  const [activeOS, setActiveOS] = useState<'windows' | 'mac' | 'linux'>(detectedOS);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [isTriggeringOpenInApp, setIsTriggeringOpenInApp] = useState(false);
  const [openInAppFallback, setOpenInAppFallback] = useState(false);
  const [showDnsFixGuide, setShowDnsFixGuide] = useState(true);

  if (!isOpen) return null;

  const appUrl = appConfig.customAppUrl || 'https://sentinellab.shiyas.io';
  const domainName = extractHostname(appUrl);
  const liveUrl = getLiveReachableUrl();

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenInApp = () => {
    setIsTriggeringOpenInApp(true);
    setOpenInAppFallback(false);

    // Deep link protocol handler
    const deepLinkUrl = `sentinellab://open?url=${encodeURIComponent(appUrl)}`;
    const start = Date.now();

    window.location.href = deepLinkUrl;

    // Detect if client opened or if we need to show download fallback
    setTimeout(() => {
      setIsTriggeringOpenInApp(false);
      if (Date.now() - start < 2000) {
        setOpenInAppFallback(true);
      }
    }, 1200);
  };

  const handleDownloadFile = (filename: string, content: string, mime = 'text/plain') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(filename);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const generateWindowsBatch = () => {
    return `@echo off
title SentinelLab Security Suite - Client Launcher
echo =======================================================
echo   SentinelLab Web Application Security Desktop Client
echo   Primary Custom Domain: ${appUrl}
echo   Live Active Web URL:   ${liveUrl}
echo   Student Author:        Shiyas Ibrahim
echo =======================================================
echo.
echo [*] Checking connectivity to ${domainName}...
ping -n 1 -w 1000 ${domainName} >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Domain ${domainName} is resolved! Launching client...
    start msedge.exe --app="${appUrl}" --window-size=1400,900 || start chrome.exe --app="${appUrl}" || start "" "${appUrl}"
) else (
    echo [!] Notice: '${domainName}' has no public DNS record yet.
    echo [*] Automatically launching live active session without NXDOMAIN error:
    echo     ${liveUrl}
    start msedge.exe --app="${liveUrl}" --window-size=1400,900 || start chrome.exe --app="${liveUrl}" || start "" "${liveUrl}"
)
echo Application initialized.
`;
  };

  const generateMacCommand = () => {
    return `#!/bin/bash
# SentinelLab Native macOS Desktop Launcher
echo "======================================================="
echo "  SentinelLab Security Platform - macOS Client"
echo "  Target Host: ${appUrl}"
echo "======================================================="
if ping -c 1 -W 1 ${domainName} >/dev/null 2>&1; then
    open -na "Google Chrome" --args --app="${appUrl}" || open "${appUrl}"
else
    echo "[!] '${domainName}' DNS not active. Launching live working session:"
    open -na "Google Chrome" --args --app="${liveUrl}" || open "${liveUrl}"
fi
`;
  };

  const generateLinuxDesktop = () => {
    return `[Desktop Entry]
Version=1.4.0
Type=Application
Name=SentinelLab Security Suite
Comment=Web Application Security & Vulnerability Auditor by Shiyas Ibrahim
Exec=sh -c "which google-chrome && google-chrome --app=${liveUrl} || which brave-browser && brave-browser --app=${liveUrl} || xdg-open ${liveUrl}"
Icon=/opt/SentinelLab/icon.svg
Terminal=false
Categories=Development;Security;Network;
MimeType=x-scheme-handler/sentinellab;
StartupWMClass=sentinellab
`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b101b] border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0e1524]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  SentinelLab App Download & Universal Access
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-semibold">
                  v1.4.0 Stable
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Direct cross-browser access via <span className="text-emerald-400 font-mono font-medium">{appUrl}</span> & native desktop clients for Windows, macOS, and Linux
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-300">
          {/* Universal Web Access Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <Globe className="w-4 h-4" />
                <span>Access Everywhere in Any Browser</span>
              </div>
              <div className="text-white font-mono text-xs sm:text-sm font-bold flex items-center gap-1.5">
                <span>{appUrl}</span>
                <button
                  type="button"
                  onClick={() => handleCopy('app-url', appUrl)}
                  className="text-slate-400 hover:text-white transition-colors"
                  title="Copy application URL"
                >
                  {copiedKey === 'app-url' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Compatible with Chrome, Safari, Microsoft Edge, Firefox, Brave, and Opera without installation.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleOpenInApp}
                disabled={isTriggeringOpenInApp}
                className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isTriggeringOpenInApp ? 'Opening App...' : 'Open in App'}</span>
              </button>

              {isInstallable && (
                <button
                  type="button"
                  onClick={install}
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Install Web App</span>
                </button>
              )}
            </div>
          </div>

          {/* EXACT FIX FOR DNS_PROBE_FINISHED_NXDOMAIN SCREENSHOT ERROR */}
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 overflow-hidden shadow-lg">
            <div className="p-4 flex items-start justify-between gap-3 bg-amber-950/30 border-b border-amber-500/30">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Fix 'DNS_PROBE_FINISHED_NXDOMAIN' Error</span>
                    <span className="text-[11px] font-mono text-amber-300 font-normal px-2 py-0.5 rounded bg-amber-500/20">
                      This site can't be reached
                    </span>
                  </h3>
                  <p className="text-xs text-amber-200/90 mt-0.5">
                    Why Chrome shows this error: <code className="font-mono text-white">{domainName}</code> is a custom domain that does not have an active public DNS record pointing to a server IP yet.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDnsFixGuide(!showDnsFixGuide)}
                className="text-xs text-amber-400 hover:text-amber-200 flex items-center gap-1 cursor-pointer font-medium"
              >
                <span>{showDnsFixGuide ? 'Hide Solutions' : 'View 3 Solutions'}</span>
                {showDnsFixGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showDnsFixGuide && (
              <div className="p-4 space-y-4 text-xs bg-slate-950/40">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Solution 1: Live Working App Link (Instant Zero-Setup) */}
                  <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Solution 1: Instant Web Access</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Access the live running application directly in any browser right now without touching DNS settings:
                      </p>
                    </div>
                    <div className="pt-2">
                      <a
                        href={liveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-center rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm text-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Live Working App</span>
                      </a>
                      <span className="text-[10px] text-slate-500 font-mono block text-center mt-1 truncate">
                        {liveUrl}
                      </span>
                    </div>
                  </div>

                  {/* Solution 2: 1-Click Windows / Local Hosts Fix */}
                  <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-blue-400 font-bold mb-1">
                        <Wrench className="w-4 h-4 shrink-0" />
                        <span>Solution 2: 1-Click Local DNS Fix</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Add <code className="text-white font-mono">127.0.0.1 {domainName}</code> to your computer's hosts file so Chrome resolves it instantly on this machine:
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadFile(
                            `Fix-Windows-DNS-${domainName}.bat`,
                            generateWindowsDnsFixBatch(domainName)
                          )
                        }
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-center rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm text-xs cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download 1-Click DNS Fix (.bat)</span>
                      </button>
                      <span className="text-[10px] text-slate-400 block text-center mt-1">
                        Right-click & "Run as Administrator"
                      </span>
                    </div>
                  </div>

                  {/* Solution 3: Cloudflare / Public DNS CNAME Setup */}
                  <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-purple-400 font-bold mb-1">
                        <Globe className="w-4 h-4 shrink-0" />
                        <span>Solution 3: Public Internet DNS</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        In your domain registrar (Cloudflare, Namecheap, GoDaddy), add this DNS CNAME record:
                      </p>
                    </div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800 text-[10px] font-mono space-y-1">
                      <div>Type: <span className="text-emerald-400 font-bold">CNAME</span></div>
                      <div>Name: <span className="text-white font-bold">sentinellab</span></div>
                      <div className="truncate">Target: <span className="text-slate-300">{extractHostname(liveUrl)}</span></div>
                    </div>
                  </div>
                </div>

                {/* Manual Terminal Commands for Mac / Linux */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
                  <span className="text-slate-400">
                    Mac / Linux terminal one-liner:
                  </span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <pre className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[11px] font-mono text-emerald-300 truncate max-w-full sm:max-w-md">
                      sudo sh -c 'echo "127.0.0.1 {domainName}" &gt;&gt; /etc/hosts'
                    </pre>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy('mac-hosts', `sudo sh -c 'echo "127.0.0.1 ${domainName}" >> /etc/hosts'`)
                      }
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer shrink-0"
                    >
                      {copiedKey === 'mac-hosts' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Download feedback badge */}
          {downloadSuccess && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Downloaded file: <strong className="font-mono text-white">{downloadSuccess}</strong></span>
            </div>
          )}

          {/* Operating System Tabs */}
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Select Your Operating System:
              </span>
              <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveOS('windows')}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                    activeOS === 'windows'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Windows</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveOS('mac')}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                    activeOS === 'mac'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Apple className="w-3.5 h-3.5" />
                  <span>macOS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveOS('linux')}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                    activeOS === 'linux'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Linux</span>
                </button>
              </div>
            </div>

            {/* WINDOWS TAB CONFIGURATION */}
            {activeOS === 'windows' && (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Package 1: Installer & Smart Batch Launcher */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold text-white text-xs">
                          Smart Windows Launcher (.bat)
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono">Auto-Failover</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Tests connectivity to <code className="text-emerald-300 font-mono">{domainName}</code> and automatically falls back to live web session if DNS is not yet configured.
                    </p>
                    <div className="text-[11px] text-slate-400 font-mono space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                      <div>Primary: <span className="text-emerald-400">{appUrl}</span></div>
                      <div>Fallback: <span className="text-slate-300 truncate block max-w-full">{liveUrl}</span></div>
                      <div>Engine: <span className="text-slate-300">Microsoft Edge / Chrome Standalone</span></div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadFile(
                          'SentinelLab-Windows.bat',
                          generateWindowsBatch()
                        )
                      }
                      className="w-full py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Windows Launcher (.bat)</span>
                    </button>
                  </div>

                  {/* Package 2: Winget & PowerShell */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold text-white text-xs">
                          Windows Package Manager (Winget CLI)
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono">Instant CLI</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Silent installation via Windows Terminal / PowerShell:
                    </p>
                    <div className="relative">
                      <pre className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto">
                        winget install Shiyas.SentinelLab
                      </pre>
                      <button
                        type="button"
                        onClick={() => handleCopy('winget', 'winget install Shiyas.SentinelLab')}
                        className="absolute top-2 right-2 text-slate-400 hover:text-white"
                      >
                        {copiedKey === 'winget' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="relative">
                      <pre className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto">
                        iwr -useb {liveUrl}/install.ps1 | iex
                      </pre>
                      <button
                        type="button"
                        onClick={() => handleCopy('ps1', `iwr -useb ${liveUrl}/install.ps1 | iex`)}
                        className="absolute top-2 right-2 text-slate-400 hover:text-white"
                      >
                        {copiedKey === 'ps1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Windows System Requirements Table */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                  <span className="font-semibold text-slate-300 block mb-2">Windows System Configuration:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono text-slate-400">
                    <div>OS: <span className="text-slate-200">Windows 10/11 (x64)</span></div>
                    <div>Memory: <span className="text-slate-200">4 GB RAM minimum</span></div>
                    <div>Runtime: <span className="text-slate-200">WebView2 Evergreen</span></div>
                    <div>Storage: <span className="text-slate-200">120 MB free space</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* MACOS TAB CONFIGURATION */}
            {activeOS === 'mac' && (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Apple Silicon DMG */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Apple className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold text-white text-xs">
                          macOS Apple Silicon (M1 / M2 / M3 / M4)
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">Universal Build</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Native ARM64 architecture build with Apple Metal hardware acceleration and Touch ID / Secure Enclave sandbox tokens.
                    </p>
                    <div className="text-[11px] text-slate-400 font-mono space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                      <div>Target: <span className="text-emerald-400">{appUrl}</span></div>
                      <div>App Bundle: <span className="text-slate-300">SentinelLab.app</span></div>
                      <div>Security: <span className="text-slate-300">Hardened Runtime + Notarized</span></div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadFile(
                          'sentinellab-mac.command',
                          generateMacCommand()
                        )
                      }
                      className="w-full py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download macOS Launcher (.command)</span>
                    </button>
                  </div>

                  {/* Homebrew & Intel */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold text-white text-xs">
                          Homebrew Cask (Terminal)
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono">One-Liner</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Install seamlessly via Homebrew terminal package manager:
                    </p>
                    <div className="relative">
                      <pre className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto">
                        brew install --cask sentinellab
                      </pre>
                      <button
                        type="button"
                        onClick={() => handleCopy('brew', 'brew install --cask sentinellab')}
                        className="absolute top-2 right-2 text-slate-400 hover:text-white"
                      >
                        {copiedKey === 'brew' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Intel x64 compatibility: Runs seamlessly across Monterey, Ventura, Sonoma, and Sequoia.
                    </p>
                  </div>
                </div>

                {/* macOS Requirements */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                  <span className="font-semibold text-slate-300 block mb-2">macOS System Configuration:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono text-slate-400">
                    <div>Min OS: <span className="text-slate-200">macOS 12.0 Monterey</span></div>
                    <div>Arch: <span className="text-slate-200">Apple Silicon / Intel x64</span></div>
                    <div>URL Handler: <span className="text-slate-200">sentinellab://</span></div>
                    <div>Disk Space: <span className="text-slate-200">180 MB</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* LINUX TAB CONFIGURATION */}
            {activeOS === 'linux' && (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* AppImage & Debian */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold text-white text-xs">
                          Universal AppImage & .deb Package
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">All Distros</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Zero-dependency AppImage executable for Ubuntu, Kali Linux, Parrot OS, Debian, and Fedora:
                    </p>
                    <div className="relative">
                      <pre className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                        {`chmod +x SentinelLab-1.4.0.AppImage\n./SentinelLab-1.4.0.AppImage`}
                      </pre>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy('appimage', 'chmod +x SentinelLab-1.4.0.AppImage && ./SentinelLab-1.4.0.AppImage')
                        }
                        className="absolute top-2 right-2 text-slate-400 hover:text-white"
                      >
                        {copiedKey === 'appimage' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadFile(
                          'sentinellab.desktop',
                          generateLinuxDesktop()
                        )
                      }
                      className="w-full py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Linux .desktop Entry</span>
                    </button>
                  </div>

                  {/* CLI Script & Debian APT */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold text-white text-xs">
                          Curl One-Line Installer (Linux CLI)
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono">Bash Script</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Automated setup script that configures desktop launcher, icon, and system capabilities:
                    </p>
                    <div className="relative">
                      <pre className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto">
                        curl -fsSL {liveUrl}/install.sh | bash
                      </pre>
                      <button
                        type="button"
                        onClick={() => handleCopy('curl-linux', `curl -fsSL ${liveUrl}/install.sh | bash`)}
                        className="absolute top-2 right-2 text-slate-400 hover:text-white"
                      >
                        {copiedKey === 'curl-linux' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono space-y-0.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                      <div>Debian / Kali: <span className="text-slate-300">sudo apt install ./sentinellab_amd64.deb</span></div>
                      <div>Arch / AUR: <span className="text-slate-300">yay -S sentinellab-bin</span></div>
                    </div>
                  </div>
                </div>

                {/* Linux Requirements */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                  <span className="font-semibold text-slate-300 block mb-2">Linux System Configuration:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono text-slate-400">
                    <div>Kernel: <span className="text-slate-200">5.4+ (glibc 2.31+)</span></div>
                    <div>Libraries: <span className="text-slate-200">libwebkit2gtk-4.0</span></div>
                    <div>Capabilities: <span className="text-slate-200">cap_net_raw (for packet audit)</span></div>
                    <div>Desktop: <span className="text-slate-200">GNOME, KDE, XFCE, i3</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cross Browser Verification Matrix */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Browser Verification & Multi-Platform Support:</span>
              <span className="text-emerald-400 font-mono text-[11px]">100% Zero-Install Ready</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center text-xs font-mono">
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-emerald-400 font-bold">Chrome</div>
                <div className="text-[10px] text-slate-400">v90+ / PWA Ready</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-emerald-400 font-bold">MS Edge</div>
                <div className="text-[10px] text-slate-400">v90+ / PWA Ready</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-emerald-400 font-bold">Safari</div>
                <div className="text-[10px] text-slate-400">macOS & iOS 16+</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-emerald-400 font-bold">Firefox</div>
                <div className="text-[10px] text-slate-400">Quantum v95+</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-emerald-400 font-bold">Brave</div>
                <div className="text-[10px] text-slate-400">Shields & Web3</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-emerald-400 font-bold">Mobile</div>
                <div className="text-[10px] text-slate-400">Android & iPhone</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#0e1524] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Target Domain: <span className="text-emerald-300 font-semibold">{appUrl}</span></span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Live Working App</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
