/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';

export interface VulnerabilityFinding {
  id: string;
  title: string;
  category: string;
  cweId: string;
  cvssScore: number;
  cvssVector: string;
  severity: Severity;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  parameter?: string;
  description: string;
  impact: string;
  proofOfConcept: {
    request: string;
    payload: string;
    response: string;
  };
  remediation: {
    summary: string;
    nodeCode: string;
    pythonCode: string;
    guideline: string;
  };
  status: 'OPEN' | 'VERIFIED_FIXED';
  detectedAt: string;
}

export type ScanProfile = 'FULL_OWASP' | 'HEADERS_CORS' | 'INJECTION_INPUTS' | 'AUTH_ACCESS';

export interface ScanProgress {
  currentStep: string;
  progressPercent: number;
  phase: 'IDLE' | 'CRAWLING' | 'AUDITING_HEADERS' | 'TESTING_INJECTIONS' | 'TESTING_AUTH' | 'COMPLETED';
  logs: string[];
}

export type LabTopic = 'sqli' | 'xss' | 'bola' | 'jwt' | 'ssrf' | 'ratelimit';

export interface LabModule {
  id: LabTopic;
  title: string;
  owaspCategory: string;
  cwe: string;
  description: string;
  vulnerableExplanation: string;
  hardenedExplanation: string;
  samplePayloads: {
    name: string;
    payload: string;
    expectedResult: string;
  }[];
  vulnerableSnippet: string;
  hardenedSnippet: string;
}

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'auditor';
  passwordHash?: string;
  salt?: string;
  totpSecret?: string;
  totpEnabled: boolean;
  failedAttempts: number;
  lockedUntil?: number | null;
}

export interface SecurityAuditReport {
  id: string;
  generatedDate: string;
  targetUrl: string;
  scanProfile: string;
  overallRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  totalFindings: number;
  severityBreakdown: Record<Severity, number>;
  findings: VulnerabilityFinding[];
}
