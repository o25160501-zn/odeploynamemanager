import { createSign } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  databaseURL: string;
  token_uri?: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;
let serviceAccountConfig: ServiceAccount | null = null;

function base64url(value: any) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function getServiceAccount(): ServiceAccount {
  if (serviceAccountConfig) return serviceAccountConfig;

  const PREFIX = 'DPDNS_CLOUDFLARED_MANAGER_';

  const projectId = process.env[`${PREFIX}FIREBASE_PROJECT_ID`];
  const databaseURL = process.env[`${PREFIX}FIREBASE_DATABASE_URL`];
  const clientEmail = process.env[`${PREFIX}FIREBASE_CLIENT_EMAIL`];
  const privateKey  = process.env[`${PREFIX}FIREBASE_PRIVATE_KEY`];

  if (projectId && databaseURL && clientEmail && privateKey) {
    serviceAccountConfig = {
      project_id:   projectId,
      client_email: clientEmail,
      // Support escaped newlines (stored as single-line env value)
      private_key:  privateKey.replace(/\\n/g, '\n'),
      databaseURL,
    };
    return serviceAccountConfig;
  }

  const base64Env = process.env[`${PREFIX}FIREBASE_SERVICE_ACCOUNT_BASE64`];
  if (base64Env) {
    try {
      const parsed = JSON.parse(Buffer.from(base64Env, 'base64').toString('utf8')) as ServiceAccount;
      for (const field of ['project_id', 'client_email', 'private_key', 'databaseURL'] as const) {
        if (!parsed[field]) throw new Error(`Missing field: ${field}`);
      }
      serviceAccountConfig = parsed;
      return serviceAccountConfig;
    } catch (e: any) {
      throw new Error(`Failed to parse ${PREFIX}FIREBASE_SERVICE_ACCOUNT_BASE64: ${e.message}`);
    }
  }

  const jsonEnv = process.env[`${PREFIX}FIREBASE_SERVICE_ACCOUNT_JSON`];
  if (jsonEnv) {
    try {
      const parsed = JSON.parse(jsonEnv) as ServiceAccount;
      for (const field of ['project_id', 'client_email', 'private_key', 'databaseURL'] as const) {
        if (!parsed[field]) throw new Error(`Missing field: ${field}`);
      }
      serviceAccountConfig = parsed;
      return serviceAccountConfig;
    } catch (e: any) {
      throw new Error(`Failed to parse ${PREFIX}FIREBASE_SERVICE_ACCOUNT_JSON: ${e.message}`);
    }
  }

  // ── Priority 3: file path (local dev only) ────────────────────────────────
  const envPath = process.env[`${PREFIX}FIREBASE_SERVICE_ACCOUNT_PATH`];
  if (!envPath) {
    throw new Error(
      `Firebase Admin credentials not configured. Provide ${PREFIX}FIREBASE_CLIENT_EMAIL + ${PREFIX}FIREBASE_PRIVATE_KEY, ` +
      `${PREFIX}FIREBASE_SERVICE_ACCOUNT_JSON, or ${PREFIX}FIREBASE_SERVICE_ACCOUNT_PATH.`
    );
  }

  const path = resolve(process.cwd(), /*turbopackIgnore: true*/ envPath);
  if (!existsSync(path)) {
    throw new Error(`Firebase Service Account JSON file not found at path: ${path}`);
  }

  const fileContent = readFileSync(path, 'utf8');
  const parsed = JSON.parse(fileContent) as ServiceAccount;
  
  for (const field of ['project_id', 'client_email', 'private_key', 'databaseURL']) {
    if (!parsed[field as keyof ServiceAccount]) {
      throw new Error(`Firebase service account missing field: ${field}`);
    }
  }

  serviceAccountConfig = parsed;
  return parsed;
}

export async function getAdminAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  const serviceAccount = getServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
    aud: serviceAccount.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64url(header)}.${base64url(claim)}`;
  const signature = createSign('RSA-SHA256')
    .update(unsigned)
    .sign(serviceAccount.private_key, 'base64url');
  
  const assertion = `${unsigned}.${signature}`;
  const response = await fetch(serviceAccount.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Firebase Admin token request failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };

  return data.access_token;
}

export async function firebaseAdminFetch(path: string, options: RequestInit = {}): Promise<any> {
  const serviceAccount = getServiceAccount();
  const databaseUrl = serviceAccount.databaseURL.replace(/\/$/, '');
  const token = await getAdminAccessToken();

  const url = `${databaseUrl}/${path.replace(/^\//, '')}`;
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Firebase Admin REST Call failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}
