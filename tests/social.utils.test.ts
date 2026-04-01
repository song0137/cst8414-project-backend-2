import { buildShareHistoryEntry } from '../src/modules/social/social.utils';

describe('buildShareHistoryEntry', () => {
  it('turns a stored share row into a user-facing share summary', () => {
    const summary = buildShareHistoryEntry({
      id: 7,
      platform: 'Instagram',
      privacy_setting: 'friends',
      shared_at: '2026-03-31T12:00:00.000Z',
      outfit_payload: JSON.stringify({
        source: 'wardrobe',
        title: 'Weekend Layers',
        items: [
          { id: 1, name: 'Denim Jacket' },
          { id: 2, name: 'White Tee' },
          { id: 3, name: 'Cargo Pants' },
        ],
      }),
    });

    expect(summary.platform).toBe('Instagram');
    expect(summary.privacySetting).toBe('friends');
    expect(summary.title).toBe('Weekend Layers');
    expect(summary.itemCount).toBe(3);
    expect(summary.itemNames).toContain('Denim Jacket');
  });
});
