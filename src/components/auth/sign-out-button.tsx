/**
 * Shared sign-out button component.
 */
"use client";

import { LogOut } from "lucide-react";

interface SignOutButtonProps {
  className?: string;
}

export function SignOutButton({ className = "" }: SignOutButtonProps) {
  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button
      onClick={handleSignOut}
      className={`
        inline-flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors
        ${className}
      `}
    >
      <LogOut size={16} />
      Sair
    </button>
  );
}

