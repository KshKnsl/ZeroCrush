"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Slider({
  className,
  min = 0,
  max = 1,
  step = 0.01,
  value,
  onValueChange,
  disabled,
  id,
}: {
  id?: string;
  min?: number;
  max?: number;
  step?: number;
  value: number[];
  onValueChange?: (v: number[]) => void;
  disabled?: boolean;
  className?: string;
}) {
  const v = value[0] ?? min;
  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      value={v}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      className={cn(
        "h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary disabled:opacity-50",
        className
      )}
    />
  );
}
