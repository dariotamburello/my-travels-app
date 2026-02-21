import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

function buttonBase(className = ""): string {
  return `rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim();
}

export function PrimaryButton({ className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={buttonBase(
        `bg-[linear-gradient(135deg,#3b82f6,#2563eb)] text-white hover:brightness-110 ${className}`,
      )}
    />
  );
}

export function DestructiveButton({ className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={buttonBase(`bg-[#ef4444] text-white hover:bg-[#dc2828] ${className}`)}
    />
  );
}

export function SecondaryButton({ className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={buttonBase(
        `border border-white/10 bg-white/5 text-[#a1a1aa] hover:bg-white/10 hover:text-white ${className}`,
      )}
    />
  );
}
