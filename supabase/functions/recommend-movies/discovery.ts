import {
  MAX_RECOMMENDATIONS,
  type ContextPlan,
  type KeywordPreference,
  type PersonRole,
  type RecommendationRequest,
  type ResolvedKeyword,
  type ResolvedPerson,
} from './domain.ts'
import { hasInferredPreferences } from './rules.ts'
import {
  buildDiscoverSearchParams,
  mergeCandidatePools,
  parseKeywordResults,
  parsePersonCredits,
  parsePersonResults,
  parseTmdbMedia,
  type CandidateMedia,
} from './tmdb.ts'
import { fetchJson } from './upstream.ts'

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

export interface DiscoveryConfig {
  tmdbAccessToken: string
}

export type RecommendationConditionCode =
  | 'unresolved_person'
  | 'unresolved_keyword'

export class RecommendationConditionError extends Error {
  code: RecommendationConditionCode
  condition: string

  constructor(code: RecommendationConditionCode, condition: string) {
    super(code)
    this.code = code
    this.condition = condition
  }
}

function tmdbHeaders(config: DiscoveryConfig) {
  return {
    Authorization: `Bearer ${config.tmdbAccessToken}`,
    Accept: 'application/json',
  }
}

function normalizedName(value: string) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, '')
}

function departmentForRole(role: PersonRole) {
  if (role === 'cast') return 'Acting'
  if (role === 'director') return 'Directing'
  if (role === 'writer') return 'Writing'
  if (role === 'producer') return 'Production'
  return undefined
}

function roleForDepartment(
  department: string | null,
): Exclude<PersonRole, 'any'> | undefined {
  if (department === 'Acting') return 'cast'
  if (department === 'Directing') return 'director'
  if (department === 'Writing') return 'writer'
  if (department === 'Production') return 'producer'
  return undefined
}

function chooseClearPerson<T extends { popularity: number }>(people: T[]) {
  const ranked = [...people].sort((a, b) => b.popularity - a.popularity)
  if (ranked.length === 1) return ranked[0]
  if (
    ranked[0] &&
    ranked[1] &&
    ranked[0].popularity > ranked[1].popularity * 1.5
  ) {
    return ranked[0]
  }
  return undefined
}

async function resolvePerson(
  person: ContextPlan['people'][number],
  request: RecommendationRequest,
  config: DiscoveryConfig,
  signal: AbortSignal,
  fetcher: typeof fetch,
): Promise<ResolvedPerson> {
  const params = new URLSearchParams({
    query: person.name,
    language: request.locale === 'zh-TW' ? 'zh-TW' : 'en-US',
    page: '1',
    include_adult: 'false',
  })
  const results = parsePersonResults(
    await fetchJson(
      fetcher,
      `${TMDB_BASE_URL}/search/person?${params}`,
      { signal, headers: tmdbHeaders(config) },
      'TMDB person search failed',
    ),
  )
  const expectedDepartment = departmentForRole(person.role)
  const requestedName = normalizedName(person.name)
  const departmentMatches = results.filter(
    (candidate) =>
      !expectedDepartment ||
      candidate.known_for_department === expectedDepartment,
  )
  const exactMatches = departmentMatches.filter(
    (candidate) =>
      normalizedName(candidate.name) === requestedName ||
      normalizedName(candidate.original_name ?? '') === requestedName,
  )
  const selected = chooseClearPerson(
    exactMatches.length
      ? exactMatches
      : departmentMatches.length === 1
        ? departmentMatches
        : [],
  )
  const role =
    person.role === 'any'
      ? roleForDepartment(selected?.known_for_department ?? null)
      : person.role
  if (!selected || !role) {
    throw new RecommendationConditionError('unresolved_person', person.name)
  }
  return { id: selected.id, name: selected.name, role }
}

async function resolvePeople(
  request: RecommendationRequest,
  plan: ContextPlan,
  config: DiscoveryConfig,
  signal: AbortSignal,
  fetcher: typeof fetch,
) {
  return Promise.all(
    plan.people.map((person) =>
      resolvePerson(person, request, config, signal, fetcher),
    ),
  )
}

function normalizedKeyword(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
}

