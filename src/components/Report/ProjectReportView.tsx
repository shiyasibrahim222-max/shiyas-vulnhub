/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  BookOpen,
  Award,
  Layers,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Globe,
  Download,
} from 'lucide-react';
import { useAppConfig, extractHostname } from '../../services/appConfig';

interface ProjectReportViewProps {
  onOpenDownloadModal?: () => void;
}

interface VivaQuestion {
  question: string;
  answer: string;
  category: string;
}

const VIVA_QUESTIONS: VivaQuestion[] = [
  {
    category: 'Injection & SQLi',
    question: 'How do Prepared Statements mathematically prevent SQL Injection at the AST/Database Parser level?',
    answer:
      'In direct string concatenation, the database parser evaluates user input as part of the SQL grammar and Abstract Syntax Tree (AST), allowing attackers to insert boolean operators (OR, AND) and comment characters. In Prepared Statements, the database compiles the SQL statement into a fixed execution plan first. Parameter values are sent separately across the wire and bound strictly as literal data types (e.g. VARCHAR, INT), making it syntactically impossible for input characters to alter the AST query structure.',
  },
  {
    category: 'Access Control',
    question: 'What is Broken Object Level Authorization (BOLA/IDOR), and why does traditional role-based middleware fail to catch it?',
    answer:
      'BOLA occurs when an application exposes internal object identifiers (such as `/api/invoices/104`) without validating that the authenticated session user actually owns or is authorized to read that specific record. Traditional RBAC middleware only verifies that the user is logged in as a "user" or "customer", but does not verify tenant record-level ownership (e.g. `invoice.ownerId === req.user.id`). Hence, BOLA requires data-layer authorization checks.',
  },
  {
    category: 'Cryptography',
    question: 'Why is SHA-256 or MD5 alone insufficient for secure password storage, and why is PBKDF2 or Argon2 required?',
    answer:
      'General-purpose cryptographic hash functions like SHA-256 and MD5 are engineered to be extremely fast for data integrity verification, computing billions of hashes per second on modern GPUs. This allows attackers to brute-force leaked database dumps in minutes using rainbow tables and hashcat. Password hashing functions like PBKDF2, Argon2, and bcrypt introduce two critical defenses: 1) a unique 128-bit cryptographic salt preventing precomputed rainbow tables, and 2) a configurable work factor (e.g. 100,000 iterations) that deliberately increases CPU/memory cost to thwart massive GPU parallel brute-force attacks.',
  },
  {
    category: 'Authentication',
    question: 'How does RFC 6238 TOTP (Time-based One-Time Password) work without requiring internet communication between server and phone?',
    answer:
      'Both the server and the authenticator app share a pre-negotiated shared secret key (e.g. Base32 encoded). The time counter T is derived deterministically by dividing UNIX epoch time by the 30-second window step: T = floor(CurrentTime / 30). Both sides independently compute HMAC-SHA(Secret, T) and apply dynamic truncation to extract a 6-digit integer. Because both systems share the secret and synchronous clocks (NTP), the calculated code matches without transmitting tokens over the air.',
  },
  {
    category: 'Network & SSRF',
    question: 'What is Server-Side Request Forgery (SSRF) and why is blacklisting "127.0.0.1" alone inadequate for defense?',
    answer:
      'SSRF occurs when a web server fetches a remote resource requested by a client without restricting the destination address. Attackers target internal resources behind the perimeter firewall (such as Redis, internal microservices, or AWS cloud metadata at 169.254.169.254). Merely blacklisting the string "127.0.0.1" is inadequate because attackers bypass simple regex using IPv6 loopback (::1), decimal IP representations (2130706433), octal IP, DNS rebinding, or URL redirects. Defense requires resolving DNS pre-flight and strictly rejecting RFC 1918 private subnets and link-local ranges.',
  },
  {
    category: 'Headers & Browser Security',
    question: 'What is Content Security Policy (CSP) and how does it prevent Cross-Site Scripting (XSS)?',
    answer:
      'CSP is an HTTP response header that instructs the browser on what sources of executable scripts, stylesheets, and images are trusted. By configuring `script-src "self"` and forbidding `"unsafe-inline"` and `"unsafe-eval"`, even if an attacker successfully injects a `<script>` or `<img onerror=...>` tag into the DOM via stored or reflected XSS, the browser refuses to execute the untrusted script.',
  },
  {
    category: 'Session Management',
    question: 'Why should session tokens be stored in HttpOnly cookies rather than HTML5 LocalStorage?',
    answer:
      'HTML5 `localStorage` is accessible to any JavaScript code running in the application origin (`window.localStorage`). If an XSS vulnerability exists anywhere in the web app or a third-party npm dependency, the script can exfiltrate the stored token to an attacker server. In contrast, cookies flagged with `HttpOnly` are strictly hidden from JavaScript API access (`document.cookie`), neutralizing automated session theft via XSS.',
  },
];

