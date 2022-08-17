import type { SearchRequest } from '$lib/models/searchRequest';
import type { PageKey } from '$lib/models/news';

const sourceToIndex = new Map<string, number>([
  ['news', 0],
  ['sport', 1],
  ['help', 2],
  ['science', 3],
  ['oe3', 4],
  ['fm4', 5],
  ['oesterreich', 6],
  ['burgenland', 7],
  ['wien', 8],
  ['noe', 9],
  ['ooe', 10],
  ['salzburg', 11],
  ['steiermark', 12],
  ['kaernten', 13],
  ['tirol', 14],
  ['vorarlberg', 15],
]);
const indexToSource = new Map<number, string>();
for (const [source, index] of sourceToIndex.entries()) {
  indexToSource.set(index, source);
}

export function toSearchParams(searchRequest: SearchRequest): string {
  const { searchRequestParameters, pageKey } = searchRequest;
  const { textFilter, sources } = searchRequestParameters;
  const searchParams = new URLSearchParams();

  setTextFilter(searchParams, textFilter);
  setSources(searchParams, sources);
  setPageKey(searchParams, pageKey);

  return searchParams.toString();
}

export function fromSearchParams(searchParams: URLSearchParams): SearchRequest {
  const urlSearchParams = new URLSearchParams(searchParams);
  const textFilter = getTextFilter(urlSearchParams);
  const sources = getSources(urlSearchParams);
  const pageKey = getPageKey(urlSearchParams);

  return { searchRequestParameters: { textFilter, sources }, pageKey };
}

function getTextFilter(searchParams: URLSearchParams): string | undefined {
  return searchParams.get('textFilter') ?? undefined;
}

function setTextFilter(searchParams: URLSearchParams, textFilter?: string): void {
  if (textFilter) {
    searchParams.append('textFilter', textFilter);
  }
}

function getSources(searchParams: URLSearchParams): Array<string> | undefined {
  try {
    const sourcesBitString = searchParams.get('sources');
    const sourcesBitArray = sourcesBitString?.split('').map((c) => parseInt(c));
    if (!sourcesBitArray) {
      return;
    }

    return sourcesBitArray.flatMap((flag, index) =>
      flag === 1 && indexToSource.has(index) ? [indexToSource.get(index) as string] : [],
    );
  } catch (_) {
    return;
  }
}

function setSources(searchParams: URLSearchParams, sources?: Array<string>): void {
  if (sources) {
    const sourcesBitArray = new Array(sourceToIndex.size).fill(0);
    sources.forEach((source) => {
      const index = sourceToIndex.get(source);
      if (index !== undefined) {
        sourcesBitArray[index] = 1;
      }
    });
    const sourcesBitString = sourcesBitArray.map((flag) => flag.toString()).join('');
    searchParams.append('sources', sourcesBitString);
  }
}

function getPageKey(searchParams: URLSearchParams): PageKey | undefined {
  const prevId = searchParams.get('prevId');
  const prevTimestamp = searchParams.get('prevTimestamp');
  if (prevId && prevTimestamp) {
    return {
      id: prevId,
      timestamp: prevTimestamp,
      type: 'prev',
    };
  }

  const nextId = searchParams.get('nextId');
  const nextTimestamp = searchParams.get('nextTimestamp');
  if (nextId && nextTimestamp) {
    return {
      id: nextId,
      timestamp: nextTimestamp,
      type: 'next',
    };
  }

  return undefined;
}

function setPageKey(searchParams: URLSearchParams, pageKey?: PageKey): void {
  if (pageKey) {
    searchParams.append(`${pageKey.type}Id`, pageKey.id);
    searchParams.append(`${pageKey.type}Timestamp`, pageKey.timestamp);
  }
}
