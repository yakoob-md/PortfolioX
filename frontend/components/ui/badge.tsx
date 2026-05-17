import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
    "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40",
    {
        variants: {
            variant: {
                default: "border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                secondary: "border-transparent bg-muted text-muted-foreground",
                destructive: "border-transparent bg-red-500/10 text-red-600 dark:text-red-400",
                outline: "border-border text-muted-foreground",
                warning: "border-transparent bg-amber-500/10 text-amber-600 dark:text-amber-400",
            },
        },
        defaultVariants: { variant: "default" },
    }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
