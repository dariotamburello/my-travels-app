import { ReactNode } from "react";

interface ModalShellProps {
  children: ReactNode;
  className?: string;
}

export default function ModalShell({ children, className = "" }: ModalShellProps) {
  return (
    <div
      className={`w-full rounded-[20px] border border-white/10 bg-[rgba(28,28,30,0.85)] p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-[16px] ${className}`.trim()}
    >
      {children}
    </div>
  );
}
