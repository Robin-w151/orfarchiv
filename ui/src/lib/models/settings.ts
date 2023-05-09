export interface Settings {
  fetchReadMoreContent: boolean;
  checkNewsUpdates: boolean;
  forceReducedMotion: boolean;
  sources: Array<string>;
}

export interface Source {
  label: string;
  key: string;
}

export const sources: Array<Source> = [
  {
    label: 'News',
    key: 'news',
  },
  {
    label: 'Sport',
    key: 'sport',
  },
  {
    label: 'Help',
    key: 'help',
  },
  {
    label: 'Science',
    key: 'science',
  },
  {
    label: 'Religion',
    key: 'religion',
  },
  {
    label: 'Ö3',
    key: 'oe3',
  },
  {
    label: 'FM4',
    key: 'fm4',
  },
  {
    label: 'Österreich',
    key: 'oesterreich',
  },
  {
    label: 'Burgenland',
    key: 'burgenland',
  },
  {
    label: 'Wien',
    key: 'wien',
  },
  {
    label: 'Niederösterreich',
    key: 'noe',
  },
  {
    label: 'Oberösterreich',
    key: 'ooe',
  },
  {
    label: 'Salzburg',
    key: 'salzburg',
  },
  {
    label: 'Steiermark',
    key: 'steiermark',
  },
  {
    label: 'Kärnten',
    key: 'kaernten',
  },
  {
    label: 'Tirol',
    key: 'tirol',
  },
  {
    label: 'Vorarlberg',
    key: 'vorarlberg',
  },
];

export function getSourceLabel(source?: string): string | undefined {
  if (!source || source === 'news') {
    return undefined;
  }
  return sources.find((s) => s.key === source)?.label;
}
