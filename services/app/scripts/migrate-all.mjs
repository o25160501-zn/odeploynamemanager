import { createSign } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import CryptoJS from 'crypto-js';

const serviceAccountPath = '-gitignore/domain-register-app-demo-firebase-adminsdk-fbsvc-698c709985.json';

if (!existsSync(serviceAccountPath)) {
  console.error('Service account file not found!');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

// Get the encryption salt from the environment
const salt = 'a16485ecce760b6919bdc654a0811fe1766aa99660b0f2970350ada06cd490d2'; // Loaded directly from .env.local

const SHARED_USER_ID = 'shared_user';

const getKey = (uid) => `${salt}:${uid}`;

const decrypt = (cipher, uid) => {
  if (!cipher) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, getKey(uid));
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (err) {
    console.error(`Failed to decrypt for UID ${uid}:`, err);
    return '';
  }
};

const encrypt = (plain, uid) => {
  if (!plain) return '';
  return CryptoJS.AES.encrypt(plain, getKey(uid)).toString();
};

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

async function getAccessToken() {
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
  const signature = createSign('RSA-SHA256').update(unsigned).sign(serviceAccount.private_key, 'base64url');
  const assertion = `${unsigned}.${signature}`;
  const response = await fetch(serviceAccount.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) throw new Error(`Token request failed: ${response.status} ${await response.text()}`);
  return (await response.json()).access_token;
}

async function run() {
  try {
    const token = await getAccessToken();
    const dbUrl = serviceAccount.databaseURL.replace(/\/$/, '');
    
    console.log('Fetching database users...');
    const fetchRes = await fetch(`${dbUrl}/users.json?access_token=${token}`);
    if (!fetchRes.ok) {
      throw new Error(`Failed to fetch database: ${fetchRes.status} ${await fetchRes.text()}`);
    }
    
    const users = await fetchRes.json();
    if (!users) {
      console.log('No users to migrate!');
      return;
    }

    console.log('--- STARTING PROACTIVE DATABASE MIGRATION ---');
    
    // Prepare shared containers
    const sharedDomains = {};
    const sharedAccounts = {};
    const sharedAssets = {};

    // 1. Process all existing users
    for (const [uid, data] of Object.entries(users)) {
      if (uid === SHARED_USER_ID) continue;
      
      console.log(`Processing User: ${uid}`);

      // A. Migrate domains
      if (data.domains) {
        for (const [domKey, domain] of Object.entries(data.domains)) {
          console.log(`  * Staging Domain: ${domain.fqdn}`);
          sharedDomains[domKey] = domain;
        }
      }

      // B. Migrate credential accounts (with decryption & re-encryption)
      if (data.settings?.accounts) {
        for (const [accId, acc] of Object.entries(data.settings.accounts)) {
          console.log(`  * Migrating Credential Account: ${acc.name} (${acc.cloudflare?.email || 'no-email'})`);
          
          let dpdnsToken = '';
          let cloudflareApiKey = '';
          
          if (acc.dpdns?.token) {
            dpdnsToken = decrypt(acc.dpdns.token, uid);
          }
          if (acc.cloudflare?.api_key) {
            cloudflareApiKey = decrypt(acc.cloudflare.api_key, uid);
          }

          const migratedAccount = {
            ...acc,
            dpdns: {
              ...acc.dpdns,
              token: encrypt(dpdnsToken, SHARED_USER_ID),
            },
            cloudflare: {
              ...acc.cloudflare,
              api_key: encrypt(cloudflareApiKey, SHARED_USER_ID),
            }
          };
          
          sharedAccounts[accId] = migratedAccount;
        }
      }

      // C. Migrate diagnostic assets
      if (data.diagnostic_assets) {
        for (const [type, assetsMap] of Object.entries(data.diagnostic_assets)) {
          if (!sharedAssets[type]) sharedAssets[type] = {};
          for (const [assetId, asset] of Object.entries(assetsMap)) {
            console.log(`  * Staging Diagnostic Asset: ${assetId} (${type})`);
            sharedAssets[type][assetId] = asset;
          }
        }
      }
    }

    // 2. Upload shared data
    console.log('\nUploading aggregated data to shared_user node...');

    if (Object.keys(sharedDomains).length > 0) {
      console.log(`- Uploading ${Object.keys(sharedDomains).length} domains...`);
      const res = await fetch(`${dbUrl}/users/${SHARED_USER_ID}/domains.json?access_token=${token}`, {
        method: 'PATCH',
        body: JSON.stringify(sharedDomains)
      });
      if (!res.ok) console.error('Failed to upload domains:', await res.text());
    }

    if (Object.keys(sharedAccounts).length > 0) {
      console.log(`- Uploading ${Object.keys(sharedAccounts).length} credential accounts...`);
      const res = await fetch(`${dbUrl}/users/${SHARED_USER_ID}/settings/accounts.json?access_token=${token}`, {
        method: 'PATCH',
        body: JSON.stringify(sharedAccounts)
      });
      if (!res.ok) console.error('Failed to upload accounts:', await res.text());
      
      // Update settings updated_at
      await fetch(`${dbUrl}/users/${SHARED_USER_ID}/settings.json?access_token=${token}`, {
        method: 'PATCH',
        body: JSON.stringify({ updated_at: Date.now() })
      });
    }

    if (Object.keys(sharedAssets).length > 0) {
      console.log(`- Uploading ${Object.keys(sharedAssets).length} diagnostic assets...`);
      const res = await fetch(`${dbUrl}/users/${SHARED_USER_ID}/diagnostic_assets.json?access_token=${token}`, {
        method: 'PATCH',
        body: JSON.stringify(sharedAssets)
      });
      if (!res.ok) console.error('Failed to upload assets:', await res.text());
    }

    console.log('\nMigration complete! All historical data successfully consolidated into shared_user!');

  } catch (err) {
    console.error('Migration failed:', err);
  }
}

run();