async function resolveKeyword(
  keyword: KeywordPreference,
  config: DiscoveryConfig,
  signal: AbortSignal,
  fetcher: typeof fetch,
): Promise<ResolvedKeyword | undefined> {
  const params = new URLSearchParams({ query: keyword.lookup_name, page: '1' })
  const results = parseKeywordResults(
    await fetchJson(
      fetcher,
      `${TMDB_BASE_URL}/search/keyword?${params}`,
      { signal, headers: tmdbHeaders(config) },
      'TMDB keyword search failed',
    ),
  )
  const requested = normalizedKeyword(keyword.lookup_name)
  const exact = results.find(
    (item) => normalizedKeyword(item.name) === requested,
  )
  const similar = results.filter((item) => {
    const name = normalizedKeyword(item.name)
    return name.includes(requested) || requested.includes(name)
  })
  const selected = exact ?? (similar.length === 1 ? similar[0] : undefined)
  if (!selected && keyword.source === 'explicit') {
    throw new RecommendationConditionError(
      'unresolved_keyword',
      keyword.display_label,
    )
  }
  return selected ? { ...keyword, id: selected.id } : undefined
}

async function resolveKeywords(
  plan: ContextPlan,
  config: DiscoveryConfig,
  signal: AbortSignal,
  fetcher: typeof fetch,
) {
  const resolveAll = (keywords: KeywordPreference[]) =>
    Promise.all(
      keywords.map((keyword) =>
        resolveKeyword(keyword, config, signal, fetcher),
      ),
    ).then((items) =>
      items.filter(
        (keyword): keyword is ResolvedKeyword => keyword !== undefined,
      ),
    )

  const [included, excluded] = await Promise.all([
    resolveAll(plan.discover_plan.keywords),
    resolveAll(
      plan.discover_plan.exclude_keywords.map((keyword) => ({
        ...keyword,
        source: 'explicit' as const,
      })),
    ),
  ])
  return { included, excluded }
}

function creditMatches(
  role: ResolvedPerson['role'],
  department: string,
  job: string,
) {
  if (role === 'director')
    return department === 'Directing' && job === 'Director'
  if (role === 'writer') {
    return (
      department === 'Writing' &&
      /^(Writer|Screenplay|Story|Teleplay)$/i.test(job)
    )
  }
  if (role === 'producer') {
    return department === 'Production' && /Producer$/i.test(job)
  }
  return false
}

async function fetchPersonMediaIds(
  person: ResolvedPerson,
  request: RecommendationRequest,
  config: DiscoveryConfig,
  signal: AbortSignal,
  fetcher: typeof fetch,
) {
  const credits = parsePersonCredits(
    await fetchJson(
      fetcher,
      `${TMDB_BASE_URL}/person/${person.id}/${request.media_type}_credits`,
      { signal, headers: tmdbHeaders(config) },
      'TMDB person credits failed',
    ),
  )
  if (person.role === 'cast') {
    return new Set(credits.cast.map((item) => item.id))
  }
  return new Set(
    credits.crew
      .filter((item) => creditMatches(person.role, item.department, item.job))
      .map((item) => item.id),
  )
}

function combinePersonSets(
  sets: Set<number>[],
  match: ContextPlan['people_match'],
) {
  if (sets.length === 0) return undefined
  if (match === 'any') return new Set(sets.flatMap((set) => [...set]))
  const [first, ...rest] = sets
  return new Set(
    [...(first ?? [])].filter((id) => rest.every((set) => set.has(id))),
  )
}

async function resolveAllowedMediaIds(
  people: ResolvedPerson[],
  request: RecommendationRequest,
  plan: ContextPlan,
  config: DiscoveryConfig,
  signal: AbortSignal,
  fetcher: typeof fetch,
) {
  if (
    people.length === 0 ||
    (request.media_type === 'movie' &&
      people.every((person) => person.role === 'cast'))
  ) {
    return undefined
  }
  const sets = await Promise.all(
    people.map((person) =>
      fetchPersonMediaIds(person, request, config, signal, fetcher),
    ),
  )
  return combinePersonSets(sets, plan.people_match)
}

