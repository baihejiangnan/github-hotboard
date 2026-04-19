"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function GitHubSignInButton() {
  const [pending, setPending] = useState(false);

  return (
    <button
      className="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await signIn("github", {
          callbackUrl: "/explore"
        });
        setPending(false);
      }}
    >
      {pending ? "跳转中..." : "Connect GitHub"}
    </button>
  );
}

