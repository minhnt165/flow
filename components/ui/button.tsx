import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 font-sans font-semibold whitespace-nowrap no-underline transition-colors outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        primary: "bg-accent text-bg hover:bg-accent-hover hover:text-bg",
        secondary:
          "border border-border bg-surface font-medium text-text hover:bg-surface-2 hover:text-text",
        field:
          "border border-border bg-bg font-medium text-text hover:bg-surface-2 hover:text-text",
        ghost: "font-medium text-muted-foreground hover:bg-surface-2 hover:text-text",
        link: "font-medium text-accent hover:text-accent-hover",
        danger: "border border-border bg-surface text-danger hover:bg-surface-2 hover:text-danger",
      },
      size: {
        toolbar: "min-h-[42px] rounded-full px-4 text-[13px]",
        form: "min-h-[50px] rounded-[14px] px-5 text-[15px]",
        md: "min-h-11 rounded-[14px] px-4 text-sm",
        sm: "min-h-9 rounded-full px-3 text-[13px]",
        icon: "size-10 rounded-full",
        "icon-lg": "size-11 rounded-[14px]",
      },
    },
    defaultVariants: { variant: "primary", size: "toolbar" },
  },
);

function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
