import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import ReactTimeAgo from 'react-time-ago'
import 'react-time-ago/locale/en'
import 'react-time-ago/locale/zh-Hant'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MovieCard } from '@/components/features/movie/MovieCard'
import { queryPlanBadges } from '@/components/features/ai-picker/queryPlanBadges'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  getRecommendationHistoryRemote,
  type RecommendationRun,
} from '@/services/supabase/recommendationHistory'
import type { MediaType } from '@/services/tmdb/types'
import { useAuthStore } from '@/stores/authStore'
import { useLanguageStore } from '@/stores/languageStore'
import { getMediaKey } from '@/utils/media'

export function Component() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user, isAuthenticated, signIn } = useAuthStore()
  const language = useLanguageStore((state) => state.language)
  const timeAgoLocale = language === 'zh-TW' ? 'zh-Hant' : 'en'
  const [filter, setFilter] = useState<'all' | MediaType>('all')
  const userId = user?.uid ?? null
  const queryKey = ['recommendation-history', userId]

  const historyQuery = useQuery({
    queryKey,
    queryFn: () => getRecommendationHistoryRemote().listLatest(userId ?? ''),
    enabled: isAuthenticated && Boolean(userId),
  })

  const deleteMutation = useMutation({
    mutationFn: (runId: string) =>
      getRecommendationHistoryRemote().deleteRun(userId ?? '', runId),
    onSuccess: (_data, runId) => {
      queryClient.setQueryData<RecommendationRun[]>(queryKey, (current = []) =>
        current.filter((run) => run.id !== runId),
      )
      toast.success(t('history.deleteSuccess'))
    },
    onError: () => {
      toast.error(t('history.deleteFailed'))
    },
  })

  const handleDelete = (runId: string) => {
    if (!window.confirm(t('history.confirmDelete'))) return

    deleteMutation.mutate(runId)
  }

  const runs = historyQuery.data ?? []
  const filteredRuns =
    filter === 'all' ? runs : runs.filter((run) => run.media_type === filter)

  return (
    <div className="container mx-auto space-y-8 px-6 py-10 md:px-12 lg:px-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">
            {t('history.title')}
          </h1>
        </div>
      </div>

      {/* no-authentication */}
      {!isAuthenticated && (
        <div className="border-border bg-card text-card-foreground flex flex-col gap-3 rounded-lg border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">{t('history.auth.title')}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {t('history.auth.description')}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => signIn()}>
            {t('history.auth.action')}
          </Button>
        </div>
      )}

      {isAuthenticated && historyQuery.isLoading && (
        <div className="text-muted-foreground flex min-h-52 items-center justify-center">
          {t('history.loading')}
        </div>
      )}

      {isAuthenticated && !historyQuery.isLoading && runs.length === 0 && (
        <div className="bg-card flex flex-col items-center justify-center gap-4 rounded-lg px-6 py-20 text-center shadow-[rgba(0,0,0,0.3)_0px_8px_8px]">
          <span className="bg-secondary text-muted-foreground flex size-16 items-center justify-center rounded-full">
            <Sparkles className="size-8 stroke-1" />
          </span>
          <div>
            <p className="text-muted-foreground text-lg">
              {t('history.empty.title')}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {t('history.empty.description')}
            </p>
          </div>
          <Button variant="outline" asChild>
            <a href="/">{t('history.empty.explore')}</a>
          </Button>
        </div>
      )}

      {isAuthenticated && !historyQuery.isLoading && runs.length > 0 && (
        <div className="space-y-8">
          <Tabs
            value={filter}
            onValueChange={(value) => setFilter(value as typeof filter)}
          >
            <TabsList className="bg-secondary rounded-full p-1">
              <TabsTrigger value="all" className="rounded-full">
                {t('history.filters.all')}
              </TabsTrigger>
              <TabsTrigger value="movie" className="rounded-full">
                {t('mediaType.movies')}
              </TabsTrigger>
              <TabsTrigger value="tv" className="rounded-full">
                {t('mediaType.tvShows')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredRuns.length === 0 && (
            <div className="flex min-h-52 items-center justify-center">
              <p className="text-muted-foreground text-lg">
                {t('history.filters.empty')}
              </p>
            </div>
          )}

          <div className="space-y-10">
            {filteredRuns.map((run) => (
              <section key={run.id} className="space-y-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Clock className="size-4" />
                      <ReactTimeAgo
                        date={new Date(run.created_at)}
                        locale={timeAgoLocale}
                        timeStyle="round"
                      />
                    </div>
                    <h2 className="text-xl font-bold">{run.intent.summary}</h2>
                    <div className="flex flex-wrap gap-2">
                      {
                        <Badge
                          variant="destructive"
                          className="bg-destructive/10 text-destructive"
                        >
                          {run.media_type === 'movie'
                            ? t('mediaType.movies')
                            : t('mediaType.tvShows')}
                        </Badge>
                      }
                      {(run.intent.query_plan
                        ? queryPlanBadges(run.intent.query_plan, t)
                        : [
                            ...run.intent.display_labels.hard.map((text) => ({
                              text,
                              kind: 'hard' as const,
                            })),
                            ...run.intent.display_labels.soft.map((text) => ({
                              text,
                              kind: 'soft' as const,
                            })),
                          ]
                      ).map(({ text, kind }) => (
                        <Badge
                          key={`${kind}-${text}`}
                          variant={kind === 'hard' ? 'outline' : 'secondary'}
                        >
                          {text}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(run.id)}
                    disabled={deleteMutation.isPending}
                    aria-label={t('history.deleteAction')}
                  >
                    <Trash2 className="size-4" />
                    {t('history.deleteAction')}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {run.recommendations
                    .filter((recommendation) => recommendation.media_snapshot)
                    .map((recommendation) => (
                      <MovieCard
                        key={getMediaKey(recommendation.media_snapshot)}
                        movie={recommendation.media_snapshot}
                      />
                    ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
