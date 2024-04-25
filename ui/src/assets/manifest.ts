import type { ManifestOptions } from 'vite-plugin-pwa';

export default {
  name: 'ORF Archiv',
  short_name: 'ORF Archiv',
  description: 'ORF News länger als 24h verfügbar',
  categories: ['news'],
  id: '/',
  start_url: '/',
  lang: 'de-AT',
  display: 'standalone',
  orientation: 'portrait',
  theme_color: '#374151',
  background_color: '#374151',
  icons: [
    {
      src: 'images/icon_any192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: 'images/icon_maskable192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: 'images/icon_any512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: 'images/icon_maskable512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
  shortcuts: [
    {
      name: 'Lesezeichen',
      url: '/bookmarks',
      icons: [
        {
          src: 'images/shortcuts/bookmarks96.png',
          sizes: '96x96',
          type: 'image/png',
          purpose: 'any',
        },
      ],
    },
    {
      name: 'Einstellungen',
      url: '/settings',
      icons: [
        {
          src: 'images/shortcuts/settings96.png',
          sizes: '96x96',
          type: 'image/png',
          purpose: 'any',
        },
      ],
    },
  ],
  screenshots: [
    {
      src: '/screenshots/mobile_news_list.png',
      sizes: '518x1120',
      type: 'image/png',
    },
    {
      src: '/screenshots/mobile_news_content_open.png',
      sizes: '518x1120',
      type: 'image/png',
    },
    {
      src: '/screenshots/mobile_bookmarks_content_open.png',
      sizes: '518x1120',
      type: 'image/png',
    },
    {
      src: '/screenshots/mobile_settings.png',
      sizes: '518x1120',
      type: 'image/png',
    },
  ],
} satisfies Partial<ManifestOptions>;
