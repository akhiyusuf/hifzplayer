"use client";

import { playlistBarTitle } from "@/lib/plus-presence";

export function PlaylistBar({
  title,
  index,
  total,
  nextLabel,
  plusOn = false,
}: {
  title: string;
  index: number;
  total: number;
  nextLabel?: string | null;
  plusOn?: boolean;
}) {
  const last = index >= total - 1;
  return (
    <div className="list-bar" aria-live="polite">
      <b className="list-bar-title">{playlistBarTitle(title, plusOn)}</b>
      <span>
        {index + 1} of {total}
        {last ? " · last stop" : nextLabel ? ` · next ${nextLabel}` : ""}
      </span>
    </div>
  );
}
