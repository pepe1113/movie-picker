export async function fetchJson(
  fetcher: typeof fetch,
  url: string,
  init: RequestInit,
  failureMessage: string,
) {
  const response = await fetcher(url, init)
  const data = (await response.json().catch(() => null)) as unknown
  if (response.ok) return data

  const upstreamError =
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof data.error === 'object' &&
    data.error !== null
      ? (data.error as Record<string, unknown>)
      : {}
  console.error('upstream request failed', {
    host: new URL(url).host,
    status: response.status,
    type:
      typeof upstreamError.type === 'string' ? upstreamError.type : undefined,
    code:
      typeof upstreamError.code === 'string' ? upstreamError.code : undefined,
    param:
      typeof upstreamError.param === 'string' ? upstreamError.param : undefined,
  })
  const details = [
    `status=${response.status}`,
    typeof upstreamError.type === 'string'
      ? `type=${upstreamError.type}`
      : undefined,
    typeof upstreamError.code === 'string'
      ? `code=${upstreamError.code}`
      : undefined,
    typeof upstreamError.param === 'string'
      ? `param=${upstreamError.param}`
      : undefined,
  ].filter(Boolean)
  throw new Error(`${failureMessage} (${details.join(', ')})`)
}
