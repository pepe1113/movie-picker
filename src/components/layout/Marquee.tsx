export const Marquee = ({ ticker }: { ticker: string }) => {
  return (
    <div className="border-border/70 overflow-hidden border-b py-3">
      <div className="marquee text-muted-foreground flex w-max gap-10 text-xs font-bold tracking-[1.6px] uppercase">
        {Array.from({ length: 4 }).map((_, index) => (
          <span key={index} className="flex items-center gap-10">
            <span>{ticker}</span>
            <span className="text-primary">///</span>
          </span>
        ))}
      </div>
    </div>
  )
}
