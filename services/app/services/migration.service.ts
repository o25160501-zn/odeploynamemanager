import { db } from '@/lib/firebase';
import { get, ref as dbRef, set } from 'firebase/database';
import { decrypt, encrypt } from '@/lib/crypto';
import { SHARED_USER_ID } from '@/lib/constants';
import type { EncryptedCredentialAccount, DomainRecord, DiagnosticAsset } from '@/types';

export const MigrationService = {
  async migrateUserData(uid: string): Promise<void> {
    if (!uid || uid === SHARED_USER_ID) return;

    try {
      // 1. Migrate Settings & Accounts
      const userAccountsRef = dbRef(db, `users/${uid}/settings/accounts`);
      const userAccountsSnap = await get(userAccountsRef);
      const userAccounts = userAccountsSnap.val() as Record<string, EncryptedCredentialAccount> | null;

      if (userAccounts) {
        const sharedAccountsRef = dbRef(db, `users/${SHARED_USER_ID}/settings/accounts`);
        const sharedAccountsSnap = await get(sharedAccountsRef);
        const sharedAccounts = sharedAccountsSnap.val() as Record<string, EncryptedCredentialAccount> | null;

        for (const [accId, acc] of Object.entries(userAccounts)) {
          // If this account doesn't exist in shared
          if (!sharedAccounts || !sharedAccounts[accId]) {
            // Decrypt with user's individual uid
            let dpdnsToken = '';
            let cloudflareApiKey = '';
            
            if (acc.dpdns?.token) {
              try {
                dpdnsToken = decrypt(acc.dpdns.token, uid);
              } catch (e) {
                console.error('Migration decrypt DPDNS failed', e);
              }
            }
            
            if (acc.cloudflare?.api_key) {
              try {
                cloudflareApiKey = decrypt(acc.cloudflare.api_key, uid);
              } catch (e) {
                console.error('Migration decrypt Cloudflare failed', e);
              }
            }

            // Re-encrypt with SHARED_USER_ID
            const migratedAccount: EncryptedCredentialAccount = {
              ...acc,
              dpdns: {
                ...acc.dpdns,
                token: encrypt(dpdnsToken, SHARED_USER_ID),
                verified: acc.dpdns?.verified ?? false,
                verified_at: acc.dpdns?.verified_at ?? Date.now(),
              },
              cloudflare: {
                ...acc.cloudflare,
                api_key: encrypt(cloudflareApiKey, SHARED_USER_ID),
                email: acc.cloudflare?.email || '',
                account_id: acc.cloudflare?.account_id || '',
                verified: acc.cloudflare?.verified ?? false,
                verified_at: acc.cloudflare?.verified_at ?? Date.now(),
              },
            };

            // Save to shared
            await set(dbRef(db, `users/${SHARED_USER_ID}/settings/accounts/${accId}`), migratedAccount);
          }
        }
      }

      // 2. Migrate Domains
      const userDomainsRef = dbRef(db, `users/${uid}/domains`);
      const userDomainsSnap = await get(userDomainsRef);
      const userDomains = userDomainsSnap.val() as Record<string, DomainRecord> | null;

      if (userDomains) {
        const sharedDomainsRef = dbRef(db, `users/${SHARED_USER_ID}/domains`);
        const sharedDomainsSnap = await get(sharedDomainsRef);
        const sharedDomains = sharedDomainsSnap.val() as Record<string, DomainRecord> | null;

        for (const [domKey, domain] of Object.entries(userDomains)) {
          if (!sharedDomains || !sharedDomains[domKey]) {
            await set(dbRef(db, `users/${SHARED_USER_ID}/domains/${domKey}`), domain);
          }
        }
      }

      // 3. Migrate Diagnostic Assets
      const userAssetsRef = dbRef(db, `users/${uid}/diagnostic_assets`);
      const userAssetsSnap = await get(userAssetsRef);
      const userAssets = userAssetsSnap.val() as Record<string, Record<string, DiagnosticAsset>> | null;

      if (userAssets) {
        const sharedAssetsRef = dbRef(db, `users/${SHARED_USER_ID}/diagnostic_assets`);
        const sharedAssetsSnap = await get(sharedAssetsRef);
        const sharedAssets = sharedAssetsSnap.val() as Record<string, Record<string, DiagnosticAsset>> | null;

        for (const [type, assetsMap] of Object.entries(userAssets)) {
          for (const [assetId, asset] of Object.entries(assetsMap)) {
            if (!sharedAssets || !sharedAssets[type] || !sharedAssets[type][assetId]) {
              await set(dbRef(db, `users/${SHARED_USER_ID}/diagnostic_assets/${type}/${assetId}`), asset);
            }
          }
        }
      }

      console.log(`Successfully migrated data for user: ${uid}`);
    } catch (error) {
      console.error(`Failed to migrate user data for ${uid}:`, error);
    }
  }
};
