import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/50",
        "data-[skeleton=true]:animate-pulse data-[skeleton=true]:bg-muted/50",
        className
      )}
      data-skeleton="true"
      {...props}
    />
  )
}

export { Skeleton }
