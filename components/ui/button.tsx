import { Link } from "@/i18n/navigation";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const buttonStyles = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap px-5 text-sm font-semibold transition-[background-color,color,border-color,transform] duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermilion focus-visible:ring-offset-2 disabled:pointer-events-none disabled:transform-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-vermilion text-white hover:bg-vermilion-dark",
        secondary: "border border-ink/20 bg-transparent text-ink hover:border-ink/50 hover:bg-ink/5",
        quiet: "text-ink hover:bg-ink/5",
        light: "bg-paper text-ink hover:bg-white",
      },
      size: {
        default: "",
        small: "min-h-9 px-3 text-xs",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

type Variants = VariantProps<typeof buttonStyles>;

export function Button({ className, variant, size, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & Variants) {
  return <button className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}

export function ButtonLink({
  className,
  variant,
  size,
  children,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & Variants & { href: string; children: ReactNode }) {
  const { href, ...linkProps } = props;
  return <Link href={href} className={cn(buttonStyles({ variant, size }), className)} {...linkProps}>{children}</Link>;
}
