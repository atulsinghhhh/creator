"use client";

import { useId, useState } from "react";
import { EyeIcon, EyeOffIcon } from "./icons";

interface FormFieldProps {
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
}

export function FormField({
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  placeholder,
  hint,
  required = true,
}: FormFieldProps) {
  const id = useId();
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-lg border border-line bg-white px-3.5 text-[15px] text-ink placeholder:text-muted focus:border-blurple focus:outline-none focus:ring-4 focus:ring-blurple/15"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted transition-colors hover:text-ink"
          >
            {showPassword ? <EyeOffIcon className="size-4.5" /> : <EyeIcon className="size-4.5" />}
          </button>
        )}
      </div>
      {hint && <p className="mt-1.5 text-[13px] text-muted">{hint}</p>}
    </div>
  );
}