export const ProjectReportView: React.FC<ProjectReportViewProps> = ({
  onOpenDownloadModal,
}) => {
  const [appConfig] = useAppConfig();
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyReport = () => {
    const markdown = `# SentinelLab: Web Application Security Testing & Secure Authentication Platform
Mini Project Submission Documentation
Student Author: Shiyas Ibrahim (shiyasibrahim143@gmail.com)
Custom Application URL: ${appConfig.customAppUrl}
Project Deadline: 4/10/26 - Wednesday

## 1. Abstract
SentinelLab is a web-based cybersecurity testing lab, automated vulnerability scanner, and NIST SP 800-63B compliant authentication platform. Built strictly for controlled academic assessment, it demonstrates real-world web application attack vectors and defensive mitigations across the OWASP Top 10 (2021) without targeting unauthorized external networks.

Target Host: ${appConfig.customAppUrl}

## 2. Key Modules
- **Mini Web Vulnerability Scanner**: Automated crawler & heuristic engine evaluating HTTP security headers, CORS misconfigurations, SQL Injection vectors, and Stored XSS with CVSS v3.1 scoring.
- **Controlled Practice Sandbox**: Dual-mode sandbox (Vulnerable L0 vs Hardened L1) demonstrating SQLi, XSS, BOLA/IDOR, JWT alg:none, SSRF, and rate limiting.
- **Secure Authentication System**: PBKDF2-HMAC-SHA256 password hashing benchmark, RFC 6238 TOTP 2FA engine, brute force lockout policy, and HttpOnly session architecture.
- **HTTP Security Headers & TLS Auditor**: Automated evaluator analyzing CSP, HSTS, X-Frame-Options, CORS, Cookie security flags, and TLS configurations.
- **Target Environment Selection**: Rapid switching between production domain, local loopback, and custom private LAN IP addresses.

## 3. Verified Test Cases
- TC-01: SQL Injection Login Bypass (' OR '1'='1' --) -> Neutralized via Parameterized PreparedStatement.
- TC-02: BOLA Resource Access (/api/v1/invoices/inv-999) -> Blocked with HTTP 403 Forbidden via Tenant Ownership Validation.
- TC-03: Stored XSS in Feed -> Disarmed via Contextual HTML Entity Encoding.
- TC-04: SSRF Cloud Metadata Probe -> Aborted via CIDR & Private Subnet Filter.
- TC-05: Brute-Force Burst Flood -> Rate limited with HTTP 429 Too Many Requests.`;

    navigator.clipboard.writeText(markdown);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner & Export Actions */}
      <div className="bg-[#0d131f] border border-slate-800 rounded-xl p-5 shadow-sm no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              <span>Mini-Project Documentation & Presentation Kit</span>
            </h1>
            <p className="text-sm text-slate-400">
              Complete project documentation, verified test case matrix, system architecture, and viva defense flashcards for your academic mini-project submission.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleCopyReport}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {copiedSummary ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Report Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>

            {onOpenDownloadModal && (
              <button
                onClick={onOpenDownloadModal}
                className="px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-500/30 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Desktop App</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Formal Project Submission Document (Printable) */}
      <div className="bg-[#0d131f] border border-slate-800 rounded-xl p-6 sm:p-8 space-y-8 text-slate-300">
        {/* Title Block */}
        <div className="border-b border-slate-800 pb-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>WEB-BASED MINI PROJECT SPECIFICATION</span>
            <span className="text-emerald-400 font-semibold">DEADLINE: 4/10/26 — WEDNESDAY</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            SentinelLab: Web Application Vulnerability Scanner, Controlled Practice Lab & Secure Authentication Platform
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1 font-mono">
            <span>Author: <strong className="text-emerald-400 font-semibold">Shiyas Ibrahim</strong></span>
            <span>·</span>
            <span>App URL: <span className="text-emerald-300 font-semibold">{appConfig.customAppUrl}</span></span>
            <span>·</span>
            <span>Env: {appConfig.environment.toUpperCase()}</span>
          </div>
        </div>

        {/* Section 1: Abstract & Problem Statement */}
        <div className="space-y-3 text-xs leading-relaxed">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>1. Abstract & Problem Statement</span>
          </h3>
          <p>
            Modern web applications operate in hostile network environments where improper input sanitization, broken access control, and legacy cryptographic primitives result in severe data breaches. Traditional academic cybersecurity courses often face safety hurdles when practicing vulnerability discovery on live systems.
          </p>
          <p>
            <strong className="text-white">SentinelLab</strong> addresses this challenge by providing an end-to-end, browser-executable web security laboratory that strictly respects ethical hacking boundaries. It incorporates three primary pillars: 1) an automated Mini Web Vulnerability Scanner with CVSS v3.1 scoring; 2) an intentionally vulnerable controlled lab microservice with a dual-mode defense toggle (Level 0 Vulnerable vs Level 1 Hardened); and 3) a NIST SP 800-63B compliant authentication testing suite with live PBKDF2 key stretching and RFC 6238 TOTP multi-factor verification.
          </p>
        </div>

        {/* Section 2: Ethical Boundary & Sandbox Architecture */}
        <div className="space-y-3 text-xs leading-relaxed">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>2. Ethical Standards & Sandbox Containment</span>
          </h3>
          <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-slate-300 space-y-1.5">
            <span className="font-semibold text-emerald-400 block text-xs">
              Ethical Non-Intrusion Compliance:
            </span>
            <p>
              In strict accordance with the project guidelines (<em>"Do not test on actual public websites or unauthorized systems"</em>), all scanning, fuzzing, and exploit demonstrations in SentinelLab are confined exclusively to local, controlled sandboxed microservices. No unauthorized external networks are probed.
            </p>
          </div>
        </div>

        {/* Section 3: OWASP Top 10 (2021) Mapping Matrix */}
        <div className="space-y-3 text-xs">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>3. OWASP Top 10 (2021) Implementation Matrix</span>
          </h3>

          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#070b12] text-slate-400 font-mono text-[11px] border-b border-slate-800">
                  <th className="py-2.5 px-3">OWASP Category</th>
                  <th className="py-2.5 px-3">CWE ID</th>
                  <th className="py-2.5 px-3">Simulated Target Route</th>
                  <th className="py-2.5 px-3">Defensive Mitigation Tested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                <tr className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-3 font-semibold text-white">A01: Broken Access Control</td>
                  <td className="py-2.5 px-3 text-amber-400">CWE-639 (BOLA)</td>
                  <td className="py-2.5 px-3 text-slate-400">GET /api/v1/invoices/:id</td>
                  <td className="py-2.5 px-3 text-emerald-400">Tenant ownership enforcement (HTTP 403)</td>
                </tr>
                <tr className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-3 font-semibold text-white">A02: Cryptographic Failures</td>
                  <td className="py-2.5 px-3 text-amber-400">CWE-328 / CWE-327</td>
                  <td className="py-2.5 px-3 text-slate-400">Auth Hashing Engine</td>
                  <td className="py-2.5 px-3 text-emerald-400">PBKDF2-HMAC-SHA256 (100k rounds) + Salt</td>
                </tr>
                <tr className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-3 font-semibold text-white">A03: Injection</td>
                  <td className="py-2.5 px-3 text-amber-400">CWE-89 / CWE-79</td>
                  <td className="py-2.5 px-3 text-slate-400">POST /api/v1/auth/login & /comments</td>
                  <td className="py-2.5 px-3 text-emerald-400">Parameterized SQL queries & HTML entity encoding</td>
                </tr>
                <tr className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-3 font-semibold text-white">A05: Security Misconfiguration</td>
                  <td className="py-2.5 px-3 text-amber-400">CWE-16 / CWE-942</td>
                  <td className="py-2.5 px-3 text-slate-400">HTTP Response Headers & CORS</td>
                  <td className="py-2.5 px-3 text-emerald-400">Strict CSP, HSTS, X-Frame-Options & CORS allowlist</td>
                </tr>
                <tr className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-3 font-semibold text-white">A07: Identification & Auth</td>
                  <td className="py-2.5 px-3 text-amber-400">CWE-307 / CWE-287</td>
                  <td className="py-2.5 px-3 text-slate-400">POST /api/v1/otp/verify & JWT</td>
                  <td className="py-2.5 px-3 text-emerald-400">Sliding token rate limiter (429) & TOTP MFA</td>
                </tr>
                <tr className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-3 font-semibold text-white">A10: SSRF</td>
                  <td className="py-2.5 px-3 text-amber-400">CWE-918</td>
                  <td className="py-2.5 px-3 text-slate-400">POST /api/v1/fetch-url</td>
                  <td className="py-2.5 px-3 text-emerald-400">CIDR private IP / metadata subnet filter</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Verified Test Cases & Experimental Results */}
        <div className="space-y-3 text-xs">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <span>4. Verified Test Cases & Experimental Outcomes</span>
          </h3>

          <div className="space-y-2.5">
            <div className="bg-[#070b12] p-3 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                <span className="font-bold text-white">TC-01: SQL Injection Authentication Bypass</span>
                <span className="text-emerald-400 font-semibold">[VERIFIED PASSED]</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                <strong>Input:</strong> <code className="text-amber-300">' OR '1'='1' --</code> on username field.<br />
                <strong>Outcome:</strong> In L0 mode, SQL concatenation authenticated as administrator. In L1 mode, prepared statement parameterized binding disarmed quotes and rejected unauthorized access with HTTP 401.
              </p>
            </div>

            <div className="bg-[#070b12] p-3 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                <span className="font-bold text-white">TC-02: BOLA / IDOR Tenant Isolation</span>
                <span className="text-emerald-400 font-semibold">[VERIFIED PASSED]</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                <strong>Input:</strong> User Alice requests invoice <code className="text-amber-300">inv-999</code> (Admin Payroll).<br />
                <strong>Outcome:</strong> In L0 mode, invoice data leaked horizontally. In L1 mode, server verified ownership (<code className="text-slate-300">invoice.ownerId !== user.id</code>) and enforced HTTP 403 Forbidden.
              </p>
            </div>

            <div className="bg-[#070b12] p-3 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                <span className="font-bold text-white">TC-03: SSRF Cloud Metadata Exfiltration</span>
                <span className="text-emerald-400 font-semibold">[VERIFIED PASSED]</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                <strong>Input:</strong> Remote fetch directed to <code className="text-amber-300">http://169.254.169.254/...</code>.<br />
                <strong>Outcome:</strong> In L0 mode, AWS STS mock credentials leaked. In L1 mode, CIDR firewall intercepted the link-local range and blocked request execution.
              </p>
            </div>

            <div className="bg-[#070b12] p-3 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                <span className="font-bold text-white">TC-04: Credential Stuffing & Rate Limiting</span>
                <span className="text-emerald-400 font-semibold">[VERIFIED PASSED]</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                <strong>Input:</strong> 6 rapid OTP verification requests in succession within 1 second.<br />
                <strong>Outcome:</strong> L1 token bucket throttled the 4th, 5th, and 6th requests with HTTP 429 Too Many Requests and a Retry-After header.
              </p>
            </div>
          </div>
        </div>

        {/* Section 5: Viva Voce & Presentation Defense Flashcards */}
        <div className="space-y-4 text-xs no-print">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>5. Mini-Project Viva Voce & Defense Q&A Preparation</span>
          </h3>
          <p className="text-slate-400">
            Click on any question below to inspect authoritative answers for your mini-project presentation:
          </p>

          <div className="space-y-2">
            {VIVA_QUESTIONS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-[#070b12] border border-slate-800 rounded-lg overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-3.5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/30"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-emerald-400">
                        {item.category}
                      </span>
                      <span className="text-xs font-semibold text-white">
                        {item.question}
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-800/60 text-slate-300 leading-relaxed text-xs">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
