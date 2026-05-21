import { createSign } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

const serviceAccountPath = '-gitignore/domain-register-app-demo-firebase-adminsdk-fbsvc-698c709985.json';

if (!existsSync(serviceAccountPath)) {
  console.error('Service account file not found!');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

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
    const url = `${dbUrl}/users.json?access_token=${token}`;
    
    console.log('Fetching database users from:', dbUrl);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch database: ${res.status} ${await res.text()}`);
    }
    
    const users = await res.json();
    console.log('--- DATABASE USERS INSPECTION ---');
    if (!users) {
      console.log('No users found in database!');
      return;
    }

    for (const [uid, data] of Object.entries(users)) {
      console.log(`\n---------------------------------`);
      console.log(`User ID (UID): ${uid}`);
      if (uid === 'shared_user') {
        console.log('*** SHARED USER NODE ***');
      }
      
      const domains = data.domains ? Object.keys(data.domains) : [];
      const accounts = data.settings?.accounts ? Object.keys(data.settings.accounts) : [];
      const assets = data.diagnostic_assets ? Object.keys(data.diagnostic_assets) : [];
      
      console.log(`- Domains registered: ${domains.length} (${domains.join(', ') || 'none'})`);
      console.log(`- Credential Accounts: ${accounts.length} (${accounts.join(', ') || 'none'})`);
      console.log(`- Diagnostic Assets Types: ${assets.length} (${assets.join(', ') || 'none'})`);
      
      if (data.settings?.accounts) {
        console.log('Credential details:');
        for (const [accId, acc] of Object.entries(data.settings.accounts)) {
          console.log(`  * Account ID: ${accId}, Name: ${acc.name}`);
          console.log(`    Cloudflare Email: ${acc.cloudflare?.email || 'N/A'}`);
          console.log(`    DPDNS Token (Encrypted): ${acc.dpdns?.token ? 'Present' : 'N/A'}`);
          console.log(`    Cloudflare Key (Encrypted): ${acc.cloudflare?.api_key ? 'Present' : 'N/A'}`);
        }
      }
    }
  } catch (err) {
    console.error('Error running script:', err);
  }
}

run();
