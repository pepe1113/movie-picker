import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

const HERO_TITLE_TYPE_INTERVAL_MS = 100

type HeadingTag = 'h1' | 'h2'

interface TypewriterHeroTitleProps {
  title: string
  as?: HeadingTag
  className?: string
}

export function TypewriterHeroTitle({
  title,
  as: Heading = 'h2',
  className,
}: TypewriterHeroTitleProps) {
  const [typedTitleState, setTypedTitleState] = useState({
    title,
    length: 0,
  })
  const titleCharacters = useMemo(() => Array.from(title), [title])
  const typedTitleLength =
    typedTitleState.title === title ? typedTitleState.length : 0
  const typedTitle = titleCharacters.slice(0, typedTitleLength).join('')

  useEffect(() => {
    const titleTimer = window.setInterval(() => {
      setTypedTitleState((current) => {
        const currentLength = current.title === title ? current.length : 0
        const next = Math.min(currentLength + 1, titleCharacters.length)

        if (next >= titleCharacters.length) {
          window.clearInterval(titleTimer)
        }

        return { title, length: next }
      })
    }, HERO_TITLE_TYPE_INTERVAL_MS)

    return () => window.clearInterval(titleTimer)
  }, [title, titleCharacters.length])

  return (
    <Heading
      aria-label={title}
      className={cn(
        'hero-title-gradient mx-auto w-full max-w-6xl text-center font-mono text-3xl leading-tight font-bold md:text-4xl lg:text-5xl',
        className,
      )}
    >
      {typedTitle}
      <span
        aria-hidden="true"
        className="hero-title-cursor bg-primary ml-1 inline-block h-[0.86em] w-[0.3em] translate-y-1"
        data-testid="hero-title-cursor"
      />
    </Heading>
  )
}
