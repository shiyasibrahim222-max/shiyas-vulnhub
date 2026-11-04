/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';

export interface AppDomainConfig {
  customAppUrl: string;
  environment: 'production' | 'staging' | 'local' | 'custom';
  customPort: string;
  targetApiPath?: string;
  sslEnabled: boolean;
  notes?: string;
}

const STORAGE_KEY = 'sentinel_custom_domain_config_v1';

// Default custom URL chosen by user: https://sentinellab.shiyas.io
const DEFAULT_CONFIG: AppDomainConfig = {
  customAppUrl: 'https://sentinellab.shiyas.io',
  environment: 'production',
  customPort: '443',
  targetApiPath: '',
  sslEnabled: true,
  notes: 'Production domain: https://sentinellab.shiyas.io',
};

const listeners = new Set<(cfg: AppDomainConfig) => void>();

export function getAppConfig(): AppDomainConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.customAppUrl === 'string' && parsed.customAppUrl.trim().length > 0) {
        // Prevent any legacy or accidental .aistudio domain if stored previously
        if (parsed.customAppUrl.includes('.aistudio') || parsed.customAppUrl.includes('ais-dev-')) {
          parsed.customAppUrl = 'https://sentinellab.shiyas.io';
        }
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    }
  } catch (e) {
    console.warn('Failed to parse custom domain config from localStorage:', e);
  }
  return DEFAULT_CONFIG;
}

export function isIpAddress(urlOrHost: string): boolean {
  const host = extractHostname(urlOrHost);
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^::1$|^([0-9a-fA-F]{1,4}:){1,7}:$/;
  return ipv4Regex.test(host) || host === 'localhost' || host === '127.0.0.1' || ipv6Regex.test(host);
}

export function getIpClassification(urlOrHost: string): string {
  const host = extractHostname(urlOrHost);
  if (host === '127.0.0.1' || host === 'localhost' || host === '::1') {
    return 'Loopback (Localhost)';
  }
  if (/^10\./.test(host)) return 'Private Subnet (10.0.0.0/8)';
  if (/^192\.168\./.test(host)) return 'Private LAN (192.168.0.0/16)';
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return 'Private LAN (172.16.0.0/12)';
  if (/^169\.254\./.test(host)) return 'Link-Local (169.254.0.0/16)';
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (ipv4Regex.test(host)) return 'Public IPv4 Target';
  if (host.includes(':')) return 'IPv6 Target';
  return 'Domain FQDN';
}

export function extractHostWithPort(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.host; // includes hostname and port if present
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0] || 'localhost';
  }
}

const RECENT_TARGETS_KEY = 'sentinel_recent_targets_v1';
const DEFAULT_PRESET_TARGETS = [
  'https://sentinellab.shiyas.io',
  'https://shiyasvulnerabilities.com',
  'http://127.0.0.1:3000',
  'http://192.168.1.1:80',
  'http://192.168.1.100:8080',
  'http://10.0.0.1:80',
];

