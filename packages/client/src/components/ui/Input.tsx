import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error, ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors ${
        error
          ? "border-red-300 focus:border-red-400 bg-red-50"
          : "border-gray-200 focus:border-orange-400 bg-white"
      } ${className}`}
      {...props}
    />
  )
);

Input.displayName = "Input";