function movieCastFilter(
  people: ResolvedPerson[],
  request: RecommendationRequest,
  match: ContextPlan['people_match'],
) {
  if (
    request.media_type !== 'movie' ||
    people.length === 0 ||
    !people.every((person) => person.role === 'cast')
  ) {
    return undefined
  }
  return people.map((person) => person.id).join(match === 'all' ? ',' : '|')
}

async function fetchDiscover(
  request: RecommendationRequest,
  plan: ContextPlan,
  resolvedKeywords: ResolvedKeyword[],
  excludedKeywords: ResolvedKeyword[],
  sortBy: 'popularity.desc' | 'vote_average.desc',
  includeInferred: boolean,
  castFilter: string | undefined,
  config: DiscoveryConfig,
  signal: AbortSignal,
  fetcher: typeof fetch,
) {
  const keywordIds = resolvedKeywords
    .filter((keyword) => includeInferred || keyword.source === 'explicit')
    .map((keyword) => keyword.id)
  const params = buildDiscoverSearchParams(
    request.media_type,
    plan.discover_plan,
    keywordIds,
    sortBy,
    includeInferred,
    excludedKeywords.map((keyword) => keyword.id),
  )
  params.set('language', request.locale === 'zh-TW' ? 'zh-TW' : 'en-US')
  if (castFilter) params.set('with_cast', castFilter)
  const data = await fetchJson(
    fetcher,
    `${TMDB_BASE_URL}/discover/${request.media_type}?${params}`,
    { signal, headers: tmdbHeaders(config) },
    'TMDB Discover request failed',
  )
  return parseTmdbMedia(data, request.media_type)
}

function filterAllowed(candidates: CandidateMedia[], allowed?: Set<number>) {
  return allowed
    ? candidates.filter((candidate) => allowed.has(candidate.id))
    : candidates
}

async function fetchPools(
  request: RecommendationRequest,
  plan: ContextPlan,
  keywords: ResolvedKeyword[],
  excludedKeywords: ResolvedKeyword[],
  includeInferred: boolean,
  castFilter: string | undefined,
  allowedMediaIds: Promise<Set<number> | undefined>,
  config: DiscoveryConfig,
  signal: AbortSignal,
  fetcher: typeof fetch,
) {
  const [popular, rated, allowed] = await Promise.all([
    fetchDiscover(
      request,
      plan,
      keywords,
      excludedKeywords,
      'popularity.desc',
      includeInferred,
      castFilter,
      config,
      signal,
      fetcher,
    ),
    fetchDiscover(
      request,
      plan,
      keywords,
      excludedKeywords,
      'vote_average.desc',
      includeInferred,
      castFilter,
      config,
      signal,
      fetcher,
    ),
    allowedMediaIds,
  ])
  return mergeCandidatePools(
    filterAllowed(popular, allowed),
    filterAllowed(rated, allowed),
  )
}

export async function discoverCandidates(
  request: RecommendationRequest,
  plan: ContextPlan,
  config: DiscoveryConfig,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const [resolvedPeople, resolvedKeywords] = await Promise.all([
    resolvePeople(request, plan, config, signal, fetcher),
    resolveKeywords(plan, config, signal, fetcher),
  ])
  const castFilter = movieCastFilter(resolvedPeople, request, plan.people_match)
  const allowedMediaIds = resolveAllowedMediaIds(
    resolvedPeople,
    request,
    plan,
    config,
    signal,
    fetcher,
  )
  let candidates = await fetchPools(
    request,
    plan,
    resolvedKeywords.included,
    resolvedKeywords.excluded,
    true,
    castFilter,
    allowedMediaIds,
    config,
    signal,
    fetcher,
  )
  let usedFallback = false

  if (candidates.length < MAX_RECOMMENDATIONS && hasInferredPreferences(plan)) {
    const relaxed = await fetchPools(
      request,
      plan,
      resolvedKeywords.included,
      resolvedKeywords.excluded,
      false,
      castFilter,
      allowedMediaIds,
      config,
      signal,
      fetcher,
    )
    candidates = mergeCandidatePools(candidates, relaxed)
    usedFallback = true
  }

  return {
    candidates,
    resolvedPeople,
    resolvedKeywords: resolvedKeywords.included,
    usedFallback,
  }
}
