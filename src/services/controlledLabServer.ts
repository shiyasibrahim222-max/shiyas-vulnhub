/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LabSecurityLevel = 'VULNERABLE' | 'HARDENED';

export interface LabRequestLog {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  requestHeaders: Record<string, string>;
  requestBody?: unknown;
  status: number;
  statusText: string;
  responseHeaders: Record<string, string>;
  responseBody: unknown;
  securityLevel: LabSecurityLevel;
  defenseNotes?: string;
  simulatedQuery?: string;
}

// Initial Mock Data
const INITIAL_USERS = [
  { id: 'usr-1', username: 'admin', email: 'admin@sentinellab.local', role: 'admin', passwordPlain: 'SuperSecret2026!#', passwordHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8' },
  { id: 'usr-2', username: 'alice', email: 'alice@company.io', role: 'user', passwordPlain: 'AlicePass#2026', passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' },
  { id: 'usr-3', username: 'bob', email: 'bob@contractor.net', role: 'user', passwordPlain: 'BobSecure@789', passwordHash: '04f8996da763b7a969b1028ee3007569eaf3a635486ddab211d512c85b9df8fb' },
];

const INITIAL_PRODUCTS = [
  { id: 'prod-101', name: 'Sentinel HSM Key Vault', category: 'Hardware', price: 899, stock: 14, description: 'FIPS 140-2 Level 3 hardware security module' },
  { id: 'prod-102', name: 'Air-Gap USB Data Diode', category: 'Network', price: 450, stock: 8, description: 'Unidirectional optical network isolation adapter' },
  { id: 'prod-103', name: 'CAN-Bus Vehicle Intrusion Sensor', category: 'Automotive', price: 620, stock: 22, description: 'Real-time telemetry anomaly detector for ECU networks' },
  { id: 'prod-104', name: 'Enterprise WAF Appliance Rack', category: 'Infrastructure', price: 3400, stock: 3, description: 'Layer-7 stateful packet inspection & rate limiter' },
];

const INITIAL_INVOICES = [
  { id: 'inv-101', ownerId: 'usr-2', ownerUsername: 'alice', amount: 899, description: 'Purchase of Sentinel HSM Key Vault', status: 'PAID', date: '2026-10-15', sensitiveNote: 'Shipped to Alice Home Lab' },
  { id: 'inv-102', ownerId: 'usr-3', ownerUsername: 'bob', amount: 450, description: 'Purchase of Air-Gap USB Data Diode', status: 'PAID', date: '2026-10-22', sensitiveNote: 'Contractor expense approved' },
  { id: 'inv-999', ownerId: 'usr-1', ownerUsername: 'admin', amount: 145000, description: 'CONFIDENTIAL: Annual C-Suite Security Retainer & Cloud Infrastructure Keys', status: 'PENDING', date: '2026-10-28', sensitiveNote: 'AWS Master Account root access backup voucher included' },
];

const INITIAL_COMMENTS = [
  { id: 'comm-1', author: 'SecResearcher', content: 'Great hardware appliance, passes rigorous electromagnetic side-channel audits.', date: '2026-10-29' },
  { id: 'comm-2', author: 'DevOpsLead', content: 'Installed on our staging clusters without issues. Low latency.', date: '2026-10-30' },
];

class ControlledLabService {
  private securityLevel: LabSecurityLevel = 'VULNERABLE';
  private users = [...INITIAL_USERS];
  private products = [...INITIAL_PRODUCTS];
  private invoices = [...INITIAL_INVOICES];
  private comments = [...INITIAL_COMMENTS];
  private otpAttempts: Record<string, { count: number; lastAttempt: number }> = {};
  private requestLogs: LabRequestLog[] = [];
  private listeners: ((logs: LabRequestLog[]) => void)[] = [];

  public getSecurityLevel(): LabSecurityLevel {
    return this.securityLevel;
  }

  public setSecurityLevel(level: LabSecurityLevel): void {
    this.securityLevel = level;
  }

  public getLogs(): LabRequestLog[] {
    return [...this.requestLogs];
  }

  public subscribe(listener: (logs: LabRequestLog[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    const logs = this.getLogs();
    this.listeners.forEach((fn) => fn(logs));
  }

  private recordLog(log: Omit<LabRequestLog, 'id' | 'timestamp'>) {
    const fullLog: LabRequestLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
    };
    this.requestLogs.unshift(fullLog);
    if (this.requestLogs.length > 50) {
      this.requestLogs.pop();
    }
    this.notify();
    return fullLog;
  }

  /**
   * Reset the lab state
   */
  public resetLab(): void {
    this.users = [...INITIAL_USERS];
    this.products = [...INITIAL_PRODUCTS];
    this.invoices = [...INITIAL_INVOICES];
    this.comments = [...INITIAL_COMMENTS];
    this.otpAttempts = {};
    this.requestLogs = [];
    this.notify();
  }

  // ==========================================
  // LAB ENDPOINT: SQL Injection in Authentication
  // ==========================================
  public async handleLogin(usernameInput: string, passwordInput: string): Promise<{ status: number; body: Record<string, unknown>; log: LabRequestLog }> {
    const method = 'POST';
    const path = '/api/v1/auth/login';

    if (this.securityLevel === 'VULNERABLE') {
      // INSECURE: Vulnerable to SQL Injection string concatenation
      const simulatedQuery = `SELECT * FROM users WHERE username = '${usernameInput}' AND password = '${passwordInput}'`;

      // Check for classic SQL injection patterns
      const isSqlInjectionBypass =
        /'\s*OR\s*['"]?1['"]?\s*=\s*['"]?1/i.test(usernameInput) ||
        /'\s*OR\s*true/i.test(usernameInput) ||
        usernameInput.includes("' OR '") ||
        usernameInput.includes("'--");

      if (isSqlInjectionBypass) {
        // SQL injection succeeds: returns the first user (admin)
        const victim = this.users[0];
        const body = {
          success: true,
          message: 'Authentication bypass successful via SQL Injection!',
          user: { id: victim.id, username: victim.username, role: victim.role, email: victim.email },
          token: `eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.${btoa(JSON.stringify({ sub: victim.id, role: victim.role }))}.`,
          queryExecuted: simulatedQuery,
          vulnerabilityNotice: 'CRITICAL: User input directly concatenated into SQL query string without prepared statement parameterized bindings.',
        };

        const log = this.recordLog({
          method,
          path,
          requestHeaders: { 'Content-Type': 'application/json' },
          requestBody: { username: usernameInput, password: '***' },
          status: 200,
          statusText: 'OK (SQLi Bypass Triggered)',
          responseHeaders: { 'Content-Type': 'application/json' },
          responseBody: body,
          securityLevel: this.securityLevel,
          simulatedQuery,
          defenseNotes: 'VULNERABLE: Direct string interpolation evaluated raw logical OR expression into DB execution engine.',
        });

        return { status: 200, body, log };
      }

      // Normal authentication attempt against vulnerable system
      const user = this.users.find((u) => u.username === usernameInput && u.passwordPlain === passwordInput);
      if (user) {
        const body = { success: true, user: { id: user.id, username: user.username, role: user.role } };
        const log = this.recordLog({
          method,
          path,
          requestHeaders: { 'Content-Type': 'application/json' },
          requestBody: { username: usernameInput, password: '***' },
          status: 200,
          statusText: 'OK',
          responseHeaders: { 'Content-Type': 'application/json' },
          responseBody: body,
          securityLevel: this.securityLevel,
          simulatedQuery,
        });
        return { status: 200, body, log };
      }

      const body = { success: false, error: 'Invalid credentials', queryExecuted: simulatedQuery };
      const log = this.recordLog({
        method,
        path,
        requestHeaders: { 'Content-Type': 'application/json' },
        requestBody: { username: usernameInput, password: '***' },
        status: 401,
        statusText: 'Unauthorized',
        responseHeaders: { 'Content-Type': 'application/json' },
        responseBody: body,
        securityLevel: this.securityLevel,
        simulatedQuery,
      });
      return { status: 401, body, log };
    } else {
      // HARDENED: Parameterized Query / Prepared Statement
      const simulatedQuery = 'SELECT id, username, password_hash, salt, role FROM users WHERE username = ? [BOUND: ? = "' + usernameInput + '"]';

      // Parameterized query treats input strictly as literal string literal, not executable SQL
      const user = this.users.find((u) => u.username === usernameInput);
      const isPasswordMatch = user && user.passwordPlain === passwordInput;

      if (user && isPasswordMatch) {
        const body = {
          success: true,
          user: { id: user.id, username: user.username, role: user.role },
          message: 'Authenticated securely using Prepared Statements and secure hash verification.',
        };
        const log = this.recordLog({
          method,
          path,
          requestHeaders: { 'Content-Type': 'application/json' },
          requestBody: { username: usernameInput, password: '***' },
          status: 200,
          statusText: 'OK',
          responseHeaders: { 'Content-Type': 'application/json', 'Set-Cookie': '__Host-Session=secure; Secure; HttpOnly; SameSite=Strict' },
          responseBody: body,
          securityLevel: this.securityLevel,
          simulatedQuery,
          defenseNotes: 'HARDENED: Parameterized input binding disarmed SQL syntax characters (\', --, OR).',
        });
        return { status: 200, body, log };
      }

      const body = {
        success: false,
        error: 'Invalid username or password',
        defenseNote: 'Input sanitized and bound as string literal. Injection payload was treated as literal text and failed matching.',
      };
      const log = this.recordLog({
        method,
        path,
        requestHeaders: { 'Content-Type': 'application/json' },
        requestBody: { username: usernameInput, password: '***' },
        status: 401,
        statusText: 'Unauthorized',
        responseHeaders: { 'Content-Type': 'application/json' },
        responseBody: body,
        securityLevel: this.securityLevel,
        simulatedQuery,
        defenseNotes: 'HARDENED: Query parameterization prevented syntax alteration. Injection string failed literal comparison.',
      });
      return { status: 401, body, log };
    }
  }

  // ==========================================
  // LAB ENDPOINT: SQL Injection in Product Search
  // ==========================================
  public async handleProductSearch(query: string): Promise<{ status: number; body: Record<string, unknown>; log: LabRequestLog }> {
    const method = 'GET';
    const path = `/api/v1/products/search?q=${encodeURIComponent(query)}`;

    if (this.securityLevel === 'VULNERABLE') {
      const simulatedQuery = `SELECT id, name, category, price, stock FROM products WHERE name LIKE '%${query}%'`;

      // Check for UNION injection
      if (/UNION\s+SELECT/i.test(query)) {
        // Leaking user database tables via UNION SELECT
        const dumpedUsers = this.users.map((u) => ({
          id: u.id,
          name: `LEAKED: User ${u.username}`,
          category: `ROLE: ${u.role}`,
          price: 0,
          stock: 1,
          description: `EXFILTRATED PASSWORD: ${u.passwordPlain} | HASH: ${u.passwordHash}`,
        }));

        const body = {
          success: true,
          count: dumpedUsers.length,
          data: dumpedUsers,
          queryExecuted: simulatedQuery,
          warning: 'VULNERABILITY DETECTED: UNION-based SQL Injection leaked entire user authentication table!',
        };

        const log = this.recordLog({
          method,
          path,
          requestHeaders: { Accept: 'application/json' },
          status: 200,
          statusText: 'OK (SQLi Union Leak)',
          responseHeaders: { 'Content-Type': 'application/json' },
          responseBody: body,
          securityLevel: this.securityLevel,
          simulatedQuery,
          defenseNotes: 'VULNERABLE: Direct concatenation of query parameter allowed attacker to inject UNION operator.',
        });

        return { status: 200, body, log };
      }

      // Check for wildcard or normal search
      const results = this.products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || query.includes("1'='1") || query.includes("' OR '1'='1"));
      const body = { success: true, count: results.length, data: results, queryExecuted: simulatedQuery };
      const log = this.recordLog({
        method,
        path,
        requestHeaders: { Accept: 'application/json' },
        status: 200,
        statusText: 'OK',
        responseHeaders: { 'Content-Type': 'application/json' },
        responseBody: body,
        securityLevel: this.securityLevel,
        simulatedQuery,
      });
      return { status: 200, body, log };
    } else {
      // HARDENED: Parameterized query with strict type and character sanitation
      const sanitized = query.replace(/[%_'"\\]/g, '');
      const simulatedQuery = `SELECT id, name, category, price, stock FROM products WHERE name ILIKE $1 [BOUND: $1 = "%${sanitized}%"]`;
      const results = this.products.filter((p) => p.name.toLowerCase().includes(sanitized.toLowerCase()));

      const body = {
        success: true,
        count: results.length,
        data: results,
        remediation: 'Parameterized query with ILIKE bindings and special character stripping applied.',
      };

      const log = this.recordLog({
        method,
        path,
        requestHeaders: { Accept: 'application/json' },
        status: 200,
        statusText: 'OK',
        responseHeaders: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' },
        responseBody: body,
        securityLevel: this.securityLevel,
        simulatedQuery,
        defenseNotes: 'HARDENED: Parameter binding treated injection attempt as literal search characters.',
      });

      return { status: 200, body, log };
    }
  }

  // ==========================================
  // LAB ENDPOINT: Stored & Reflected XSS
  // ==========================================
  public async handleAddComment(author: string, content: string): Promise<{ status: number; body: Record<string, unknown>; log: LabRequestLog }> {
    const method = 'POST';
    const path = '/api/v1/comments';

    if (this.securityLevel === 'VULNERABLE') {
      // INSECURE: Stores raw unsanitized HTML/JS
      const newComment = {
        id: `comm-${Date.now()}`,
        author: author || 'Anonymous',
        content: content,
        date: new Date().toISOString().split('T')[0],
      };
      this.comments.push(newComment);

      const hasScriptTags = /<script|onload=|onerror=|javascript:/i.test(content);
      const body = {
        success: true,
        comment: newComment,
        warning: hasScriptTags ? 'POTENTIAL STORED XSS: Payload stored without sanitization. Will execute in client browser if rendered with innerHTML.' : undefined,
      };

      const log = this.recordLog({
        method,
        path,
        requestHeaders: { 'Content-Type': 'application/json' },
        requestBody: { author, content },
        status: 201,
        statusText: 'Created (Raw Stored)',
        responseHeaders: { 'Content-Type': 'application/json' },
        responseBody: body,
        securityLevel: this.securityLevel,
        defenseNotes: 'VULNERABLE: No HTML entity encoding or DOMPurify applied before storing or returning data.',
      });

      return { status: 201, body, log };
    } else {
      // HARDENED: Strict HTML entity encoding & DOM sanitization
      const encodeHtml = (str: string) =>
        str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');

      const sanitizedContent = encodeHtml(content);
      const sanitizedAuthor = encodeHtml(author || 'Anonymous');

      const newComment = {
        id: `comm-${Date.now()}`,
        author: sanitizedAuthor,
        content: sanitizedContent,
        date: new Date().toISOString().split('T')[0],
      };
      this.comments.push(newComment);

      const body = {
        success: true,
        comment: newComment,
        defenseNotice: 'All HTML tags neutralized via contextual entity encoding and Content Security Policy (script-src "self").',
      };

      const log = this.recordLog({
        method,
        path,
        requestHeaders: { 'Content-Type': 'application/json' },
        requestBody: { author, content },
        status: 201,
        statusText: 'Created (Sanitized)',
        responseHeaders: {
          'Content-Type': 'application/json',
          'Content-Security-Policy': "default-src 'self'; script-src 'self'",
          'X-XSS-Protection': '1; mode=block',
        },
        responseBody: body,
        securityLevel: this.securityLevel,
        defenseNotes: 'HARDENED: Neutralized tag characters (<, >, \', ") into inert HTML entities.',
      });

      return { status: 201, body, log };
    }
  }

  public getComments(): typeof INITIAL_COMMENTS {
    return [...this.comments];
  }

  // ==========================================
  // LAB ENDPOINT: Broken Object Level Auth (BOLA / IDOR)
  // ==========================================
  public async handleGetInvoice(
    invoiceId: string,
    currentUserId: string = 'usr-2' // Default simulated caller is Alice
  ): Promise<{ status: number; body: Record<string, unknown>; log: LabRequestLog }> {
    const method = 'GET';
    const path = `/api/v1/invoices/${invoiceId}`;
    const invoice = this.invoices.find((inv) => inv.id === invoiceId);

    if (this.securityLevel === 'VULNERABLE') {
      // INSECURE: Direct object reference without verifying ownership!
      if (!invoice) {
        const body = { success: false, error: 'Invoice not found' };
        const log = this.recordLog({
          method,
          path,
          requestHeaders: { Authorization: `Bearer session_token_for_${currentUserId}` },
          status: 404,
          statusText: 'Not Found',
          responseHeaders: { 'Content-Type': 'application/json' },
          responseBody: body,
          securityLevel: this.securityLevel,
        });
        return { status: 404, body, log };
      }

      // Check if user is accessing someone else's invoice
      const isIdorViolation = invoice.ownerId !== currentUserId;
      const body = {
        success: true,
        invoice,
        idorAlert: isIdorViolation
          ? `BOLA / IDOR VULNERABILITY CONFIRMED: User '${currentUserId}' successfully accessed confidential invoice belonging to '${invoice.ownerUsername}' (${invoice.ownerId}) without authorization!`
          : undefined,
      };

      const log = this.recordLog({
        method,
        path,
        requestHeaders: { Authorization: `Bearer session_token_for_${currentUserId}` },
        status: 200,
        statusText: isIdorViolation ? '200 OK (IDOR Data Leak)' : '200 OK',
        responseHeaders: { 'Content-Type': 'application/json' },
        responseBody: body,
        securityLevel: this.securityLevel,
        defenseNotes: isIdorViolation
          ? 'VULNERABLE: Server queried invoice by ID without comparing record owner against authenticated session user.'
          : 'Normal access (caller owns this record).',
      });

      return { status: 200, body, log };
    } else {
      // HARDENED: Strict Object-Level Authorization
      if (!invoice) {
        const body = { success: false, error: 'Invoice not found' };
        const log = this.recordLog({
          method,
          path,
          requestHeaders: { Authorization: `Bearer session_token_for_${currentUserId}` },
          status: 404,
          statusText: 'Not Found',
          responseHeaders: { 'Content-Type': 'application/json' },
          responseBody: body,
          securityLevel: this.securityLevel,
        });
        return { status: 404, body, log };
      }

      const currentUser = this.users.find((u) => u.id === currentUserId);
      const isOwner = invoice.ownerId === currentUserId;
      const isAdmin = currentUser?.role === 'admin';

      if (!isOwner && !isAdmin) {
        // Enforce 403 Forbidden
        const body = {
          success: false,
          error: 'Forbidden (403): You do not possess authorization rights to access this invoice.',
          defenseNote: 'Access control policy enforced: Resource ownerId matches session userId verification.',
        };

        const log = this.recordLog({
          method,
          path,
          requestHeaders: { Authorization: `Bearer session_token_for_${currentUserId}` },
          status: 403,
          statusText: 'Forbidden (BOLA Defense)',
          responseHeaders: { 'Content-Type': 'application/json' },
          responseBody: body,
          securityLevel: this.securityLevel,
          defenseNotes: 'HARDENED: Request aborted because req.user.id !== invoice.ownerId. Unauthorized access blocked.',
        });

        return { status: 403, body, log };
      }

      const body = { success: true, invoice };
      const log = this.recordLog({
        method,
        path,
        requestHeaders: { Authorization: `Bearer session_token_for_${currentUserId}` },
        status: 200,
        statusText: 'OK',
        responseHeaders: { 'Content-Type': 'application/json' },
        responseBody: body,
        securityLevel: this.securityLevel,
        defenseNotes: 'HARDENED: Authorization check verified user owns this resource.',
      });

      return { status: 200, body, log };
    }
  }

  // ==========================================
  // LAB ENDPOINT: Server-Side Request Forgery (SSRF)
  // ==========================================
  public async handleFetchUrl(targetUrl: string): Promise<{ status: number; body: Record<string, unknown>; log: LabRequestLog }> {
    const method = 'POST';
    const path = '/api/v1/fetch-url';

    if (this.securityLevel === 'VULNERABLE') {
      // INSECURE: Blindly fetches arbitrary internal IP/URL
      let simulatedResponseData = '';

      if (targetUrl.includes('127.0.0.1') || targetUrl.includes('localhost')) {
        simulatedResponseData = JSON.stringify({
          service: 'Internal Redis Cache & Admin Port',
          masterKey: 'sec_live_998a44b1c20e49',
          internalConfig: { debug: true, host: '127.0.0.1', cluster: 'internal-corp-zone' },
        });
      } else if (targetUrl.includes('169.254.169.254')) {
        simulatedResponseData = JSON.stringify({
          Code: 'Success',
          LastUpdated: '2026-10-31T12:00:00Z',
          Type: 'AWS-HMAC',
          AccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          SecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          Token: 'AQoDYXdzEJr1...AWS_INTERNAL_STS_TOKEN',
        });
      } else {
        simulatedResponseData = `Simulated HTTP GET 200 OK from ${targetUrl} [Length: 1024 bytes]`;
      }

      const isInternalAccess =
        targetUrl.includes('127.0.0.1') ||
        targetUrl.includes('localhost') ||
        targetUrl.includes('169.254.169.254') ||
        targetUrl.includes('10.0.') ||
        targetUrl.includes('192.168.');

      const body = {
        success: true,
        fetchedUrl: targetUrl,
        payloadExtracted: simulatedResponseData,
        ssrfWarning: isInternalAccess
          ? 'SSRF VULNERABILITY EXPLOITED: Server accessed internal network perimeter and leaked private cloud metadata / keys!'
          : undefined,
      };

      const log = this.recordLog({
        method,
        path,
        requestHeaders: { 'Content-Type': 'application/json' },
        requestBody: { url: targetUrl },
        status: 200,
        statusText: isInternalAccess ? '200 OK (SSRF Internal Breach)' : '200 OK',
        responseHeaders: { 'Content-Type': 'application/json' },
        responseBody: body,
        securityLevel: this.securityLevel,
        defenseNotes: isInternalAccess
          ? 'VULNERABLE: No private IP / link-local metadata address filtering performed.'
          : 'External fetch simulation.',
      });

      return { status: 200, body, log };
    } else {
      // HARDENED: Strict Whitelist + Private IP Blacklist + Protocol Check
      const isPrivateOrLoopback =
        targetUrl.includes('127.0.0.1') ||
        targetUrl.includes('localhost') ||
        targetUrl.includes('169.254.') ||
        targetUrl.includes('10.') ||
        targetUrl.includes('192.168.') ||
        targetUrl.includes('0.0.0.0') ||
        targetUrl.startsWith('file://') ||
        targetUrl.startsWith('gopher://');

      const isHttps = targetUrl.startsWith('https://');

      if (isPrivateOrLoopback || !isHttps) {
        const body = {
          success: false,
          error: 'Security Policy Violation: Target URL resolves to a forbidden private IP subnet, loopback interface, or non-HTTPS protocol.',
          blockedAddress: targetUrl,
          defenseNote: 'CIDR Filter rejected RFC 1918 private subnets and AWS metadata address (169.254.169.254).',
        };

        const log = this.recordLog({
          method,
          path,
          requestHeaders: { 'Content-Type': 'application/json' },
          requestBody: { url: targetUrl },
          status: 400,
          statusText: '400 Bad Request (SSRF Filter Blocked)',
          responseHeaders: { 'Content-Type': 'application/json' },
          responseBody: body,
          securityLevel: this.securityLevel,
          defenseNotes: 'HARDENED: Pre-request DNS validation and loopback filter aborted outbound request.',
        });

        return { status: 400, body, log };
      }

      const body = {
        success: true,
        message: `Validated external URL: ${targetUrl}`,
        data: 'Fetched 1.2 KB public verified asset safely.',
      };

      const log = this.recordLog({
        method,
        path,
        requestHeaders: { 'Content-Type': 'application/json' },
        requestBody: { url: targetUrl },
        status: 200,
        statusText: '200 OK',
        responseHeaders: { 'Content-Type': 'application/json' },
        responseBody: body,
        securityLevel: this.securityLevel,
        defenseNotes: 'HARDENED: Outbound URL validated against HTTPS whitelist schema.',
      });

      return { status: 200, body, log };
    }
  }

  // ==========================================
  // LAB ENDPOINT: Rate Limiting & Brute Force
  // ==========================================
  public async handleVerifyOtp(
    clientIp: string,
    code: string
  ): Promise<{ status: number; body: Record<string, unknown>; log: LabRequestLog }> {
    const method = 'POST';
    const path = '/api/v1/otp/verify';
    const CORRECT_OTP = '849201';

    if (this.securityLevel === 'VULNERABLE') {
      // INSECURE: No rate limiting
      const isCorrect = code === CORRECT_OTP;
      const body = {
        success: isCorrect,
        message: isCorrect ? 'OTP Verified Successfully!' : 'Incorrect OTP. Try again (no rate limit active).',
        attemptsTracked: 'NONE - Unlimited attempts allowed',
      };

      const log = this.recordLog({
        method,
        path,
        requestHeaders: { 'X-Forwarded-For': clientIp },
        requestBody: { code },
        status: isCorrect ? 200 : 401,
        statusText: isCorrect ? 'OK' : 'Unauthorized',
        responseHeaders: { 'Content-Type': 'application/json' },
        responseBody: body,
        securityLevel: this.securityLevel,
        defenseNotes: 'VULNERABLE: No token bucket or sliding-window rate limiter. Vulnerable to automated dictionary/brute-force attacks.',
      });

      return { status: isCorrect ? 200 : 401, body, log };
    } else {
      // HARDENED: Sliding-window rate limiting (Max 3 failed attempts in 60s)
      const now = Date.now();
      const record = this.otpAttempts[clientIp] || { count: 0, lastAttempt: now };

      if (record.count >= 4 && now - record.lastAttempt < 60000) {
        const retryAfterSeconds = Math.ceil((60000 - (now - record.lastAttempt)) / 1000);
        const body = {
          success: false,
          error: 'HTTP 429 Too Many Requests: Rate limit exceeded for this IP.',
          retryAfter: `${retryAfterSeconds}s`,
          defensePolicy: 'Token Bucket Rate Limiter: Max 3 failed attempts per 60 seconds.',
        };

        const log = this.recordLog({
          method,
          path,
          requestHeaders: { 'X-Forwarded-For': clientIp },
          requestBody: { code },
          status: 429,
          statusText: 'Too Many Requests (Rate Limited)',
          responseHeaders: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfterSeconds),
            'X-RateLimit-Limit': '3',
            'X-RateLimit-Remaining': '0',
          },
          responseBody: body,
          securityLevel: this.securityLevel,
          defenseNotes: 'HARDENED: Request throttled via token bucket algorithm. HTTP 429 returned.',
        });

        return { status: 429, body, log };
      }

      const isCorrect = code === CORRECT_OTP;
      if (!isCorrect) {
        record.count += 1;
        record.lastAttempt = now;
        this.otpAttempts[clientIp] = record;
      } else {
        // Reset on success
        delete this.otpAttempts[clientIp];
      }

      const remaining = Math.max(0, 3 - record.count);
      const body = {
        success: isCorrect,
        message: isCorrect ? 'OTP Verified Successfully!' : `Incorrect OTP. Attempts remaining before temporary block: ${remaining}`,
        remainingAttempts: remaining,
      };

      const log = this.recordLog({
        method,
        path,
        requestHeaders: { 'X-Forwarded-For': clientIp },
        requestBody: { code },
        status: isCorrect ? 200 : 401,
        statusText: isCorrect ? 'OK' : 'Unauthorized',
        responseHeaders: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '3',
          'X-RateLimit-Remaining': String(remaining),
        },
        responseBody: body,
        securityLevel: this.securityLevel,
        defenseNotes: `HARDENED: Attempt tracked in sliding window (${record.count}/3).`,
      });

      return { status: isCorrect ? 200 : 401, body, log };
    }
  }

  // ==========================================
  // LAB ENDPOINT: Security Headers & CORS Inspection
  // ==========================================
  public getSecurityHeadersAudit(): {
    headers: Record<string, string>;
    audit: { name: string; present: boolean; value?: string; status: 'PASS' | 'FAIL' | 'WARN'; recommendation: string }[];
  } {
    if (this.securityLevel === 'VULNERABLE') {
      const headers = {
        'Server': 'Apache/2.4.41 (Ubuntu)',
        'X-Powered-By': 'Express/4.16.1',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'text/html; charset=UTF-8',
      };

      const audit = [
        { name: 'Strict-Transport-Security (HSTS)', present: false, status: 'FAIL' as const, recommendation: 'Add max-age=31536000; includeSubDomains; preload' },
        { name: 'Content-Security-Policy (CSP)', present: false, status: 'FAIL' as const, recommendation: 'Define strict CSP directive to prevent XSS script injection' },
        { name: 'X-Frame-Options', present: false, status: 'FAIL' as const, recommendation: 'Set to DENY or SAMEORIGIN to prevent Clickjacking iframe embedding' },
        { name: 'X-Content-Type-Options', present: false, status: 'FAIL' as const, recommendation: 'Set to "nosniff" to block MIME-type confusion attacks' },
        { name: 'Referrer-Policy', present: false, status: 'WARN' as const, recommendation: 'Set to strict-origin-when-cross-origin' },
        { name: 'Access-Control-Allow-Origin', present: true, value: '*', status: 'FAIL' as const, recommendation: 'CORS wildcard (*) with credentials allows cross-site data theft' },
        { name: 'X-Powered-By / Server Leakage', present: true, value: headers['X-Powered-By'], status: 'FAIL' as const, recommendation: 'Suppress technology fingerprint headers (app.disable("x-powered-by"))' },
      ];

      return { headers, audit };
    } else {
      const headers = {
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';",
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
        'Access-Control-Allow-Origin': 'https://sentinellab.local',
        'Vary': 'Origin',
      };

      const audit = [
        { name: 'Strict-Transport-Security (HSTS)', present: true, value: headers['Strict-Transport-Security'], status: 'PASS' as const, recommendation: 'Configured with 1-year duration and includeSubDomains' },
        { name: 'Content-Security-Policy (CSP)', present: true, value: headers['Content-Security-Policy'], status: 'PASS' as const, recommendation: 'Strict CSP restricts scripts and disallows inline evaluation' },
        { name: 'X-Frame-Options', present: true, value: headers['X-Frame-Options'], status: 'PASS' as const, recommendation: 'Configured to DENY iframe rendering' },
        { name: 'X-Content-Type-Options', present: true, value: headers['X-Content-Type-Options'], status: 'PASS' as const, recommendation: 'Configured to nosniff' },
        { name: 'Referrer-Policy', present: true, value: headers['Referrer-Policy'], status: 'PASS' as const, recommendation: 'Configured to strict-origin-when-cross-origin' },
        { name: 'Permissions-Policy', present: true, value: headers['Permissions-Policy'], status: 'PASS' as const, recommendation: 'Restricts hardware sensors' },
        { name: 'CORS Configuration', present: true, value: headers['Access-Control-Allow-Origin'], status: 'PASS' as const, recommendation: 'Restricted to explicit origin, wildcard removed' },
        { name: 'Fingerprinting Suppression', present: true, status: 'PASS' as const, recommendation: 'X-Powered-By and Server banner suppressed' },
      ];

      return { headers, audit };
    }
  }
}

export const controlledLab = new ControlledLabService();
