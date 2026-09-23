"use client";

import { useEffect, useRef } from "react";
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
import { useAuth } from "@/components/auth-root";

/** One salaam toast after login or sign-up. Quiet on later navigations. */
export function PostAuthGreeting() {
  const { loaded, signedIn, userId, name } = useAuth();
  const { plus } = usePlus();
  const { showToast } = useToast();
  const fired = useRef(false);

  useEffect(() => {
    if (!loaded || !signedIn || !userId || fired.current) return;
    const decision = postAuthGreetingTrigger({
      userId,
      lastSignInAt: Date.now(),
      createdAt: Date.now(),
      greetedFor: readGreetedSignIn(),
    });
    if (!decision.greet) return;
    fired.current = true;
    writeGreetedSignIn(decision.key);
    showToast(postAuthGreetingLine(givenNameFromAccount({ firstName: name, fullName: name, username: null }), plusSalaamLine(plus)));
  }, [loaded, signedIn, userId, name, plus, showToast]);

  return null;
}
