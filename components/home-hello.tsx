"use client";

import { useUser } from "@clerk/nextjs";
import { clerkBrowserReady } from "@/lib/auth/config";
import { GUEST_NAME, givenNameFromAccount } from "@/lib/greeting";
import { plusSalaamLine } from "@/lib/plus-presence";
import { usePlus } from "@/lib/plus";

export function HomeHello() {
  const { plus } = usePlus();
  return (
    <div className="rh-left">
      <span className="label-eyebrow salaam">{plusSalaamLine(plus)}</span>
      <HomeHelloName />
    </div>
  );
}

function HomeHelloName() {
  if (!clerkBrowserReady()) return <h1>{GUEST_NAME}</h1>;
  return <HomeHelloNameSigned />;
}

function HomeHelloNameSigned() {
  const { isLoaded, isSignedIn, user } = useUser();
  const name = !isLoaded ? "\u00a0" : isSignedIn ? givenNameFromAccount(user) : GUEST_NAME;
  return <h1>{name}</h1>;
}
