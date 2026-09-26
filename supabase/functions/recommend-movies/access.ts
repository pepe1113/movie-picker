export const DEFAULT_ANONYMOUS_DAILY_LIMIT = 50

interface AuthClient {
  auth: {
    getUser(): Promise<{
      data: { user: { id: string } | null }
      error: unknown
    }>
  }
}

interface QuotaClient {
  rpc(
    name: 'consume_anonymous_recommendation_quota',
    params: { p_daily_limit: number },
  ): PromiseLike<{ data: boolean | null; error: unknown }>
}

export function anonymousDailyLimit(value?: string) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 1000
    ? parsed
    : DEFAULT_ANONYMOUS_DAILY_LIMIT
}

export async function getOptionalUserId(client: AuthClient | null) {
  if (!client) return null
  const { data, error } = await client.auth.getUser()
  return error ? null : (data.user?.id ?? null)
}

export function hasUserAuthorization(
  authorization: string | null,
  requestApiKey: string | null,
  projectApiKey: string,
) {
  const token = authorization?.match(/^Bearer (.+)$/i)?.[1]
  return Boolean(token && token !== requestApiKey && token !== projectApiKey)
}

export async function consumeAnonymousQuota(
  client: QuotaClient,
  dailyLimit: number,
) {
  const { data, error } = await client.rpc(
    'consume_anonymous_recommendation_quota',
    { p_daily_limit: dailyLimit },
  )
  if (error) throw error
  return data === true
}
