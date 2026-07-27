import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MovieCard } from '@/components/features/movie/MovieCard'
import {
  getRecommendationHistoryRemote,
  type RecommendationRun,
} from '@/services/supabase/recommendationHistory'
import { useAuthStore } from '@/stores/authStore'

export function Component() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user, isAuthenticated, signIn } = useAuthStore()
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

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-6 py-16 md:px-12 lg:px-16">
        <div className="border-border bg-card mx-auto max-w-xl rounded-lg border p-6 text-center">
          <h1 className="text-2xl font-bold">{t('history.auth.title')}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t('history.auth.description')}
          </p>
          <Button className="mt-5" onClick={() => signIn()}>
            {t('history.auth.action')}
          </Button>
        </div>
      </div>
    )
  }

  const runs = historyQuery.data ?? []

  return (
    <div className="container mx-auto space-y-8 px-6 py-10 md:px-12 lg:px-16">
      <div>
        <h1 className="text-3xl font-bold md:text-4xl">{t('history.title')}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {t('history.subtitle')}
        </p>
      </div>

      {historyQuery.isLoading && (
        <div className="text-muted-foreground flex min-h-52 items-center justify-center">
          {t('history.loading')}
        </div>
      )}

      {!historyQuery.isLoading && runs.length === 0 && (
        <div className="border-border bg-card rounded-lg border p-8 text-center">
          <h2 className="text-xl font-bold">{t('history.empty.title')}</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {t('history.empty.description')}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {runs.map((run) => (
          <article
            key={run.id}
            className="border-border bg-card space-y-5 rounded-lg border p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Clock className="size-4" />
                  {new Date(run.created_at).toLocaleString()}
                </div>
                <h2 className="text-xl font-bold">{run.intent.summary}</h2>
                <div className="flex flex-wrap gap-2">
                  {run.intent.display_labels.hard.map((label) => (
                    <Badge key={`hard-${label}`} variant="outline">
                      {label}
                    </Badge>
                  ))}
                  {run.intent.display_labels.soft.map((label) => (
                    <Badge key={`soft-${label}`} variant="secondary">
                      {label}
                    </Badge>
                  ))}
                </div>
                <Badge
                  variant="ghost"
                  className="rounded-full px-3 py-1.5 text-sm normal-case"
                >
                  {t('history.model', { model: run.model })}
                </Badge>
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

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {run.recommendations.map((recommendation) => (
                <div
                  key={recommendation.movie_id}
                  className="mx-auto w-full max-w-[220px] space-y-3"
                >
                  <MovieCard movie={recommendation.movie_snapshot} />
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {recommendation.reason ||
                      recommendation.movie_snapshot.overview ||
                      t('movieCard.noOverview')}
                  </p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
