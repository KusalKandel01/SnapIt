// Every size here maps to a real published spec for that surface.
// Add more any time — this list is intentionally the single source of truth.
export const PLATFORM_GROUPS = [
  {
    label: 'Instagram',
    sizes: [
      { id: 'ig-square', name: 'Feed post — Square', w: 1080, h: 1080 },
      { id: 'ig-portrait', name: 'Feed post — Portrait 4:5', w: 1080, h: 1350 },
      { id: 'ig-story', name: 'Story / Reel — 9:16', w: 1080, h: 1920 }
    ]
  },
  {
    label: 'Facebook',
    sizes: [
      { id: 'fb-link', name: 'Feed link post', w: 1200, h: 630 },
      { id: 'fb-square', name: 'Feed post — Square', w: 1080, h: 1080 },
      { id: 'fb-story', name: 'Story', w: 1080, h: 1920 },
      { id: 'fb-cover', name: 'Page cover photo', w: 820, h: 312 }
    ]
  },
  {
    label: 'X / Twitter',
    sizes: [
      { id: 'x-post', name: 'In-stream post 16:9', w: 1600, h: 900 },
      { id: 'x-header', name: 'Profile header', w: 1500, h: 500 }
    ]
  },
  {
    label: 'LinkedIn',
    sizes: [
      { id: 'li-post', name: 'Feed post', w: 1200, h: 627 },
      { id: 'li-cover', name: 'Cover banner', w: 1584, h: 396 }
    ]
  },
  {
    label: 'YouTube',
    sizes: [
      { id: 'yt-thumb', name: 'Video thumbnail', w: 1280, h: 720 },
      { id: 'yt-banner', name: 'Channel banner', w: 2560, h: 1440 }
    ]
  },
  {
    label: 'Pinterest',
    sizes: [{ id: 'pin-standard', name: 'Standard Pin 2:3', w: 1000, h: 1500 }]
  },
  {
    label: 'TikTok / Snapchat / WhatsApp',
    sizes: [{ id: 'tt-full', name: 'Full-screen 9:16', w: 1080, h: 1920 }]
  },
  {
    label: 'Threads',
    sizes: [
      { id: 'th-square', name: 'Square', w: 1080, h: 1080 },
      { id: 'th-portrait', name: 'Portrait 4:5', w: 1080, h: 1350 }
    ]
  }
];

export const ALL_SIZES = PLATFORM_GROUPS.flatMap(g => g.sizes);

export function findSize(id) {
  return ALL_SIZES.find(s => s.id === id) || ALL_SIZES[0];
}
