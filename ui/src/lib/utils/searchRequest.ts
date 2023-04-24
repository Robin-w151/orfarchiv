import type { SearchRequest } from '$lib/models/searchRequest';
import type { PageKey } from '$lib/models/pageKey';
import { DateTime } from 'luxon';

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
  ['religion', 16],
]);
const indexToSource = new Map<number, string>();
const numberOfSources = [...sourceToIndex.keys()].length;
for (const [source, index] of sourceToIndex.entries()) {
  indexToSource.set(index, source);
}

export function toSearchParams(searchRequest: SearchRequest): string {
  const { searchRequestParameters, pageKey } = searchRequest;
  const { textFilter, dateFilter, sources } = searchRequestParameters;
  const { from, to } = dateFilter ?? {};
  const searchParams = new URLSearchParams();

  setTextFilter(searchParams, textFilter);
  setFrom(searchParams, from);
  setTo(searchParams, to);
  setSources(searchParams, sources);
  setPageKey(searchParams, pageKey);

  return searchParams.toString();
}

export function fromSearchParams(searchParams: URLSearchParams): SearchRequest {
  const urlSearchParams = new URLSearchParams(searchParams);
  const textFilter = getTextFilter(urlSearchParams);
  const from = getFrom(urlSearchParams);
  const to = getTo(urlSearchParams);
  const sources = getSources(urlSearchParams);
  const pageKey = getPageKey(urlSearchParams);

  return { searchRequestParameters: { textFilter, dateFilter: { from, to }, sources }, pageKey };
}

function getTextFilter(searchParams: URLSearchParams): string | undefined {
  return searchParams.get('textFilter') ?? undefined;
}

function setTextFilter(searchParams: URLSearchParams, textFilter?: string): void {
  if (textFilter) {
    searchParams.append('textFilter', textFilter);
  }
}

function getFrom(searchParams: URLSearchParams): DateTime | undefined {
  return fromISO(searchParams.get('from'));
}

function setFrom(searchParams: URLSearchParams, from?: DateTime): void {
  const fromString = from?.toISO();
  if (fromString) {
    searchParams.append('from', fromString);
  }
}

function getTo(searchParams: URLSearchParams): DateTime | undefined {
  return fromISO(searchParams.get('to'));
}

function setTo(searchParams: URLSearchParams, to?: DateTime): void {
  const toString = to?.toISO();
  if (toString) {
    searchParams.append('to', toString);
  }
}

function getSources(searchParams: URLSearchParams): Array<string> | undefined {
  try {
    const sourcesBitString = searchParams.get('sources');

    const sourcesRegex = new RegExp(`^(0|1){${numberOfSources}}$`);
    if (!sourcesBitString || !sourcesRegex.test(sourcesBitString)) {
      return;
    }

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

function fromISO(dateTimeString?: string | null): DateTime | undefined {
  if (!dateTimeString) {
    return;
  }
  const dateTime = DateTime.fromISO(dateTimeString);
  return dateTime.isValid ? dateTime : undefined;
}
