import { Film } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation()
  const ticker = t('footer.ticker')

  return (
    <footer className="border-border bg-background border-t">
      <div className="border-border/70 overflow-hidden border-b py-3">
        <div className="footer-marquee text-muted-foreground flex w-max gap-10 text-xs font-bold tracking-[1.6px] uppercase">
          {Array.from({ length: 4 }).map((_, index) => (
            <span key={index} className="flex items-center gap-10">
              <span>{ticker}</span>
              <span className="text-primary">///</span>
            </span>
          ))}
        </div>
      </div>

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
