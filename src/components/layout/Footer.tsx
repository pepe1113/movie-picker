import { Film } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Github from '@/assets/github.svg?react'

export function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="border-border bg-background border-t">
      <div className="container mx-auto flex flex-col items-center gap-4 px-4 py-6 text-center">
        <div className="flex items-center gap-2">
          <Film className="text-muted-foreground size-4" />
          <p className="text-muted-foreground text-sm">
            Powered by
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-1 underline"
            >
              TMDb
            </a>
            &
            <a
              href="https://www.omdb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-1 mr-2 underline"
            >
              OMDb
            </a>
            |
            <Github className="text-muted-foreground mx-2 inline-block h-4 w-4" />
            View on
            <a
              href="https://github.com/pepe1113/movie-picker"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-1 underline"
            >
              Github
            </a>
          </p>
        </div>
        <p className="text-muted-foreground text-xs">
          &copy; {new Date().getFullYear()} {t('footer.copyright')}
        </p>
      </div>
    </footer>
  )
}
