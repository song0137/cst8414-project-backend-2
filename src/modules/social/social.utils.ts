export type SocialShareRow = {
  id: number;
  platform: string;
  privacy_setting: string;
  shared_at: string;
  outfit_payload: string;
};

type SocialPayload = {
  source?: string;
  title?: string;
  items?: Array<{ id: number; name: string }>;
};

export function buildShareHistoryEntry(row: SocialShareRow) {
  let payload: SocialPayload = {};

  try {
    payload = JSON.parse(row.outfit_payload) as SocialPayload;
  } catch (_error) {
    payload = {};
  }

  const items = Array.isArray(payload.items) ? payload.items : [];

  return {
    id: row.id,
    platform: row.platform,
    privacySetting: row.privacy_setting,
    sharedAt: row.shared_at,
    title: payload.title || 'Shared outfit',
    source: payload.source || 'wardrobe',
    itemCount: items.length,
    itemNames: items.map((item) => item.name),
  };
}
