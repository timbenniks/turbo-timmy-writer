"use client";

import { LogIn } from "lucide-react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function SignInButton() {
  return (
    <Button
      className="w-full"
      onClick={() => signIn("github", { callbackUrl: "/" })}
    >
      <LogIn />
      Continue with GitHub
    </Button>
  );
}
