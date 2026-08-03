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
    <section className="border-border bg-background relative isolate overflow-hidden border-b">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(214,43,66,0.22),transparent_42%),linear-gradient(180deg,rgba(23,23,27,0.7),rgba(11,11,14,0.96))]" />
      <div className="border-primary/10 absolute top-1/2 left-1/2 size-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full border" />
      <div className="via-primary/70 absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent to-transparent" />

      <div className="relative container mx-auto flex min-h-[calc(100svh-64px)] flex-1 flex-col justify-center px-6 py-10 md:px-12 md:py-12 lg:px-16">
        <div className="bg-card/75 rounded-2xl border border-white/10 p-5 shadow-[rgba(108,18,35,0.22)_0px_24px_70px,rgba(0,0,0,0.45)_0px_12px_32px] backdrop-blur-xl md:p-8">
          {!result ? (
            <div className="mx-auto max-w-3xl space-y-7">
              <div className="space-y-3 text-center">
                <div className="text-primary bg-primary/10 border-primary/20 shadow-primary/10 mx-auto flex size-12 items-center justify-center rounded-xl border shadow-lg">
                  <Sparkles className="size-5" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">
                  {t('aiPicker.requestTitle')}
                </h2>
                <p className="text-muted-foreground mx-auto max-w-xl text-sm leading-relaxed text-pretty">
                  {t('aiPicker.requestSubtitle')}
                </p>
              </div>

              <form onSubmit={submitRequest} className="space-y-5">
                <fieldset className="space-y-2">
                  <legend className="text-muted-foreground text-xs font-bold tracking-[1.4px] uppercase">
                    {t('aiPicker.mediaTypeLabel')}
                  </legend>
                  <div
                    className="bg-background/70 grid grid-cols-2 gap-1 rounded-full border border-white/8 p-1"
                    role="group"
                  >
                    {(['movie', 'tv'] as const).map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant={mediaType === type ? 'default' : 'ghost'}
                        aria-pressed={mediaType === type}
                        disabled={recommendationMutation.isPending}
                        onClick={() => setMediaType(type)}
                        className={cn(
                          'h-10 shadow-none',
                          mediaType !== type && 'hover:bg-white/5',
                        )}
                      >
                        {t(`mediaType.${type}`)}
                      </Button>
                    ))}
                  </div>
                </fieldset>
                <label
                  htmlFor="movie-request"
                  className="text-muted-foreground text-xs font-bold tracking-[1.4px] uppercase"
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
                  className="bg-background/70 min-h-36 border border-white/8 shadow-none focus:border-white/20 focus:shadow-[rgba(214,43,66,0.18)_0px_0px_0px_3px]"
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
                  <span className="text-muted-foreground shrink-0 tabular-nums">
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
                  className="w-full shadow-[rgba(214,43,66,0.24)_0px_12px_30px]"
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
                <h2 className="mx-auto mt-2 max-w-3xl text-2xl font-bold tracking-tight text-balance">
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
