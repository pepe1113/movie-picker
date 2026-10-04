import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'
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
  return (
    <TypewriterText
      key={title}
      title={title}
      as={Heading}
      className={className}
    />
  )
}

function TypewriterText({
  title,
  as: Heading,
  className,
}: Required<Pick<TypewriterHeroTitleProps, 'title' | 'as'>> &
  Pick<TypewriterHeroTitleProps, 'className'>) {
  const shouldReduceMotion = useReducedMotion()
  const [typedLength, setTypedLength] = useState(0)
  const titleCharacters = Array.from(title)
  const visibleLength = shouldReduceMotion
    ? titleCharacters.length
    : typedLength
  const typedTitle = titleCharacters.slice(0, visibleLength).join('')

  useEffect(() => {
    if (shouldReduceMotion) {
      return
    }

    const titleTimer = window.setInterval(() => {
      setTypedLength((currentLength) => {
        const next = Math.min(currentLength + 1, titleCharacters.length)

        if (next >= titleCharacters.length) {
          window.clearInterval(titleTimer)
        }

        return next
      })
    }, HERO_TITLE_TYPE_INTERVAL_MS)

    return () => window.clearInterval(titleTimer)
  }, [shouldReduceMotion, titleCharacters.length])

  return (
    <Heading
      aria-label={title}
      className={cn(
        'hero-title-gradient mx-auto w-full max-w-5xl text-center font-mono text-5xl leading-snug font-bold md:text-5xl lg:text-6xl',
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
