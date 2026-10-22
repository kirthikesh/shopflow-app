"use client";

import { MAX_QUANTITY } from "@/lib/types";

type Props = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  label: string;
  disabled?: boolean;
};

export function QuantityStepper({ value, onChange, min = 1, label, disabled }: Props) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <output aria-live="polite">{value}</output>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= MAX_QUANTITY}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
