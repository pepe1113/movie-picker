import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/utils/constants'

interface SearchBarProps {
  defaultValue?: string
  autoFocus?: boolean
}

export function SearchBar({
  defaultValue = '',
  autoFocus = false,
}: SearchBarProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState(defaultValue)
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed) {
      navigate(`${ROUTES.SEARCH}?q=${encodeURIComponent(trimmed)}`)
    }
  }

  const handleClear = () => {
    setQuery('')
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <Search className="text-muted-foreground absolute top-1/2 left-4 size-4 -translate-y-1/2" />
      <Input
        type="search"
        placeholder={t('searchBar.placeholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus={autoFocus}
        className="pr-11 pl-11"
      />
      {query && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute top-1/2 right-2 -translate-y-1/2"
          onClick={handleClear}
        >
          <X className="size-3" />
          <span className="sr-only">{t('searchBar.clear')}</span>
        </Button>
      )}
    </form>
  )
}
