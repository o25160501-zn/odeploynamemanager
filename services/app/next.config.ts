import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';

function readJson(path: string) {
  const resolved = resolve(/*turbopackIgnore: true*/ path);
  if (!existsSync(resolved)) return null;
  return JSON.parse(readFileSync(resolved, 'utf8')) as Record<string, string>;
}

function readBase64Json(value?: string) {
  if (!value) return null;
  return JSON.parse(Buffer.from(value, 'base64').toString('utf8')) as Record<string, string>;
}

const serviceAccount = readBase64Json(process.env.DPDNS_CLOUDFLARED_MANAGER_FIREBASE_SERVICE_ACCOUNT_BASE64)
  || readJson(process.env.DPDNS_CLOUDFLARED_MANAGER_FIREBASE_SERVICE_ACCOUNT_PATH || '-gitignore/domain-register-app-demo-firebase-adminsdk-fbsvc-698c709985.json');
const configApp = readBase64Json(process.env.DPDNS_CLOUDFLARED_MANAGER_FIREBASE_CONFIG_APP_BASE64)
  || readJson(process.env.DPDNS_CLOUDFLARED_MANAGER_FIREBASE_CONFIG_APP_PATH || '-gitignore/firebaseConfig-app.json');
const projectId = process.env.DPDNS_CLOUDFLARED_MANAGER_FIREBASE_PROJECT_ID || configApp?.projectId || serviceAccount?.project_id;

const env = {
  DPDNS_CLOUDFLARED_MANAGER_FIREBASE_API_KEY: process.env.DPDNS_CLOUDFLARED_MANAGER_FIREBASE_API_KEY || configApp?.apiKey || '',
  DPDNS_CLOUDFLARED_MANAGER_FIREBASE_AUTH_DOMAIN: process.env.DPDNS_CLOUDFLARED_MANAGER_FIREBASE_AUTH_DOMAIN || configApp?.authDomain || (projectId ? `${projectId}.firebaseapp.com` : ''),
  DPDNS_CLOUDFLARED_MANAGER_FIREBASE_PROJECT_ID: projectId || '',
  DPDNS_CLOUDFLARED_MANAGER_FIREBASE_DATABASE_URL: process.env.DPDNS_CLOUDFLARED_MANAGER_FIREBASE_DATABASE_URL || configApp?.databaseURL || serviceAccount?.databaseURL || '',
  DPDNS_CLOUDFLARED_MANAGER_FIREBASE_STORAGE_BUCKET: process.env.DPDNS_CLOUDFLARED_MANAGER_FIREBASE_STORAGE_BUCKET || configApp?.storageBucket || (projectId ? `${projectId}.firebasestorage.app` : ''),
  DPDNS_CLOUDFLARED_MANAGER_FIREBASE_MESSAGING_SENDER_ID: process.env.DPDNS_CLOUDFLARED_MANAGER_FIREBASE_MESSAGING_SENDER_ID || configApp?.messagingSenderId || '',
  DPDNS_CLOUDFLARED_MANAGER_FIREBASE_APP_ID: process.env.DPDNS_CLOUDFLARED_MANAGER_FIREBASE_APP_ID || configApp?.appId || '',
  DPDNS_CLOUDFLARED_MANAGER_ENCRYPT_SALT: process.env.DPDNS_CLOUDFLARED_MANAGER_ENCRYPT_SALT || serviceAccount?.secret01 || '',
  DPDNS_CLOUDFLARED_MANAGER_ALLOWED_EMAILS: process.env.DPDNS_CLOUDFLARED_MANAGER_ALLOWED_EMAILS || '',
  DPDNS_CLOUDFLARED_MANAGER_LOG_LEVEL: process.env.DPDNS_CLOUDFLARED_MANAGER_LOG_LEVEL || '',
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env,
  output: 'standalone',
};

export default nextConfig;
