import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: Parameters<typeof buttonClassName>[0];
  className?: string;
};

export function ButtonLink({ className, variant = "primary", ...props }: Props) {
  return <Link className={buttonClassName(variant, className)} {...props} />;
}
