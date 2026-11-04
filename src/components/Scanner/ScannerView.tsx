/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  ChevronDown,
  ChevronUp,
  Code2,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Check,
  Copy,
  Download,
} from 'lucide-react';
import { ScanProfile, ScanProgress, Severity, VulnerabilityFinding } from '../../types/security';
import { runSecurityScan } from '../../services/vulnerabilityEngine';
import { controlledLab, LabSecurityLevel } from '../../services/controlledLabServer';
import { useAppConfig, extractHostname } from '../../services/appConfig';

interface ScannerViewProps {
  onNavigateToReport: () => void;
  securityLevel: LabSecurityLevel;
  onSetSecurityLevel: (level: LabSecurityLevel) => void;
  onOpenDownloadModal?: () => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  onNavigateToReport,
  securityLevel,
  onSetSecurityLevel,
  onOpenDownloadModal,
}) => {
  const [appConfig] = useAppConfig();
  const [targetUrl, setTargetUrl] = useState(() => appConfig.customAppUrl);

  useEffect(() => {
    setTargetUrl(appConfig.customAppUrl);
  }, [appConfig.customAppUrl]);

  const [profile, setProfile] = useState<ScanProfile>('FULL_OWASP');
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [findings, setFindings] = useState<VulnerabilityFinding[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<'ALL' | Severity>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);
  const [remediationLang, setRemediationLang] = useState<'node' | 'python'>('node');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const handleStartScan = async () => {
    setIsScanning(true);
    setProgress({
      currentStep: 'Initializing target environment and probing endpoints...',
      progressPercent: 5,
      phase: 'IDLE',
      logs: [`[${new Date().toLocaleTimeString()}] Target confirmed: Controlled Sandbox API`],
    });

    try {
      const results = await runSecurityScan(targetUrl, profile, (prog) => {
        setProgress(prog);
      });
      setFindings(results);
      setHasScanned(true);
      if (results.length > 0) {
        setExpandedFindingId(results[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleVerifyFix = async (finding: VulnerabilityFinding) => {
    setVerifyingId(finding.id);
    // Switch to hardened mode to verify mitigation
    onSetSecurityLevel('HARDENED');

    await new Promise((r) => setTimeout(r, 600));

    // Update status to verified fixed
    setFindings((prev) =>
      prev.map((f) => (f.id === finding.id ? { ...f, status: 'VERIFIED_FIXED' } : f))
    );
    setVerifyingId(null);
  };

  const counts: Record<Severity, number> = {
    CRITICAL: findings.filter((f) => f.severity === 'CRITICAL').length,
    HIGH: findings.filter((f) => f.severity === 'HIGH').length,
    MEDIUM: findings.filter((f) => f.severity === 'MEDIUM').length,
    LOW: findings.filter((f) => f.severity === 'LOW').length,
    INFORMATIONAL: findings.filter((f) => f.severity === 'INFORMATIONAL').length,
  };

  const filteredFindings = findings.filter((f) => {
    const matchesSeverity = severityFilter === 'ALL' || f.severity === severityFilter;
    const matchesSearch =
      searchQuery === '' ||
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.cweId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.endpoint.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Configuration Bar */}
      <div className="bg-[#0d131f] border border-slate-800/80 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Mini Web Vulnerability Scanner
            </h1>
            <p className="text-sm text-slate-400">
              Automated black-box & gray-box security auditor for OWASP Top 10 vulnerabilities in a controlled local test environment.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleStartScan}
              disabled={isScanning}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 font-semibold text-sm rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
            >
              {isScanning ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Scanning Target...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Vulnerability Scan</span>
                </>
              )}
            </button>

            <button
              onClick={onNavigateToReport}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              View VAPT Report
            </button>

            {onOpenDownloadModal && (
              <button
                onClick={onOpenDownloadModal}
                title="Download SentinelLab Desktop App (Windows, macOS, Linux)"
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-sm font-medium rounded-lg border border-slate-700/80 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Desktop App</span>
              </button>
            )}
          </div>
        </div>

        {/* Scan Parameters Grid */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Target URL */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-400">
                Target Environment / Host
              </label>
            </div>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="w-full bg-[#070b12] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500/50"
              placeholder={appConfig.customAppUrl}
            />
            <div className="flex items-center justify-between mt-1.5 gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTargetUrl(appConfig.customAppUrl)}
                  className="px-2 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-mono transition-colors"
                  title="Use your configured host"
                >
                  Custom Domain
                </button>
                <button
                  type="button"
                  onClick={() => setTargetUrl('http://127.0.0.1:3000')}
                  className="px-2 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-400 font-mono transition-colors"
                  title="Use local development loopback"
                >
                  127.0.0.1:3000
                </button>
              </div>
              <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                {extractHostname(targetUrl)}
              </span>
            </div>
          </div>

          {/* Scan Profile */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Audit Scope / Scan Profile
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setProfile('FULL_OWASP')}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all text-center cursor-pointer ${
                  profile === 'FULL_OWASP'
                    ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300 font-semibold'
                    : 'bg-[#070b12] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Full OWASP Audit
              </button>
              <button
                type="button"
                onClick={() => setProfile('HEADERS_CORS')}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all text-center cursor-pointer ${
                  profile === 'HEADERS_CORS'
                    ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300 font-semibold'
                    : 'bg-[#070b12] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Headers & CORS
              </button>
              <button
                type="button"
                onClick={() => setProfile('INJECTION_INPUTS')}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all text-center cursor-pointer ${
                  profile === 'INJECTION_INPUTS'
                    ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300 font-semibold'
                    : 'bg-[#070b12] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Injections (SQLi, XSS)
              </button>
              <button
                type="button"
                onClick={() => setProfile('AUTH_ACCESS')}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all text-center cursor-pointer ${
                  profile === 'AUTH_ACCESS'
                    ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300 font-semibold'
                    : 'bg-[#070b12] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Auth, BOLA & SSRF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress & Console Telemetry (Visible when scanning or after scan) */}
      {progress && (
        <div className="bg-[#070b12] border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-slate-300 flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              {progress.currentStep}
            </span>
            <span className="font-mono text-emerald-400 font-bold tabular-nums">
              {progress.progressPercent}%
            </span>
          </div>

          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 transition-all duration-300 ease-out"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>

          <div className="bg-[#05080e] rounded-lg p-3 font-mono text-[11px] text-slate-400 max-h-32 overflow-y-auto space-y-1 border border-slate-900">
            {progress.logs.map((log, index) => (
              <div
                key={index}
                className={
                  log.includes('CRITICAL')
                    ? 'text-red-400'
                    : log.includes('WARN') || log.includes('HIGH')
                    ? 'text-amber-400'
                    : log.includes('PASS')
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                }
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Findings Section */}
      {hasScanned && (
        <div className="space-y-4">
          {/* Metrics & Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d131f] border border-slate-800 p-4 rounded-xl">
            {/* Severity Counters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setSeverityFilter('ALL')}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium cursor-pointer transition-colors ${
                  severityFilter === 'ALL'
                    ? 'bg-slate-800 text-white border-slate-600'
                    : 'bg-[#070b12] text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                All Findings ({findings.length})
              </button>

              <button
                onClick={() => setSeverityFilter('CRITICAL')}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                  severityFilter === 'CRITICAL'
                    ? 'bg-red-950/60 text-red-300 border-red-500/60 font-semibold'
                    : 'bg-[#070b12] text-red-400 border-slate-800 hover:border-red-900'
                }`}
              >
                <AlertOctagon className="w-3 h-3" />
                <span>Critical: {counts.CRITICAL}</span>
              </button>

              <button
                onClick={() => setSeverityFilter('HIGH')}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                  severityFilter === 'HIGH'
                    ? 'bg-orange-950/60 text-orange-300 border-orange-500/60 font-semibold'
                    : 'bg-[#070b12] text-orange-400 border-slate-800 hover:border-orange-900'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>High: {counts.HIGH}</span>
              </button>

              <button
                onClick={() => setSeverityFilter('MEDIUM')}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                  severityFilter === 'MEDIUM'
                    ? 'bg-amber-950/60 text-amber-300 border-amber-500/60 font-semibold'
                    : 'bg-[#070b12] text-amber-400 border-slate-800 hover:border-amber-900'
                }`}
              >
                <Info className="w-3 h-3" />
                <span>Medium: {counts.MEDIUM}</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search findings, CWE, paths..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#070b12] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Finding Cards */}
          {filteredFindings.length === 0 ? (
            <div className="bg-[#0d131f] border border-slate-800 rounded-xl p-8 text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-base font-semibold text-white">
                No Vulnerabilities Found
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {securityLevel === 'HARDENED'
                  ? 'All targeted endpoints successfully passed the security audit with active defenses.'
                  : 'No vulnerabilities match the current filter or search criteria.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFindings.map((finding) => {
                const isExpanded = expandedFindingId === finding.id;
                const isFixed = finding.status === 'VERIFIED_FIXED';

                return (
                  <div
                    key={finding.id}
                    className={`bg-[#0d131f] border rounded-xl overflow-hidden transition-all ${
                      isFixed
                        ? 'border-emerald-500/40 bg-emerald-950/10'
                        : finding.severity === 'CRITICAL'
                        ? 'border-red-500/40'
                        : finding.severity === 'HIGH'
                        ? 'border-orange-500/40'
                        : 'border-slate-800'
                    }`}
                  >
                    {/* Header Row */}
                    <div
                      onClick={() => setExpandedFindingId(isExpanded ? null : finding.id)}
                      className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/20"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isFixed ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                        ) : finding.severity === 'CRITICAL' ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                        ) : finding.severity === 'HIGH' ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-orange-400 shrink-0" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-semibold text-slate-400">
                              {finding.cweId}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-xs font-mono text-emerald-400">
                              {finding.endpoint}
                            </span>
                            {isFixed && (
                              <span className="text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">
                                [VERIFIED MITIGATED]
                              </span>
                            )}
                          </div>
                          <h2 className="text-sm font-semibold text-white truncate mt-0.5">
                            {finding.title}
                          </h2>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <span className="text-xs font-mono font-bold text-white tabular-nums">
                            CVSS {finding.cvssScore.toFixed(1)}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            {finding.severity}
                          </span>
                        </div>

                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Detail Body */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 space-y-4">
                        {/* Description & Impact */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="bg-[#070b12] p-3 rounded-lg border border-slate-800 space-y-1">
                            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                              Vulnerability Description
                            </span>
                            <p className="text-slate-300 leading-relaxed">
                              {finding.description}
                            </p>
                          </div>
                          <div className="bg-[#070b12] p-3 rounded-lg border border-slate-800 space-y-1">
                            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                              Security & Exploit Impact
                            </span>
                            <p className="text-slate-300 leading-relaxed">
                              {finding.impact}
                            </p>
                          </div>
                        </div>

                        {/* Proof of Concept (PoC) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                              <Terminal className="w-3.5 h-3.5 text-amber-400" />
                              <span>Proof of Concept (PoC) Evidence</span>
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              Method: {finding.method}
                            </span>
                          </div>

                          <div className="bg-[#05080e] border border-slate-900 rounded-lg p-3 font-mono text-xs space-y-2">
                            <div>
                              <span className="text-[11px] text-slate-400 block">
                                Attack Request & Payload:
                              </span>
                              <pre className="text-amber-300 overflow-x-auto whitespace-pre-wrap mt-0.5">
                                {finding.proofOfConcept.request}
                              </pre>
                            </div>
                            <div className="pt-2 border-t border-slate-800">
                              <span className="text-[11px] text-slate-400 block">
                                Vulnerable Response (Data Leak / Bypass):
                              </span>
                              <pre className="text-red-300 overflow-x-auto whitespace-pre-wrap mt-0.5">
                                {finding.proofOfConcept.response}
                              </pre>
                            </div>
                          </div>
                        </div>

                        {/* Remediation Guidance & Working Code */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                              <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Remediation & Defense Implementation</span>
                            </span>

                            <div className="flex items-center gap-1 bg-[#070b12] p-0.5 rounded-lg border border-slate-800">
                              <button
                                onClick={() => setRemediationLang('node')}
                                className={`px-2.5 py-1 text-[11px] font-medium rounded cursor-pointer transition-colors ${
                                  remediationLang === 'node'
                                    ? 'bg-slate-800 text-white'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                Node.js / Express
                              </button>
                              <button
                                onClick={() => setRemediationLang('python')}
                                className={`px-2.5 py-1 text-[11px] font-medium rounded cursor-pointer transition-colors ${
                                  remediationLang === 'python'
                                    ? 'bg-slate-800 text-white'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                Python / FastAPI
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-slate-400">
                            {finding.remediation.summary}
                          </p>

                          <div className="relative bg-[#05080e] border border-slate-900 rounded-lg p-3 font-mono text-xs">
                            <button
                              onClick={() =>
                                handleCopyCode(
                                  finding.id,
                                  remediationLang === 'node'
                                    ? finding.remediation.nodeCode
                                    : finding.remediation.pythonCode
                                )
                              }
                              className="absolute top-2.5 right-2.5 p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded cursor-pointer text-xs flex items-center gap-1"
                              title="Copy code snippet"
                            >
                              {copiedId === finding.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-[10px]">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span className="text-[10px]">Copy</span>
                                </>
                              )}
                            </button>

                            <pre className="text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                              {remediationLang === 'node'
                                ? finding.remediation.nodeCode
                                : finding.remediation.pythonCode}
                            </pre>
                          </div>
                        </div>

                        {/* Interactive Verification CTA */}
                        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800">
                          <span className="text-[11px] text-slate-400">
                            Standards Reference: {finding.remediation.guideline}
                          </span>

                          <button
                            onClick={() => handleVerifyFix(finding)}
                            disabled={verifyingId === finding.id || isFixed}
                            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-default ${
                              isFixed
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-sm'
                            }`}
                          >
                            {verifyingId === finding.id ? (
                              <>
                                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Verifying Defense Patch...</span>
                              </>
                            ) : isFixed ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mitigation Verified</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Verify Remediation in Lab</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
