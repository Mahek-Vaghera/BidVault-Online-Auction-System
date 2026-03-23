import { cacheDelete, cacheDeleteByPrefix } from "./cache.service.js";

export const normalizeAuctionStatusCacheKey = (status) => {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "ENDED") return "COMPLETED";
  return normalized || "ALL";
};

export const buildAuctionListCachePrefix = (status) =>
  `cache:auctions:list:${normalizeAuctionStatusCacheKey(status || "ALL")}`;

export const buildProfileRecentActivitiesCacheKey = (userId, skip, limit) =>
  `cache:profile:activity:${userId}:skip:${skip}:limit:${limit}`;

export const buildProfileRecentActivitiesCachePrefix = (userId) =>
  `cache:profile:activity:${userId}:`;

export const buildProfileMyAuctionsCacheKey = (userId) =>
  `cache:profile:my-auctions:${userId}`;

export const buildProfileSavedAuctionsCacheKey = (userId) =>
  `cache:profile:saved-auctions:${userId}`;

export const buildProfileWinningAuctionsCacheKey = (userId) =>
  `cache:profile:winning-auctions:${userId}`;

export const buildProfileStatsCacheKey = (userId) =>
  `cache:profile:stats:${userId}`;

export const invalidateAuctionListCachesByStatuses = async (statuses = []) => {
  const prefixes = new Set([
    buildAuctionListCachePrefix("ALL")
  ]);

  for (const status of statuses) {
    if (!status) continue;

    prefixes.add(
      buildAuctionListCachePrefix(status)
    );
  }

  await Promise.all(
    Array.from(prefixes).map(prefix =>
      cacheDeleteByPrefix(prefix)
    )
  );
};

export const invalidateAdminCacheGroups = async () => {
  await Promise.all([
    cacheDeleteByPrefix("cache:admin:overview"),
    cacheDeleteByPrefix("cache:admin:auctions:"),
    cacheDeleteByPrefix("cache:admin:payments"),
    cacheDeleteByPrefix("cache:admin:deliveries"),
  ]);
};

export const invalidateSavedAuctionsCaches = async () => {
  await cacheDeleteByPrefix("cache:profile:saved-auctions:");
};

export const invalidateProfileCachesForUser = async (
  userId,
  {
    includeRecentActivities = true,
    includeMyAuctions = true,
    includeSavedAuctions = true,
    includeWinningAuctions = true,
    includeStats = true,
    includeLegacyMyAuctions = true,
  } = {}
) => {
  if (!userId) return;

  const tasks = [];

  if (includeRecentActivities) {
    tasks.push(cacheDeleteByPrefix(buildProfileRecentActivitiesCachePrefix(userId)));
  }
  if (includeMyAuctions) {
    tasks.push(cacheDelete(buildProfileMyAuctionsCacheKey(userId)));
  }
  if (includeSavedAuctions) {
    tasks.push(cacheDelete(buildProfileSavedAuctionsCacheKey(userId)));
  }
  if (includeWinningAuctions) {
    tasks.push(cacheDelete(buildProfileWinningAuctionsCacheKey(userId)));
  }
  if (includeStats) {
    tasks.push(cacheDelete(buildProfileStatsCacheKey(userId)));
  }
  if (includeLegacyMyAuctions) {
    tasks.push(cacheDeleteByPrefix(`cache:my-auctions:${userId}`));
  }

  await Promise.all(tasks);
};

export const invalidateAuctionMutationCaches = async ({
  auctionId,
  previousStatus,
  nextStatus,
  creatorId,
  affectedUserIds = [],
  clearSavedAuctions = false,
  clearAdminCaches = true,
} = {}) => {
  const tasks = [
    invalidateAuctionListCachesByStatuses([previousStatus, nextStatus]),
  ];

  if (auctionId) {
    tasks.push(cacheDeleteByPrefix(`cache:auction:${auctionId}:`));
  }

  if (clearAdminCaches) {
    tasks.push(invalidateAdminCacheGroups());
  }

  if (clearSavedAuctions) {
    tasks.push(invalidateSavedAuctionsCaches());
  }

  const profileUsers = new Set([
    ...(creatorId ? [String(creatorId)] : []),
    ...affectedUserIds.filter(Boolean).map((id) => String(id)),
  ]);

  for (const userId of profileUsers) {
    tasks.push(invalidateProfileCachesForUser(userId, { includeSavedAuctions: false }));
  }

  await Promise.all(tasks);
};