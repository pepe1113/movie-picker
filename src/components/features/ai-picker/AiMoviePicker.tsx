import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ChevronDown, RotateCcw, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AiRecommendationCarousel } from '@/components/features/ai-picker/AiRecommendationCarousel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  MAX_MOVIE_REQUEST_LENGTH,
  RECOMMENDATION_DEADLINE_MS,
  RecommendationRequestError,
  requestContextRecommendations,
} from '@/services/supabase/aiRecommendations'
import type { MediaType } from '@/services/tmdb/types'
import { useAuthStore } from '@/stores/authStore'
import { useLanguageStore } from '@/stores/languageStore'
import { cn } from '@/lib/utils'

interface AiMoviePickerProps {
  onBrowseMovies?: () => void
}

export function AiMoviePicker({ onBrowseMovies }: AiMoviePickerProps) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const [requestText, setRequestText] = useState('')
  const [mediaType, setMediaType] = useState<MediaType>('movie')
  const [inputError, setInputError] = useState(false)
  const startedAtRef = useRef(0)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const progressFillRef = useRef<HTMLDivElement>(null)
  const progressTextRef = useRef<HTMLSpanElement>(null)

  const recommendationMutation = useMutation({
    mutationFn: async ({
      request,
      mediaType: selectedMediaType,
    }: {
      request: string
      mediaType: MediaType
    }) => {
      const controller = new AbortController()
      const timeout = window.setTimeout(
        () => controller.abort(),
        RECOMMENDATION_DEADLINE_MS,
      )
      try {
        return await requestContextRecommendations(
          request,
          language,
          selectedMediaType,
          controller.signal,
        )
      } finally {
        window.clearTimeout(timeout)
      }
    },
  })

  useEffect(() => {
    if (!recommendationMutation.isPending) return

    const updateProgress = () => {
      const elapsed = Date.now() - startedAtRef.current
      const value = Math.min(
        90,
        Math.floor((elapsed / RECOMMENDATION_DEADLINE_MS) * 90),
      )
      progressBarRef.current?.setAttribute('aria-valuenow', String(value))
      if (progressFillRef.current) {
        progressFillRef.current.style.width = `${value}%`
      }
      if (progressTextRef.current) {
        progressTextRef.current.textContent = `${value}%`
      }
    }
    const interval = window.setInterval(updateProgress, 100)
    return () => window.clearInterval(interval)
  }, [recommendationMutation.isPending])

  const startRecommendation = () => {
    const request = requestText.trim()
    if (request.length < 2) {
      setInputError(true)
      return
    }

    setInputError(false)
    startedAtRef.current = Date.now()
    recommendationMutation.mutate({ request, mediaType })
  }

  const submitRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    startRecommendation()
  }

  const reset = () => {
    setRequestText('')
    setMediaType('movie')
    setInputError(false)
    recommendationMutation.reset()
  }

  const result = recommendationMutation.data
  const recommendations =
    result?.recommendations.map((recommendation) => ({
      movie: recommendation.media_snapshot,
      reason: recommendation.reason,
    })) ?? []

  return (
    <section className="border-border relative overflow-hidden border-b">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(30,215,96,0.18),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(83,157,245,0.14),transparent_24%)]" />
      <div className="via-primary/70 absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent to-transparent" />

      <div className="relative container mx-auto flex min-h-[calc(100svh-64px)] flex-1 flex-col justify-center px-6 py-10 md:px-12 md:py-12 lg:px-16">
        <div className="bg-card/85 border-border rounded-lg border p-4 shadow-[rgba(0,0,0,0.45)_0px_18px_48px] backdrop-blur md:p-6">
          {!result ? (
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
                <fieldset className="space-y-2">
                  <legend className="text-sm font-bold tracking-[1.4px] uppercase">
                    {t('aiPicker.mediaTypeLabel')}
                  </legend>
                  <div className="grid grid-cols-2 gap-2" role="group">
                    {(['movie', 'tv'] as const).map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant={mediaType === type ? 'default' : 'secondary'}
                        aria-pressed={mediaType === type}
                        disabled={recommendationMutation.isPending}
                        onClick={() => setMediaType(type)}
                      >
                        {t(`mediaType.${type}`)}
                      </Button>
                    ))}
                  </div>
                </fieldset>
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
                  disabled={recommendationMutation.isPending}
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
                  disabled={
                    !isAuthenticated || recommendationMutation.isPending
                  }
                  className="w-full"
                >
                  <Sparkles
                    className={cn(
                      'size-4',
                      recommendationMutation.isPending && 'animate-pulse',
                    )}
                  />
                  {recommendationMutation.isPending
                    ? t('aiPicker.loading')
                    : t('aiPicker.analyzeRequest')}
                </Button>
              </form>

              {recommendationMutation.isPending && (
                <div className="space-y-2" aria-live="polite">
                  <div className="flex justify-between text-sm">
                    <span>{t('aiPicker.progressLabel')}</span>
                    <span ref={progressTextRef}>0%</span>
                  </div>
                  <div
                    ref={progressBarRef}
                    role="progressbar"
                    aria-label={t('aiPicker.progressLabel')}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={0}
                    className="bg-secondary h-2 overflow-hidden rounded-full"
                  >
                    <div
                      ref={progressFillRef}
                      className="bg-primary h-full transition-[width] duration-100"
                      style={{ width: '0%' }}
                    />
                  </div>
                </div>
              )}

              {recommendationMutation.isError && (
                <div
                  role="alert"
                  className="border-destructive/40 bg-destructive/10 flex flex-col items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm sm:flex-row"
                >
                  <p className="text-destructive">
                    {recommendationMutation.error instanceof
                    RecommendationRequestError
                      ? t(
                          `aiPicker.errors.${recommendationMutation.error.code}`,
                          {
                            condition:
                              recommendationMutation.error.condition ?? '',
                          },
                        )
                      : t('aiPicker.analysisError')}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={startRecommendation}
                  >
                    <RotateCcw className="size-4" />
                    {t('aiPicker.retryAnalysis')}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-1" aria-live="polite">
                <div className="flex justify-between text-xs">
                  <span>{t('aiPicker.progressLabel')}</span>
                  <span>100%</span>
                </div>
                <div
                  role="progressbar"
                  aria-label={t('aiPicker.progressLabel')}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={100}
                  className="bg-primary h-1 rounded-full"
                />
              </div>
              <div className="relative text-center">
                <p className="text-primary text-xs font-bold tracking-[1.4px] uppercase">
                  {t('aiPicker.directionTitle')}
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  {result.direction.summary}
                </h2>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {result.direction.labels.map((label) => (
                    <Badge
                      key={`${label.kind}-${label.text}`}
                      variant={label.kind === 'hard' ? 'outline' : 'secondary'}
                      className="rounded-full px-3 py-1.5"
                    >
                      {label.text}
                    </Badge>
                  ))}
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

              {recommendations.length === 0 ? (
                <div
                  role="status"
                  className="bg-secondary/70 rounded-lg p-6 text-center"
                >
                  <p className="text-muted-foreground">
                    {t('aiPicker.noResults')}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={reset}
                    className="mt-4"
                  >
                    {t('aiPicker.refineRequest')}
                  </Button>
                </div>
              ) : (
                <AiRecommendationCarousel recommendations={recommendations} />
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
