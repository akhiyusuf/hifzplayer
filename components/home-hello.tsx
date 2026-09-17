"use client";

import { useAuth } from "@/components/auth-root";
import { GUEST_NAME } from "@/lib/greeting";
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
  const { loaded, signedIn, name } = useAuth();
  const heading = !loaded ? "\u00a0" : signedIn ? name || GUEST_NAME : GUEST_NAME;
  return <h1>{heading}</h1>;
}
