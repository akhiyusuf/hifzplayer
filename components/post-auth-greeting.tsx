"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { clerkBrowserReady } from "@/lib/auth/config";
import {
  givenNameFromAccount,
  postAuthGreetingLine,
  postAuthGreetingTrigger,
  readGreetedSignIn,
  writeGreetedSignIn,
} from "@/lib/greeting";
import { plusSalaamLine } from "@/lib/plus-presence";
import { usePlus } from "@/lib/plus";
import { useToast } from "@/lib/toast";

/** One salaam toast after login or sign-up. Quiet on later navigations. */
export function PostAuthGreeting() {
  if (!clerkBrowserReady()) return null;
  return <PostAuthGreetingReady />;
}

function PostAuthGreetingReady() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { plus } = usePlus();
  const { showToast } = useToast();
  const fired = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || fired.current) return;
    const decision = postAuthGreetingTrigger({
      userId: user.id,
      lastSignInAt: user.lastSignInAt,
      createdAt: user.createdAt,
      greetedFor: readGreetedSignIn(),
    });
    if (!decision.greet) return;
    fired.current = true;
    writeGreetedSignIn(decision.key);
    showToast(postAuthGreetingLine(givenNameFromAccount(user), plusSalaamLine(plus)));
  }, [isLoaded, isSignedIn, user, plus, showToast]);

  return null;
}
