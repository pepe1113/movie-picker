import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import {
  ArrowDown,
  Brain,
  Check,
  Loader2,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MovieCard } from '@/components/features/movie/MovieCard'
import { discoverMovies } from '@/services/tmdb/api'
import { useLanguageStore } from '@/stores/languageStore'
import { cn } from '@/lib/utils'
import { TMDB_LANGUAGE_MAP } from '@/utils/constants'
import {
  AI_PICKER_QUESTIONS,
  buildAiMovieQuery,
  getAiPickerKeywordKeys,
  recommendMovies,
  type AiPickerAnswers,
  type AiPickerQuestionId,
} from '@/utils/aiMoviePicker'

export function AiMoviePicker() {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Partial<AiPickerAnswers>>({})
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const advanceTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(
    null,
  )

  const currentQuestion = AI_PICKER_QUESTIONS[step]
  const isComplete = AI_PICKER_QUESTIONS.every(
    (question) => answers[question.id],
  )
  const completedAnswers = isComplete ? (answers as AiPickerAnswers) : null
  const progress = ((step + 1) / AI_PICKER_QUESTIONS.length) * 100
  const keywordKeys = getAiPickerKeywordKeys(answers)

  useEffect(() => {
    if (hasSubmitted) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [hasSubmitted])

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current)
      }
    }
  }, [])

  const recommendationQuery = useQuery({
    queryKey: ['ai-picker', completedAnswers, language],
    queryFn: () => {
      if (!completedAnswers) {
        throw new Error('AI picker answers are incomplete')
      }

      return discoverMovies({
        ...buildAiMovieQuery(completedAnswers),
        language: TMDB_LANGUAGE_MAP[language],
      })
    },
    enabled: hasSubmitted && Boolean(completedAnswers),
  })

  const recommendations =
    completedAnswers && recommendationQuery.data?.results
      ? recommendMovies(recommendationQuery.data.results, completedAnswers)
      : []

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
  }

  return (
    <section className="border-border relative overflow-hidden border-b">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(30,215,96,0.18),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(83,157,245,0.14),transparent_24%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />

      <div className="relative container mx-auto px-6 py-12 md:px-12 md:py-18 lg:px-16">
        <div className="space-y-10 md:space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="grid min-h-[360px] gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end"
          >
            <div className="space-y-7">
              <Badge
                className="gap-2 rounded-full px-3 py-1.5"
                variant="outline"
              >
                <Sparkles className="size-3.5 text-primary" />
                {t('aiPicker.badge')}
              </Badge>
              <div className="space-y-5">
                <h1 className="max-w-4xl text-5xl leading-[0.98] font-bold md:text-7xl lg:text-8xl">
                  {t('aiPicker.title')}
                </h1>
                <p className="text-muted-foreground max-w-2xl text-base leading-relaxed md:text-xl">
                  {t('aiPicker.subtitle')}
                </p>
              </div>
            </div>

            <div className="border-border bg-card/55 rounded-lg border p-5 backdrop-blur">
              <div className="grid grid-cols-2 gap-3">
                {keywordKeys.length > 0
                  ? keywordKeys.map((keywordKey) => (
                      <Badge key={keywordKey} variant="secondary">
                        {t(keywordKey)}
                      </Badge>
                    ))
                  : ['4 questions', '3 picks', 'TMDB data', 'AI-ready'].map(
                      (label) => (
                        <Badge key={label} variant="secondary">
                          {label}
                        </Badge>
                      ),
                    )}
              </div>
              <div className="text-muted-foreground mt-6 flex items-center gap-2 text-sm">
                <ArrowDown className="size-4 text-primary" />
                {t('aiPicker.heroHint')}
              </div>
            </div>
          </motion.div>

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

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
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
                              'border-border bg-secondary/60 hover:border-primary/70 hover:bg-muted flex min-h-28 flex-col items-start justify-between rounded-lg border p-4 text-left transition-all',
                              isSelected &&
                                'border-primary bg-primary/10 shadow-[rgba(30,215,96,0.22)_0px_0px_0px_1px]',
                            )}
                          >
                            <span className="flex w-full items-center justify-between gap-3">
                              <span className="text-base font-bold">
                                {t(option.labelKey)}
                              </span>
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
                </AnimatePresence>

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
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full">
                        <Brain className="size-5" />
                      </span>
                      <h2 className="text-2xl font-bold">
                        {t('aiPicker.resultsTitle')}
                      </h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {keywordKeys.map((keywordKey) => (
                        <Badge key={keywordKey}>{t(keywordKey)}</Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" onClick={reset}>
                    <RotateCcw className="size-4" />
                    {t('aiPicker.restart')}
                  </Button>
                </div>

                {recommendationQuery.isLoading && (
                  <div className="text-muted-foreground flex min-h-72 items-center justify-center gap-3">
                    <Loader2 className="size-5 animate-spin" />
                    {t('aiPicker.loading')}
                  </div>
                )}

                {recommendationQuery.isError && (
                  <div className="border-border bg-secondary rounded-lg border p-6 text-center">
                    <p className="text-muted-foreground">
                      {t('aiPicker.error')}
                    </p>
                  </div>
                )}

                {recommendations.length > 0 && (
                  <div className="grid gap-5 md:grid-cols-3">
                    {recommendations.map((recommendation, index) => (
                      <div key={recommendation.movie.id} className="space-y-3">
                        <MovieCard movie={recommendation.movie} />
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {t('aiPicker.reasonPrefix')}{' '}
                          {recommendation.matchedKeywordKeys.map((keywordKey) => (
                            <Badge
                              key={`${recommendation.movie.id}-${keywordKey}`}
                              className="mx-0.5 align-middle"
                            >
                              {t(keywordKey)}
                            </Badge>
                          ))}{' '}
                          {index === 0
                            ? t('aiPicker.reasonTop')
                            : t('aiPicker.reasonFit')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
