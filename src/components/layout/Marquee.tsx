export const Marquee = ({ ticker }: { ticker: string }) => {
  return (
    <div className="border-border/70 flex h-10 items-center overflow-hidden border-b">
      <div className="marquee text-muted-foreground flex w-max items-center gap-10 whitespace-nowrap text-xs font-bold tracking-[1.6px] uppercase">
        {Array.from({ length: 4 }).map((_, index) => (
          <span key={index} className="flex shrink-0 items-center gap-10">
            <span className="whitespace-nowrap">{ticker}</span>
            <span className="text-primary shrink-0">///</span>
          </span>
        ))}
      </div>
    </div>
  )
}
