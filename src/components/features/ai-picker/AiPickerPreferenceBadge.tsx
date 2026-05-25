import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  getAiPickerKeywordPreferenceMeta,
  getAiPickerPreferenceMeta,
  type AiPickerQuestionId,
} from '@/utils/aiMoviePicker'

type AiPickerPreferenceBadgeProps = {
  className?: string
  keywordKey?: string
  questionId?: AiPickerQuestionId
  value?: string
  variant?: 'default' | 'secondary' | 'outline' | 'ghost'
}

export function AiPickerPreferenceBadge({
  className,
  keywordKey,
  questionId,
  value,
  variant = 'secondary',
}: AiPickerPreferenceBadgeProps) {
  const { t } = useTranslation()
  const meta = keywordKey
    ? getAiPickerKeywordPreferenceMeta(keywordKey)
    : questionId && value
      ? getAiPickerPreferenceMeta(questionId, value)
      : null

  if (!meta) return null

  return (
    <Badge
      variant={variant}
      className={cn('rounded-full px-4 py-2 text-lg leading-none', className)}
    >
      {meta.emoji}&nbsp;&nbsp;{t(meta.labelKey)}
    </Badge>
  )
}
