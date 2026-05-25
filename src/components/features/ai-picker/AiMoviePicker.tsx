import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Check, ChevronDown, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AiPickerPreferenceBadge } from '@/components/features/ai-picker/AiPickerPreferenceBadge'
import { MovieCard } from '@/components/features/movie/MovieCard'
import { discoverMovies } from '@/services/tmdb/api'
import { getRecommendationHistoryRemote } from '@/services/supabase/recommendationHistory'
import { useAuthStore } from '@/stores/authStore'
import { useLanguageStore } from '@/stores/languageStore'
import { cn } from '@/lib/utils'
import { TMDB_LANGUAGE_MAP } from '@/utils/constants'
import {
  AI_PICKER_QUESTIONS,
  buildAiMovieQuery,
  getAiPickerKeywordKeys,
  type AiPickerAnswers,
  type AiPickerQuestionId,
} from '@/utils/aiMoviePicker'
import { resolveAiPickerRecommendations } from '@/utils/aiRecommendationFlow'

interface AiMoviePickerProps {
  onBrowseMovies?: () => void
}

export function AiMoviePicker({ onBrowseMovies }: AiMoviePickerProps) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Partial<AiPickerAnswers>>({})
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const advanceTimerRef = useRef<number | null>(null)
  const fallbackHistoryKeyRef = useRef<string | null>(null)

  const currentQuestion = AI_PICKER_QUESTIONS[step]
  const isComplete = AI_PICKER_QUESTIONS.every(
    (question) => answers[question.id],
  )
  const completedAnswers = isComplete ? (answers as AiPickerAnswers) : null
  const progress = (step / AI_PICKER_QUESTIONS.length) * 100
  const keywordKeys = getAiPickerKeywordKeys(answers)

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current)
      }
    }
  }, [])

  const movieQuery = useQuery({
    queryKey: ['ai-picker-movies', completedAnswers, language],
    queryFn: async () => {
      if (!completedAnswers) {
        throw new Error('AI picker answers are incomplete')
      }

      const candidateResponse = await discoverMovies({
        ...buildAiMovieQuery(completedAnswers),
        language: TMDB_LANGUAGE_MAP[language],
      })

      return candidateResponse.results.slice(0, 5)
    },
    enabled: hasSubmitted && Boolean(completedAnswers),
  })

  const displayedMovies = useMemo(() => movieQuery.data ?? [], [movieQuery.data])

  const reasonQuery = useQuery({
    queryKey: [
      'ai-picker-reasons',
      completedAnswers,
      language,
      isAuthenticated,
      displayedMovies.map((movie) => movie.id),
    ],
    queryFn: async () => {
      if (!completedAnswers) {
        throw new Error('AI picker answers are incomplete')
      }

      return resolveAiPickerRecommendations({
        answers: completedAnswers,
        candidates: displayedMovies,
        isAuthenticated,
        locale: language,
      })
    },
    enabled:
      hasSubmitted &&
      Boolean(completedAnswers) &&
      isAuthenticated &&
      displayedMovies.length > 0,
    retry: false,
  })

  const recommendations =
    reasonQuery.data?.recommendations ??
    displayedMovies.map((movie) => ({
      movie,
      matchedKeywordKeys: keywordKeys,
      reason: undefined,
    }))
  const usedFallback = reasonQuery.data?.usedFallback ?? false
  const shouldShowOverviewReasons = !isAuthenticated || reasonQuery.isError

  useEffect(() => {
    if (
      !reasonQuery.isError ||
      !reasonQuery.error ||
      !completedAnswers ||
      !user ||
      displayedMovies.length === 0
    ) {
      return
    }

    const fallbackHistoryKey = `${user.uid}:${displayedMovies
      .map((movie) => movie.id)
      .join(',')}`
    if (fallbackHistoryKeyRef.current === fallbackHistoryKey) return

    fallbackHistoryKeyRef.current = fallbackHistoryKey
    console.error('AI recommendation reasons failed', reasonQuery.error)

    getRecommendationHistoryRemote()
      .createRun({
        userId: user.uid,
        answers: completedAnswers,
        candidateMovieIds: displayedMovies.map((movie) => movie.id),
        recommendations: displayedMovies.map((movie) => ({
          movie_id: movie.id,
          reason: movie.overview || t('movieCard.noOverview'),
          movie_snapshot: movie,
        })),
        provider: 'fallback',
        model: 'local-overview',
      })
      .catch((error: unknown) => {
        console.error('Fallback recommendation history write failed', error)
      })
  }, [
    completedAnswers,
    displayedMovies,
    reasonQuery.error,
    reasonQuery.isError,
    t,
    user,
  ])

  const selectAnswer = (questionId: AiPickerQuestionId, value: string) => {
    if (isAdvancing || advanceTimerRef.current) return

    setIsAdvancing(true)
    setAnswers((current) => ({ ...current, [questionId]: value }))

    advanceTimerRef.current = window.setTimeout(() => {
      advanceTimerRef.current = null
      setIsAdvancing(false)

      if (step < AI_PICKER_QUESTIONS.length - 1) {
        setStep((current) => current + 1)
        return
      }

      setHasSubmitted(true)
    }, 220)
  }

  const reset = () => {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }

    setStep(0)
    setAnswers({})
    setHasSubmitted(false)
    setIsAdvancing(false)
    fallbackHistoryKeyRef.current = null
  }

  return (
    <section className="border-border relative overflow-hidden border-b">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(30,215,96,0.18),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(83,157,245,0.14),transparent_24%)]" />
      <div className="via-primary/70 absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent to-transparent" />

      <div className="relative container mx-auto flex min-h-[calc(100svh-64px)] flex-1 flex-col justify-center px-6 py-10 md:px-12 md:py-12 lg:px-16">
        <div className="bg-card/85 border-border rounded-lg border p-4 shadow-[rgba(0,0,0,0.45)_0px_18px_48px] backdrop-blur md:p-6">
          {!hasSubmitted ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="text-muted-foreground flex items-center justify-between text-xs font-bold tracking-[1.4px] uppercase">
                  <span>{t('aiPicker.progressLabel')}</span>
                  <span>
                    {step + 1} / {AI_PICKER_QUESTIONS.length}
                  </span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <motion.div
                key={currentQuestion.id}
                initial={false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div className="mb-10 space-y-2 text-center">
                  <h2 className="text-2xl font-bold md:text-3xl">
                    {t(currentQuestion.titleKey)}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {t(currentQuestion.subtitleKey)}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {currentQuestion.options.map((option) => {
                    const isSelected =
                      answers[currentQuestion.id] === option.value

                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={isAdvancing}
                        onClick={() =>
                          selectAnswer(currentQuestion.id, option.value)
                        }
                        className={cn(
                          'border-border bg-secondary/60 hover:border-primary/70 hover:bg-muted flex min-h-28 flex-col items-start justify-between rounded-lg border p-4 text-left transition-all hover:border-3',
                          isSelected &&
                            'border-primary bg-primary/10 shadow-[rgba(30,215,96,0.22)_0px_0px_0px_1px]',
                        )}
                      >
                        <span className="flex w-full items-start justify-between gap-3">
                          <AiPickerPreferenceBadge
                            questionId={currentQuestion.id}
                            value={option.value}
                          />
                          {isSelected && (
                            <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full">
                              <Check className="size-4" />
                            </span>
                          )}
                        </span>
                        <span className="text-muted-foreground text-sm leading-relaxed">
                          {t(option.descriptionKey)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </motion.div>

              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                  disabled={step === 0}
                >
                  {t('aiPicker.back')}
                </Button>
                <p className="text-muted-foreground text-sm">
                  {t('aiPicker.autoAdvance')}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative">
                <div className="flex flex-col items-center space-y-2">
                  <h2 className="text-2xl font-bold">
                    {t('aiPicker.resultsTitle')}
                  </h2>
                  <div className="flex flex-wrap gap-2">
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
                  className="absolute top-0 right-0"
                >
                  <RotateCcw className="size-4" />
                  {t('aiPicker.restart')}
                </Button>
              </div>

              {movieQuery.isLoading && (
                <div
                  className="grid gap-5 md:grid-cols-3"
                  aria-label={t('aiPicker.loading')}
                >
                  {Array.from({ length: 5 }, (_, index) => (
                    <div key={index} className="space-y-3">
                      <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                      <div className="space-y-2 p-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-5/6" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {movieQuery.isError && (
                <div className="border-border bg-secondary rounded-lg border p-6 text-center">
                  <p className="text-muted-foreground">{t('aiPicker.error')}</p>
                </div>
              )}

              {usedFallback && recommendations.length > 0 && (
                <p className="border-border bg-secondary text-muted-foreground rounded-lg border px-4 py-3 text-sm">
                  {t('aiPicker.fastRecommendationPrompt')}
                </p>
              )}

              {reasonQuery.isError && recommendations.length > 0 && (
                <p className="border-border bg-secondary text-muted-foreground rounded-lg border px-4 py-3 text-sm">
                  {t('aiPicker.reasonFallbackNotice')}
                </p>
              )}

              {recommendations.length > 0 && (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                  {recommendations.map((recommendation, index) => (
                    <div key={recommendation.movie.id} className="space-y-3">
                      <MovieCard
                        movie={recommendation.movie}
                        enableTrailerPreview
                      />
                      <div className="text-muted-foreground text-sm leading-relaxed">
                        {recommendation.reason ? (
                          recommendation.reason
                        ) : reasonQuery.isLoading ? (
                          <span className="block space-y-2">
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-5/6" />
                          </span>
                        ) : shouldShowOverviewReasons ? (
                          recommendation.movie.overview ||
                          t('movieCard.noOverview')
                        ) : (
                          <>
                            {t('aiPicker.reasonPrefix')}{' '}
                            {recommendation.matchedKeywordKeys.map(
                              (keywordKey) => (
                                <AiPickerPreferenceBadge
                                  key={`${recommendation.movie.id}-${keywordKey}`}
                                  keywordKey={keywordKey}
                                  className="mx-0.5 align-middle"
                                />
                              ),
                            )}{' '}
                            {index === 0
                              ? t('aiPicker.reasonTop')
                              : t('aiPicker.reasonFit')}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
