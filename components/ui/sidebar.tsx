import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const sidebarGroupLabelVariants = cva(
  "flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-sidebar-muted-foreground uppercase tracking-wider",
  {
    variants: {
      variant: {
        default: "text-sidebar-muted-foreground",
        active: "text-sidebar-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface SidebarGroupLabelProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sidebarGroupLabelVariants> {
  asChild?: boolean
}

const SidebarGroupLabel = React.forwardRef<HTMLDivElement, SidebarGroupLabelProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? "span" : "div"
    return (
      <Comp
        className={cn(sidebarGroupLabelVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
SidebarGroupLabel.displayName = "SidebarGroupLabel"

export { SidebarGroupLabel, sidebarGroupLabelVariants }