export function getRecentTargets(): string[] {
  if (typeof window === 'undefined') return DEFAULT_PRESET_TARGETS;
  try {
    const raw = localStorage.getItem(RECENT_TARGETS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_PRESET_TARGETS;
}

export function addRecentTarget(targetUrl: string): string[] {
  if (typeof window === 'undefined') return DEFAULT_PRESET_TARGETS;
  try {
    const current = getRecentTargets();
    const clean = targetUrl.trim();
    const updated = [clean, ...current.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(0, 10);
    localStorage.setItem(RECENT_TARGETS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_PRESET_TARGETS;
  }
}

export function saveAppConfig(updated: Partial<AppDomainConfig>): AppDomainConfig {
  const current = getAppConfig();
  let sanitizedUrl = (updated.customAppUrl ?? current.customAppUrl).trim();
  
  // Format check: ensure scheme
  if (!/^https?:\/\//i.test(sanitizedUrl)) {
    const hostPart = sanitizedUrl.split('/')[0];
    const isIp = isIpAddress(hostPart);
    if (isIp && !sanitizedUrl.includes(':443') && !sanitizedUrl.includes(':8443')) {
      sanitizedUrl = `http://${sanitizedUrl}`;
    } else {
      sanitizedUrl = `https://${sanitizedUrl}`;
    }
  }
  // Remove trailing slashes
  sanitizedUrl = sanitizedUrl.replace(/\/+$/, '');

  const newConfig: AppDomainConfig = {
    ...current,
    ...updated,
    customAppUrl: sanitizedUrl,
    sslEnabled: sanitizedUrl.startsWith('https://'),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    addRecentTarget(sanitizedUrl);
  } catch (e) {
    console.error('Failed to save custom domain config:', e);
  }

  listeners.forEach((fn) => fn(newConfig));
  return newConfig;
}

export function extractHostname(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname;
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0].split(':')[0] || 'localhost';
  }
}

export function useAppConfig(): [AppDomainConfig, (cfg: Partial<AppDomainConfig>) => void] {
  const [config, setConfigState] = useState<AppDomainConfig>(() => getAppConfig());

  useEffect(() => {
    const handler = (newCfg: AppDomainConfig) => setConfigState(newCfg);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const update = (patch: Partial<AppDomainConfig>) => {
    const res = saveAppConfig(patch);
    setConfigState(res);
  };

  return [config, update];
}

export function getDnsRecords(customUrl: string): Array<{ type: string; host: string; value: string; purpose: string }> {
  const host = extractHostname(customUrl);
  const isSubdomain = host.split('.').length > 2;

  return [
    {
      type: isSubdomain ? 'CNAME' : 'A',
      host: isSubdomain ? host.split('.')[0] : '@',
      value: isSubdomain ? 'cluster.yourserver.net.' : '203.0.113.10',
      purpose: 'Points your custom domain to your independent server host',
    },
    {
      type: 'TXT',
      host: '_security-challenge',
      value: 'netlab-verification=' + Math.random().toString(36).substring(2, 10),
      purpose: 'DNS domain ownership validation for SSL certificate issuance',
    },
  ];
}

export function generateNginxSnippet(customUrl: string, port = '3000'): string {
  const domain = extractHostname(customUrl);
  return `# /etc/nginx/sites-available/${domain}
server {
    listen 80;
    server_name ${domain};
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${domain};

    ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com;" always;

    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass $http_upgrade;
    }
}`;
}

export function getLiveReachableUrl(): string {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return 'https://ais-pre-glbvmmgpus7v3rr6dizdzo-29450069043.asia-northeast1.run.app';
}

export function generateWindowsDnsFixBatch(domain = 'sentinellab.shiyas.io'): string {
  return `@echo off
:: SentinelLab Local DNS Resolver Configuration
:: Fixes: DNS_PROBE_FINISHED_NXDOMAIN for ${domain}
:: Requires Administrator privileges to update hosts file

echo ========================================================
echo   Fixing 'DNS_PROBE_FINISHED_NXDOMAIN' for ${domain}
echo ========================================================
echo.

:: Check Admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Administrator privileges required.
    echo Right-click this .bat file and select "Run as administrator".
    pause
    exit /b 1
)

echo [*] Adding resolution for ${domain} to Windows hosts file...
findstr /i "${domain}" %windir%\\system32\\drivers\\etc\\hosts >nul
if %errorLevel% equ 0 (
    echo [OK] ${domain} already configured in hosts file.
) else (
    echo.>> %windir%\\system32\\drivers\\etc\\hosts
    echo # SentinelLab Security Platform Local Resolution>> %windir%\\system32\\drivers\\etc\\hosts
    echo 127.0.0.1  ${domain}>> %windir%\\system32\\drivers\\etc\\hosts
    echo [OK] Added '127.0.0.1 ${domain}' to %windir%\\system32\\drivers\\etc\\hosts
)

echo [*] Flushing Windows DNS Cache...
ipconfig /flushdns

echo.
echo ========================================================
echo [SUCCESS] Local DNS resolution fixed!
echo You can now navigate to: http://${domain}:3000
echo or run the SentinelLab Desktop Launcher.
echo ========================================================
pause
`;
}

export function generateCaddyfileSnippet(customUrl: string, port = '3000'): string {
  const domain = extractHostname(customUrl);
  return `# Caddyfile
${domain} {
    encode gzip zstd
    reverse_proxy 127.0.0.1:${port}

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}`;
}

