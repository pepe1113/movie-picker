import { useSearchParams } from 'react-router-dom'
import { SearchBar } from '@/components/features/search/SearchBar'
import { SearchResults } from '@/components/features/search/SearchResults'

export function Component() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''

  return (
    <div className="container mx-auto space-y-8 px-6 py-10 md:px-12 lg:px-16">
      <div className="max-w-2xl space-y-4">
        <h1 className="text-3xl font-bold md:text-4xl">搜尋電影</h1>
        <SearchBar defaultValue={query} autoFocus />
      </div>
      <SearchResults query={query} />
    </div>
  )
}
