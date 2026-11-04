/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Lock,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertCircle,
  CheckCircle,
  Copy,
  Check,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import {
  calculatePasswordEntropy,
  generateTotpCode,
  pbkdf2Derive,
  weakMd5Simulated,
} from '../../services/cryptoEngine';

export const SecureAuthView: React.FC = () => {
  // Section 1: Password Hashing Sandbox State
  const [testPassword, setTestPassword] = useState('My$ecureP@ssw0rd2026');
  const [iterations, setIterations] = useState(100000);
  const [pbkdf2Result, setPbkdf2Result] = useState<{
    hashHex: string;
    saltHex: string;
    durationMs: number;
  } | null>(null);
  const [isHashing, setIsHashing] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  // Section 2: TOTP / 2FA Engine State
  const [totpSecret] = useState('JBSWY3DPEHPK3PXP');
  const [totpData, setTotpData] = useState<{
    code: string;
    secondsRemaining: number;
    currentStep: number;
  }>({ code: '------', secondsRemaining: 30, currentStep: 0 });
  const [userOtpInput, setUserOtpInput] = useState('');
  const [otpVerifyResult, setOtpVerifyResult] = useState<'IDLE' | 'SUCCESS' | 'FAILED'>('IDLE');

  // Section 3: Brute Force & Lockout Simulator State
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState<number | null>(null);

  // Section 4: Password Entropy Calculation
  const entropyInfo = calculatePasswordEntropy(testPassword);

  // Run PBKDF2 derivation whenever password or iterations change
  useEffect(() => {
    let isCancelled = false;
    async function derive() {
      setIsHashing(true);
      try {
        const res = await pbkdf2Derive(testPassword, undefined, iterations);
        if (!isCancelled) {
          setPbkdf2Result(res);
        }
      } finally {
        if (!isCancelled) setIsHashing(false);
      }
    }
    derive();
    return () => {
      isCancelled = true;
    };
  }, [testPassword, iterations]);

  // Run live TOTP clock updater every second
  useEffect(() => {
    async function updateTotp() {
      const res = await generateTotpCode(totpSecret, 30);
      setTotpData(res);
    }
    updateTotp();
    const interval = setInterval(updateTotp, 1000);
    return () => clearInterval(interval);
  }, [totpSecret]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutTimer === null || lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer((prev) => (prev && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const handleVerifyTotp = () => {
    if (userOtpInput.trim() === totpData.code) {
      setOtpVerifyResult('SUCCESS');
    } else {
      setOtpVerifyResult('FAILED');
    }
  };

  const handleSimulateFailedLogin = () => {
    if (lockoutTimer !== null) return;
    const newCount = failedAttempts + 1;
    if (newCount >= 5) {
      setFailedAttempts(5);
      setLockoutTimer(30); // 30-second lockout demonstration
    } else {
      setFailedAttempts(newCount);
    }
  };

  const handleResetLockout = () => {
    setFailedAttempts(0);
    setLockoutTimer(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#0d131f] border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-400" />
            <span>Secure Authentication System Architecture</span>
          </h1>
          <p className="text-sm text-slate-400">
            NIST SP 800-63B standard verification: Cryptographic PBKDF2 hashing, RFC 6238 TOTP multi-factor verification, and account lockout rate defenses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Module 1: Password Storage: Insecure MD5 vs Hardened PBKDF2 */}
        <div className="bg-[#0d131f] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>Password Hashing & Salt Benchmarking</span>
            </h2>
            <span className="text-xs font-mono text-slate-400">
              NIST SP 800-63B §5.1.1
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Input Password
              </label>
              <input
                type="text"
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
                className="w-full bg-[#070b12] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Password Entropy Evaluation */}
            <div className="bg-[#070b12] p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Shannon Entropy Score:</span>
                <span className="font-mono font-bold text-emerald-400 tabular-nums">
                  {entropyInfo.bits} bits ({entropyInfo.strength})
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    entropyInfo.bits < 35
                      ? 'bg-red-500'
                      : entropyInfo.bits < 60
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (entropyInfo.bits / 80) * 100)}%` }}
                />
              </div>
              {entropyInfo.feedback.length > 0 && (
                <div className="text-[11px] text-slate-400 space-y-0.5">
                  {entropyInfo.feedback.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-amber-300/90">
                      <span>·</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Insecure Hash Comparison (MD5 / Plaintext) */}
            <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/20 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-red-400 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Insecure Legacy Storage (Unsalted MD5):</span>
                </span>
                <span className="text-[11px] font-mono text-red-400">
                  Speed: &lt;0.01 ms (Vulnerable to GPU Rainbow Tables)
                </span>
              </div>
              <div className="bg-[#05080e] p-2 rounded font-mono text-[11px] text-red-300 break-all select-all">
                {weakMd5Simulated(testPassword)}
              </div>
              <p className="text-[11px] text-slate-400">
                Flaw: MD5 has zero key stretching and no unique cryptographic salt. An attacker with a modern GPU can compute billions of MD5 hashes per second.
              </p>
            </div>

            {/* Hardened Hash (PBKDF2-HMAC-SHA256) */}
            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Secure Storage (PBKDF2-HMAC-SHA256):</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-400 tabular-nums">
                  {isHashing ? (
                    'Computing derivation...'
                  ) : (
                    `Computed in ${pbkdf2Result?.durationMs || 0} ms`
                  )}
                </span>
              </div>

              <div className="space-y-1.5">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    Cryptographic 128-bit Salt:
                  </span>
                  <div className="bg-[#05080e] p-1.5 rounded font-mono text-[11px] text-slate-300 break-all">
                    {pbkdf2Result?.saltHex || 'Generating...'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    Derived Key (256-bit Digest):
                  </span>
                  <div className="bg-[#05080e] p-1.5 rounded font-mono text-[11px] text-emerald-300 break-all">
                    {pbkdf2Result?.hashHex || 'Deriving...'}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Iterations: {iterations.toLocaleString()} rounds</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIterations(50000)}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      iterations === 50000 ? 'bg-slate-700 text-white' : 'hover:text-slate-200'
                    }`}
                  >
                    50k
                  </button>
                  <button
                    onClick={() => setIterations(100000)}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      iterations === 100000 ? 'bg-slate-700 text-white' : 'hover:text-slate-200'
                    }`}
                  >
                    100k (NIST)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Module 2: Live RFC 6238 TOTP Multi-Factor Authentication */}
        <div className="bg-[#0d131f] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Multi-Factor Authentication (RFC 6238 TOTP)</span>
            </h2>
            <span className="text-xs font-mono text-slate-400">
              30s Time Step Window
            </span>
          </div>

          <div className="space-y-4">
            {/* Live Authenticator Card */}
            <div className="bg-[#070b12] border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-mono block">
                  Simulated Authenticator App (Google/Microsoft Auth)
                </span>
                <div className="text-2xl font-mono font-bold text-white tracking-widest tabular-nums">
                  {totpData.code.slice(0, 3)} {totpData.code.slice(3, 6)}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Secret: {totpSecret}
                </div>
              </div>

              {/* Countdown Progress Circle */}
              <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                <svg className="w-12 h-12 -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="#1e293b"
                    strokeWidth="3"
                    fill="none"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke={totpData.secondsRemaining < 6 ? '#ef4444' : '#10b981'}
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={125.6}
                    strokeDashoffset={125.6 * (1 - totpData.secondsRemaining / 30)}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <span className="absolute font-mono text-xs font-bold text-slate-200 tabular-nums">
                  {totpData.secondsRemaining}s
                </span>
              </div>
            </div>

            {/* Test OTP Verification Input */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Verify 2FA Code (Enter the 6-digit code above to test):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 123456"
                  value={userOtpInput}
                  onChange={(e) => {
                    setUserOtpInput(e.target.value.replace(/\D/g, ''));
                    setOtpVerifyResult('IDLE');
                  }}
                  className="w-full bg-[#070b12] border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-center tracking-widest text-slate-200 focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  onClick={handleVerifyTotp}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  Verify Code
                </button>
              </div>

              {otpVerifyResult === 'SUCCESS' && (
                <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>2FA Validated: Time window and HMAC-SHA256 signature verified.</span>
                </div>
              )}

              {otpVerifyResult === 'FAILED' && (
                <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>Invalid 2FA Code: Token does not match current cryptographic time-step.</span>
                </div>
              )}
            </div>

            {/* Section 3: Brute Force & Account Lockout Defense */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">
                  Credential Stuffing & Lockout Policy
                </span>
                <span className="font-mono text-slate-400">
                  Threshold: 5 attempts
                </span>
              </div>

              <div className="bg-[#070b12] p-3 rounded-lg border border-slate-800 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="text-slate-300">
                    Failed Attempts: <strong className="font-mono text-amber-400 tabular-nums">{failedAttempts} / 5</strong>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {lockoutTimer !== null
                      ? `ACCOUNT LOCKED: Cooldown active for ${lockoutTimer}s`
                      : failedAttempts >= 3
                      ? 'Warning: 2 attempts remaining before temporary lockout'
                      : 'Account status: Active & Nominal'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSimulateFailedLogin}
                    disabled={lockoutTimer !== null}
                    className="px-2.5 py-1.5 bg-red-950/40 border border-red-500/40 text-red-300 hover:bg-red-950/70 rounded text-[11px] font-medium cursor-pointer disabled:opacity-50"
                  >
                    Fail Attempt (+1)
                  </button>
                  <button
                    onClick={handleResetLockout}
                    className="px-2.5 py-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded text-[11px] font-medium cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Section 4: Session Storage Architecture (Cookies vs LocalStorage) */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs">
              <span className="font-semibold text-white block">
                Session Storage Defense: Cookies vs LocalStorage
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-[#070b12] p-2 rounded border border-slate-800">
                  <span className="text-red-400 font-semibold block">❌ LocalStorage</span>
                  <span className="text-slate-400">
                    Accessible to JavaScript (<code className="text-slate-300">window.localStorage</code>). If XSS occurs, attacker steals token instantly.
                  </span>
                </div>
                <div className="bg-[#070b12] p-2 rounded border border-slate-800">
                  <span className="text-emerald-400 font-semibold block">✅ HttpOnly Cookie</span>
                  <span className="text-slate-400">
                    Blocked from document.cookie; flagged with <code className="text-slate-300">Secure; SameSite=Strict</code> to prevent CSRF and script theft.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
