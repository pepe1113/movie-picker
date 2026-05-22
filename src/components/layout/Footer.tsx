import { Film } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Marquee } from './Marquee'

export function Footer() {
  const { t } = useTranslation()
  const ticker = t('footer.ticker')

  return (
    <footer className="border-border bg-background border-t">
      <Marquee ticker={ticker} />

      <div className="container mx-auto flex flex-col items-center gap-4 px-4 py-6 text-center">
        <div className="flex items-center gap-2">
          <Film className="text-muted-foreground size-4" />
          <p className="text-muted-foreground text-sm">
            {t('footer.tmdbDisclaimer')}
          </p>
        </div>
        <p className="text-muted-foreground text-xs">
          &copy; {new Date().getFullYear()} {t('footer.copyright')}
        </p>
      </div>
    </footer>
  )
}
