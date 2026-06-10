import Dexie from 'dexie';

export const db = new Dexie('GitfolioDB');

db.version(1).stores({
  cache: 'key, data, timestamp, ttl',
  user: 'username, profile, repos, computedScores, lastSync',
  settings: 'key, value',
  premium: 'licenseKey, tier, activatedAt, expiresAt',
  contributions: 'username, date, contributionCount',
});

db.version(2).stores({
  cache: 'key, data, timestamp, ttl',
  user: 'username, profile, repos, computedScores, lastSync, leetcodeData, combinedScore, peerPercentile',
  settings: 'key, value',
  premium: 'licenseKey, tier, activatedAt, expiresAt',
  contributions: 'username, date, contributionCount',
  platforms: 'username, platform, data, timestamp',
  applications: '++id, company, role, driveType, dateApplied, stage, oaScore, notes, nextAction, nextActionDate, result',
}).upgrade(async () => {
  // Version 2: Analytics engine overhaul — stale scores must be cleared
  await db.user.clear();
  await db.cache.clear();
  console.log('Dexie upgraded to v2: cleared stale analytics data, added platforms & applications stores');
});

export async function clearAllDexieData() {
  await Promise.all([
    db.cache.clear(),
    db.user.clear(),
    db.settings.clear(),
    db.premium.clear(),
    db.platforms.clear(),
    db.applications.clear(),
  ]);
}
