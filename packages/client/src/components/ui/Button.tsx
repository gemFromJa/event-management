import React from "react";
import cn from "../../utils/cn";

export default function Button({
  onClick,
  children,
  variant,
  className,
  disabled,
}: {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  variant: "dark" | "red" | "border";
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "cursor-pointer bg-gray-900 text-white text-center text-sm font-semibold px-4 py-2 rounded-full hover:bg-gray-700 transition-colors flex items-center justify-center gap-1",
        variant === "red" && "bg-orange-500 text-white",
        variant === "dark" && "bg-gray-900 text-white",
        variant === "border" &&
          "bg-transparent border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-white",
        className
      )}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
