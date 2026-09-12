"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { ListenLists } from "@/components/listen-lists";
import { OfflineBanner } from "@/components/offline-banner";
import { PLUS_NAME } from "@/lib/brand";
import { usePlus } from "@/lib/plus";

export default function ListenPage() {
  const { plus } = usePlus();
  return (
    <main className="shell" id="main">
      <div className="read-head">
        <div className="rh-left">
          <span className="label-eyebrow" style={{ letterSpacing: "0.12em" }}>
            {plus ? PLUS_NAME : "Look around"}
          </span>
          <h1>Listen</h1>
        </div>
        <div className="rh-actions">
          <Link className="icon-btn tap" href="/settings" aria-label="Settings">
            <Icon name="settings" size={18} />
          </Link>
        </div>
      </div>
      <OfflineBanner />
      <div className="picker-body" style={{ paddingTop: 0 }}>
        <p className="lists-lead">
          Occasion lists and a short Best of each reciter. Reading stays on Read. Playing a list is {PLUS_NAME}.
        </p>
        <ListenLists />
      </div>
    </main>
  );
}
