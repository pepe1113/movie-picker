import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ChevronDown, RotateCcw, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  AiRecommendationCarousel,
  AiRecommendationCarouselSkeleton,
} from '@/components/features/ai-picker/AiRecommendationCarousel'
import { AiPickerPreferenceBadge } from '@/components/features/ai-picker/AiPickerPreferenceBadge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { discoverMovies } from '@/services/tmdb/api'
import {
  analyzeMovieRequest,
  MAX_MOVIE_REQUEST_LENGTH,
} from '@/services/supabase/movieRequestAnalysis'
import { getRecommendationHistoryRemote } from '@/services/supabase/recommendationHistory'
import { useAuthStore } from '@/stores/authStore'
import { useLanguageStore } from '@/stores/languageStore'
import { cn } from '@/lib/utils'
import { TMDB_LANGUAGE_MAP } from '@/utils/constants'
import {
  buildAiMovieQuery,
  getAiPickerKeywordKeys,
} from '@/utils/aiMoviePicker'

interface AiMoviePickerProps {
  onBrowseMovies?: () => void
}

export function AiMoviePicker({ onBrowseMovies }: AiMoviePickerProps) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const [requestText, setRequestText] = useState('')
  const [inputError, setInputError] = useState(false)
  const savedHistoryKeyRef = useRef<string | null>(null)

  const analysisMutation = useMutation({
    mutationFn: ({ request, locale }: { request: string; locale: string }) =>
      analyzeMovieRequest(request, locale),
  })
  const criteria = analysisMutation.data?.criteria ?? null
  const keywordKeys = criteria ? getAiPickerKeywordKeys(criteria) : []

  const movieQuery = useQuery({
    queryKey: ['ai-request-movies', criteria, language],
    queryFn: async () => {
      if (!criteria) {
        throw new Error('AI movie criteria are unavailable')
      }

      const response = await discoverMovies({
        ...buildAiMovieQuery(criteria),
        language: TMDB_LANGUAGE_MAP[language],
      })

      return response.results.slice(0, 5)
    },
    enabled: Boolean(criteria),
  })

  const recommendations = (movieQuery.data ?? []).map((movie) => ({
    movie,
    matchedKeywordKeys: keywordKeys,
    reason: undefined,
  }))

  useEffect(() => {
    if (!criteria || !analysisMutation.data || !movieQuery.data || !user) {
      return
    }

    const historyKey = `${user.uid}:${requestText.trim()}:${movieQuery.data
      .map((movie) => movie.id)
      .join(',')}`
    if (savedHistoryKeyRef.current === historyKey) return

    savedHistoryKeyRef.current = historyKey
    getRecommendationHistoryRemote()
      .createRun({
        userId: user.uid,
        answers: criteria,
        candidateMovieIds: movieQuery.data.map((movie) => movie.id),
        recommendations: movieQuery.data.map((movie) => ({
          movie_id: movie.id,
          reason: movie.overview || t('movieCard.noOverview'),
          movie_snapshot: movie,
        })),
        provider: 'deepseek-criteria',
        model: analysisMutation.data.model,
      })
      .catch((error: unknown) => {
        console.error('AI-first recommendation history write failed', error)
      })
  }, [analysisMutation.data, criteria, movieQuery.data, requestText, t, user])

  const submitRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const request = requestText.trim()

    if (request.length < 2) {
      setInputError(true)
      return
    }

    setInputError(false)
    analysisMutation.mutate({ request, locale: language })
  }

  const retryAnalysis = () => {
    const request = requestText.trim()
    if (request.length < 2) return

    analysisMutation.mutate({ request, locale: language })
  }

  const reset = () => {
    setRequestText('')
    setInputError(false)
    savedHistoryKeyRef.current = null
    analysisMutation.reset()
  }

  return (
    <section className="border-border relative overflow-hidden border-b">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(30,215,96,0.18),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(83,157,245,0.14),transparent_24%)]" />
      <div className="via-primary/70 absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent to-transparent" />

      <div className="relative container mx-auto flex min-h-[calc(100svh-64px)] flex-1 flex-col justify-center px-6 py-10 md:px-12 md:py-12 lg:px-16">
        <div className="bg-card/85 border-border rounded-lg border p-4 shadow-[rgba(0,0,0,0.45)_0px_18px_48px] backdrop-blur md:p-6">
          {!criteria ? (
            <div className="mx-auto max-w-3xl space-y-6">
              <div className="space-y-2 text-center">
                <div className="text-primary bg-primary/10 mx-auto flex size-11 items-center justify-center rounded-full">
                  <Sparkles className="size-5" />
                </div>
                <h2 className="text-2xl font-bold md:text-3xl">
                  {t('aiPicker.requestTitle')}
                </h2>
                <p className="text-muted-foreground text-sm leading-normal">
                  {t('aiPicker.requestSubtitle')}
                </p>
              </div>

              <form onSubmit={submitRequest} className="space-y-4">
                <label
                  htmlFor="movie-request"
                  className="text-sm font-bold tracking-[1.4px] uppercase"
                >
                  {t('aiPicker.requestLabel')}
                </label>
                <Textarea
                  id="movie-request"
                  value={requestText}
                  onChange={(event) => {
                    setRequestText(event.target.value)
                    if (inputError) setInputError(false)
                  }}
                  placeholder={t('aiPicker.requestPlaceholder')}
                  maxLength={MAX_MOVIE_REQUEST_LENGTH}
                  aria-invalid={inputError}
                  aria-describedby={
                    inputError ? 'movie-request-error' : 'movie-request-hint'
                  }
                  disabled={analysisMutation.isPending}
                />
                <div className="flex items-start justify-between gap-4 text-xs">
                  <p
                    id={
                      inputError ? 'movie-request-error' : 'movie-request-hint'
                    }
                    className={
                      inputError ? 'text-destructive' : 'text-muted-foreground'
                    }
                  >
                    {inputError
                      ? t('aiPicker.requestRequired')
                      : t('aiPicker.requestHint')}
                  </p>
                  <span className="text-muted-foreground shrink-0">
                    {requestText.length} / {MAX_MOVIE_REQUEST_LENGTH}
                  </span>
                </div>

                {!isAuthenticated && (
                  <p className="rounded-lg border border-[#539df5]/40 bg-[#539df5]/10 px-4 py-3 text-sm text-[#539df5]">
                    {t('aiPicker.signInRequired')}
                  </p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={!isAuthenticated || analysisMutation.isPending}
                  className="w-full"
                >
                  <Sparkles
                    className={cn(
                      'size-4',
                      analysisMutation.isPending && 'animate-pulse',
                    )}
                  />
                  {analysisMutation.isPending
                    ? t('aiPicker.analyzing')
                    : t('aiPicker.analyzeRequest')}
                </Button>
              </form>

              {analysisMutation.isError && (
                <div
                  role="alert"
                  className="border-destructive/40 bg-destructive/10 flex flex-col items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-[rgba(243,114,127,0.12)_0px_8px_24px] sm:flex-row"
                >
                  <p className="text-destructive">
                    {t('aiPicker.analysisError')}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={retryAnalysis}
                    disabled={analysisMutation.isPending}
                    className="tracking-[1.4px] uppercase"
                  >
                    <RotateCcw
                      className={cn(
                        'size-4',
                        analysisMutation.isPending && 'animate-spin',
                      )}
                    />
                    {t('aiPicker.retryAnalysis')}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative">
                <div className="flex flex-col items-center space-y-2">
                  <p className="text-primary text-xs font-bold tracking-[1.4px] uppercase">
                    {t('aiPicker.criteriaReady')}
                  </p>
                  <h2 className="text-2xl font-bold">
                    {t('aiPicker.resultsTitle')}
                  </h2>
                  <div className="flex flex-wrap justify-center gap-2">
                    {keywordKeys.map((keywordKey) => (
                      <AiPickerPreferenceBadge
                        key={keywordKey}
                        keywordKey={keywordKey}
                      />
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={reset}
                  className="mx-auto mt-3 sm:absolute sm:top-0 sm:right-0 sm:mt-0"
                >
                  <RotateCcw className="size-4" />
                  {t('aiPicker.restart')}
                </Button>
              </div>

              {movieQuery.isLoading && <AiRecommendationCarouselSkeleton />}

              {movieQuery.isError && (
                <div
                  role="alert"
                  className="border-destructive/40 bg-destructive/10 rounded-lg border p-6 text-center shadow-[rgba(243,114,127,0.12)_0px_8px_24px]"
                >
                  <p className="text-destructive">{t('aiPicker.error')}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void movieQuery.refetch()}
                    disabled={movieQuery.isFetching}
                    className="mt-4 tracking-[1.4px] uppercase"
                  >
                    <RotateCcw
                      className={cn(
                        'size-4',
                        movieQuery.isFetching && 'animate-spin',
                      )}
                    />
                    {t('aiPicker.retryMovies')}
                  </Button>
                </div>
              )}

              {movieQuery.isSuccess && recommendations.length === 0 && (
                <div
                  role="status"
                  className="bg-secondary/70 rounded-lg p-6 text-center shadow-[rgba(0,0,0,0.3)_0px_8px_24px]"
                >
                  <p className="text-muted-foreground">
                    {t('aiPicker.noResults')}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={reset}
                    className="mt-4 tracking-[1.4px] uppercase"
                  >
                    {t('aiPicker.refineRequest')}
                  </Button>
                </div>
              )}

              {recommendations.length > 0 && (
                <AiRecommendationCarousel
                  recommendations={recommendations}
                  isReasonLoading={false}
                  shouldShowOverviewReasons
                />
              )}
            </div>
          )}
        </div>

        {onBrowseMovies && (
          <button
            type="button"
            onClick={onBrowseMovies}
            className="text-muted-foreground hover:text-foreground mx-auto mt-7 flex flex-col items-center gap-2 text-xs font-bold tracking-[1.4px] uppercase transition-colors"
          >
            <span>{t('aiPicker.browseMoviesHint')}</span>
            <ChevronDown className="text-primary size-6 animate-bounce" />
          </button>
        )}
      </div>
    </section>
  )
}
