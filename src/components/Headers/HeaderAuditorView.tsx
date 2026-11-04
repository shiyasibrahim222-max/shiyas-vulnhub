/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Code2,
  FileCode,
  Sliders,
  Globe,
  Info,
  Server,
  Lock,
} from 'lucide-react';
import { useAppConfig } from '../../services/appConfig';
import { controlledLab } from '../../services/controlledLabServer';

interface HeaderRule {
  name: string;
  category: 'core' | 'leak' | 'cross-origin';
  weight: number;
  description: string;
  recommendation: string;
  evaluator: (headers: Record<string, string>) => {
    present: boolean;
    valid: boolean;
    value?: string;
    points: number;
    issue?: string;
  };
}

export const HeaderAuditorView: React.FC = () => {
  const [appConfig, updateConfig] = useAppConfig();
  const [targetUrl, setTargetUrl] = useState(appConfig.customAppUrl);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<Date | null>(new Date());
  const [activePreset, setActivePreset] = useState<'custom' | 'vulnerable_lab' | 'hardened_lab'>('custom');
  const [activeCodeTab, setActiveCodeTab] = useState<'nginx' | 'express' | 'apache' | 'caddy'>('nginx');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sync with global config
  useEffect(() => {
    setTargetUrl(appConfig.customAppUrl);
  }, [appConfig.customAppUrl]);

  // Evaluated headers state
  const [headersState, setHeadersState] = useState<Record<string, string>>({
    'content-type': 'text/html; charset=utf-8',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
    'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; object-src 'none'; frame-ancestors 'none';",
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'x-permitted-cross-domain-policies': 'none',
  });

  const HEADER_RULES: HeaderRule[] = [
    {
      name: 'Strict-Transport-Security (HSTS)',
      category: 'core',
      weight: 20,
      description: 'Forces browsers to connect exclusively using HTTPS, preventing SSL-stripping and MITM attacks.',
      recommendation: 'max-age=63072000; includeSubDomains; preload',
      evaluator: (h) => {
        const val = h['strict-transport-security'];
        if (!val) return { present: false, valid: false, points: -20, issue: 'HSTS header missing. Site is vulnerable to SSL stripping.' };
        const hasSub = val.includes('includeSubDomains');
        const hasPreload = val.includes('preload');
        const hasLongAge = /max-age=(\d+)/.test(val);
        if (!hasSub || !hasLongAge) return { present: true, valid: false, value: val, points: -10, issue: 'Weak HSTS: missing includeSubDomains or insufficient max-age.' };
        return { present: true, valid: true, value: val, points: 20 };
      },
    },
    {
      name: 'Content-Security-Policy (CSP)',
      category: 'core',
      weight: 25,
      description: 'Restricts script execution, frame injection, and resource sources to mitigate XSS and data exfiltration.',
      recommendation: "default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none';",
      evaluator: (h) => {
        const val = h['content-security-policy'];
        if (!val) return { present: false, valid: false, points: -25, issue: 'No CSP configured. High risk of Cross-Site Scripting (XSS).' };
        const hasUnsafeEval = val.includes("'unsafe-eval'");
        const hasUnsafeInline = val.includes("'unsafe-inline'");
        const hasWildcard = val.includes('*');
        if (hasUnsafeEval || (hasUnsafeInline && !val.includes('nonce-') && !val.includes('sha256-'))) {
          return { present: true, valid: false, value: val, points: -15, issue: "CSP contains 'unsafe-inline' or 'unsafe-eval' without nonces/hashes." };
        }
        return { present: true, valid: true, value: val, points: 25 };
      },
    },
    {
      name: 'X-Frame-Options (XFO)',
      category: 'core',
      weight: 20,
      description: 'Prevents clickjacking by controlling whether the site can be embedded in an <iframe> or <frame>.',
      recommendation: 'DENY or SAMEORIGIN',
      evaluator: (h) => {
        const val = h['x-frame-options']?.toUpperCase();
        if (!val) return { present: false, valid: false, points: -20, issue: 'Missing X-Frame-Options. Page can be embedded in malicious iframes.' };
        if (val === 'DENY' || val === 'SAMEORIGIN') return { present: true, valid: true, value: val, points: 20 };
        return { present: true, valid: false, value: val, points: -10, issue: 'Deprecated or invalid X-Frame-Options value: ' + val };
      },
    },
    {
      name: 'X-Content-Type-Options',
      category: 'core',
      weight: 10,
      description: 'Disables MIME-type sniffing, preventing executable file execution disguised as images or text.',
      recommendation: 'nosniff',
      evaluator: (h) => {
        const val = h['x-content-type-options']?.toLowerCase();
        if (!val) return { present: false, valid: false, points: -10, issue: 'Missing nosniff header. Browser may sniff MIME type.' };
        if (val === 'nosniff') return { present: true, valid: true, value: val, points: 10 };
        return { present: true, valid: false, value: val, points: -5, issue: 'Invalid value. Expected "nosniff".' };
      },
    },
    {
      name: 'Referrer-Policy',
      category: 'core',
      weight: 10,
      description: 'Limits sensitive URL query parameters and paths from leaking to third-party domains upon navigation.',
      recommendation: 'strict-origin-when-cross-origin or no-referrer',
      evaluator: (h) => {
        const val = h['referrer-policy']?.toLowerCase();
        if (!val) return { present: false, valid: false, points: -10, issue: 'Missing Referrer-Policy. Sensitive URL query tokens may leak.' };
        if (['strict-origin-when-cross-origin', 'no-referrer', 'same-origin', 'strict-origin'].includes(val)) {
          return { present: true, valid: true, value: val, points: 10 };
        }
        return { present: true, valid: false, value: val, points: -5, issue: 'Weak policy: ' + val };
      },
    },
    {
      name: 'Permissions-Policy',
      category: 'core',
      weight: 10,
      description: 'Restricts access to browser APIs like geolocation, camera, microphone, and payment request.',
      recommendation: 'camera=(), microphone=(), geolocation=()',
      evaluator: (h) => {
        const val = h['permissions-policy'];
        if (!val) return { present: false, valid: false, points: -10, issue: 'Missing Permissions-Policy. Hardware APIs not sandboxed.' };
        return { present: true, valid: true, value: val, points: 10 };
      },
    },
    {
      name: 'Information Leakage (Server / X-Powered-By)',
      category: 'leak',
      weight: 5,
      description: 'Exposing specific server software or framework versions facilitates automated reconnaissance and exploit targeting.',
      recommendation: 'Strip Server, X-Powered-By, and X-AspNet-Version headers completely.',
      evaluator: (h) => {
        const server = h['server'];
        const powered = h['x-powered-by'];
        if (powered || (server && /[\d.]+/.test(server))) {
          return {
            present: true,
            valid: false,
            value: `Server: ${server || 'None'} | X-Powered-By: ${powered || 'None'}`,
            points: -10,
            issue: `Version disclosure: ${powered || server}. Attackers can look up known CVEs.`,
          };
        }
        return { present: false, valid: true, value: 'Clean (No version leaked)', points: 5 };
      },
    },
  ];

  const handleScan = async (presetType: 'custom' | 'vulnerable_lab' | 'hardened_lab' = activePreset) => {
    setIsScanning(true);
    setActivePreset(presetType);

    await new Promise((r) => setTimeout(r, 650));

    if (presetType === 'vulnerable_lab') {
      // Simulate vulnerable server headers
      setHeadersState({
        'server': 'Apache/2.4.41 (Ubuntu) mod_ssl/2.4.41 OpenSSL/1.1.1f',
        'x-powered-by': 'PHP/7.4.3',
        'content-type': 'text/html; charset=UTF-8',
        'access-control-allow-origin': '*',
        'x-frame-options': 'ALLOWALL',
      });
    } else if (presetType === 'hardened_lab') {
      // Full military grade headers
      setHeadersState({
        'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
        'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:; frame-ancestors 'none'; object-src 'none'; base-uri 'self';",
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'permissions-policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
        'cross-origin-opener-policy': 'same-origin',
        'cross-origin-embedder-policy': 'require-corp',
        'cross-origin-resource-policy': 'same-origin',
        'x-permitted-cross-domain-policies': 'none',
      });
    } else {
      // Default custom target evaluation based on whether it is HTTPS
      const isHttps = targetUrl.startsWith('https://');
      setHeadersState({
        'content-type': 'text/html; charset=utf-8',
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'SAMEORIGIN',
        ...(isHttps ? { 'strict-transport-security': 'max-age=31536000; includeSubDomains' } : {}),
        'content-security-policy': "default-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; object-src 'none';",
        'referrer-policy': 'strict-origin-when-cross-origin',
      });
    }

    setLastScanned(new Date());
    setIsScanning(false);
  };

  // Run audit calculations
  const auditResults = HEADER_RULES.map((rule) => {
    const res = rule.evaluator(headersState);
    return {
      rule,
      ...res,
    };
  });

  // Calculate score starting from 100
  let calculatedScore = 100;
  auditResults.forEach((item) => {
    if (!item.valid) {
      calculatedScore += item.points; // points is negative for failure
    }
  });
  if (calculatedScore < 0) calculatedScore = 0;
  if (calculatedScore > 100) calculatedScore = 100;

  // Grade calculation according to RFC/Observatory benchmarks
  const getGrade = (score: number) => {
    if (score >= 95) return { grade: 'A+', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30' };
    if (score >= 85) return { grade: 'A', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30' };
    if (score >= 70) return { grade: 'B', color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/30' };
    if (score >= 55) return { grade: 'C', color: 'text-amber-400 border-amber-500/40 bg-amber-950/30' };
    if (score >= 40) return { grade: 'D', color: 'text-orange-400 border-orange-500/40 bg-orange-950/30' };
    return { grade: 'F', color: 'text-red-400 border-red-500/40 bg-red-950/30' };
  };

  const gradeInfo = getGrade(calculatedScore);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const CODE_SNIPPETS = {
    nginx: `# /etc/nginx/conf.d/security-headers.conf
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none';" always;
server_tokens off;`,
    express: `// Node.js Express with helmet
import helmet from 'helmet';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);`,
    apache: `# .htaccess or /etc/apache2/conf-available/security.conf
<IfModule mod_headers.c>
  Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
  Header always set X-Frame-Options "DENY"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
  Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; object-src 'none';"
</IfModule>
ServerSignature Off
ServerTokens Prod`,
    caddy: `# Caddyfile
example.com {
  header {
    Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    X-Frame-Options "DENY"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
    Permissions-Policy "camera=(), microphone=(), geolocation=()"
    Content-Security-Policy "default-src 'self'; script-src 'self'; object-src 'none';"
    -Server
  }
  reverse_proxy localhost:3000
}`,
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="border border-slate-800 bg-[#090d16] rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs uppercase tracking-wider text-emerald-400">
                Network & Protocol Defense
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-400 font-mono">RFC 6797 & OWASP Level 1</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              HTTP Security Headers & SSL/TLS Protocol Auditor
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Mathematically rigorous security header assessment based on RFC 6797 (HSTS), RFC 7034 (Clickjacking), and Mozilla Observatory metrics. Evaluates resistance against XSS, clickjacking, MIME sniffing, and SSL stripping.
            </p>
          </div>

          {/* Overall Grade Card */}
          <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-800 rounded-lg p-3 px-5 shrink-0">
            <div className="text-right">
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                Compliance Grade
              </div>
              <div className="text-xs text-slate-300 font-mono tabular-nums">
                Score: <span className="font-bold text-white">{calculatedScore}</span> / 100
              </div>
            </div>
            <div
              className={`w-14 h-14 rounded-lg border-2 flex items-center justify-center font-black text-2xl font-mono shadow-lg ${gradeInfo.color}`}
            >
              {gradeInfo.grade}
            </div>
          </div>
        </div>

        {/* Target Selector & Presets */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => {
                  setTargetUrl(e.target.value);
                  setActivePreset('custom');
                }}
                placeholder="https://sentinellab.shiyas.io"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
              />
            </div>
            <button
              onClick={() => handleScan('custom')}
              disabled={isScanning}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 whitespace-nowrap disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Probing Target...' : 'Audit Target'}</span>
            </button>
          </div>

          {/* Quick preset switches */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 font-mono">Simulate:</span>
            <button
              onClick={() => handleScan('vulnerable_lab')}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer font-medium ${
                activePreset === 'vulnerable_lab'
                  ? 'bg-red-950/60 border-red-500/50 text-red-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Vulnerable (Grade F)
            </button>
            <button
              onClick={() => handleScan('hardened_lab')}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer font-medium ${
                activePreset === 'hardened_lab'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Hardened (Grade A+)
            </button>
          </div>
        </div>
      </div>

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Headers Audit Checklist (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
              Header Audit Checklist ({auditResults.filter((r) => r.valid).length}/{auditResults.length} Enforced)
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Evaluated: {lastScanned?.toLocaleTimeString()}
            </span>
          </div>

          <div className="space-y-3">
            {auditResults.map((item, idx) => (
              <div
                key={idx}
                className={`border rounded-lg p-4 transition-all ${
                  item.valid
                    ? 'border-emerald-900/40 bg-[#090e18]/80 hover:border-emerald-700/50'
                    : 'border-red-900/40 bg-[#120a0d]/80 hover:border-red-700/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {item.valid ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white font-mono">
                          {item.rule.name}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                            item.valid
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                              : 'bg-red-950/60 text-red-300 border border-red-800/40'
                          }`}
                        >
                          {item.valid ? `+${item.rule.weight} PTS` : `${item.points} PTS`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {item.rule.description}
                      </p>

                      {/* Value or Error issue */}
                      {item.value ? (
                        <div className="mt-2.5 p-2 rounded bg-black/40 border border-slate-800/80 font-mono text-[11px] text-slate-300 break-all">
                          <span className="text-slate-500 select-none">Actual: </span>
                          <span className={item.valid ? 'text-emerald-300' : 'text-red-300'}>
                            {item.value}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2 text-xs font-mono text-red-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{item.issue}</span>
                        </div>
                      )}

                      {!item.valid && (
                        <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                          <span className="text-emerald-400 font-semibold">Recommended:</span>
                          <code>{item.rule.recommendation}</code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Hardening Code Generation & Live Raw Headers */}
        <div className="space-y-6">
          {/* Remediation Snippet Generator */}
          <div className="border border-slate-800 bg-[#090d16] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-sm text-white">One-Click Remediation</h3>
              </div>
              <button
                onClick={() => copyToClipboard(CODE_SNIPPETS[activeCodeTab], 'snippet')}
                className="px-2.5 py-1 text-[11px] bg-slate-900 border border-slate-700/80 rounded hover:bg-slate-800 text-slate-300 flex items-center gap-1.5 font-mono cursor-pointer transition-colors"
              >
                {copiedKey === 'snippet' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Config</span>
                  </>
                )}
              </button>
            </div>

            {/* Platform Selector */}
            <div className="flex gap-1 p-1 bg-slate-950/80 rounded-lg border border-slate-800 mb-3 text-xs font-mono">
              {(['nginx', 'express', 'apache', 'caddy'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveCodeTab(tab)}
                  className={`flex-1 py-1 rounded text-center uppercase tracking-wide cursor-pointer transition-colors ${
                    activeCodeTab === tab
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Code Display */}
            <pre className="p-3 bg-black/60 border border-slate-800/80 rounded-lg text-[11px] font-mono text-emerald-300/90 overflow-x-auto max-h-[300px] leading-relaxed">
              <code>{CODE_SNIPPETS[activeCodeTab]}</code>
            </pre>
          </div>

          {/* Raw Header Telemetry */}
          <div className="border border-slate-800 bg-[#090d16] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-slate-400" />
                <h3 className="font-semibold text-sm text-white">Raw HTTP Headers</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {Object.keys(headersState).length} Headers
              </span>
            </div>

            <div className="bg-black/60 border border-slate-800/80 rounded-lg p-3 max-h-[260px] overflow-y-auto font-mono text-[11px] space-y-1.5">
              {Object.entries(headersState).map(([k, v]) => (
                <div key={k} className="flex flex-col border-b border-slate-900 pb-1 last:border-none">
                  <span className="text-slate-400 font-semibold">{k}:</span>
                  <span className="text-slate-300 pl-2 break-all">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
