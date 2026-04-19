import { useId } from "react";

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ className, size = "md" }: LoadingSpinnerProps) {
  const titleId = useId();

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(`animate-spin text-foreground ${sizeClasses[size]}`, className)}
      role="status"
      aria-labelledby={titleId}
    >
      <title id={titleId}>Loading</title>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}