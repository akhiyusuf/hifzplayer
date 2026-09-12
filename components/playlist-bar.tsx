"use client";

export function PlaylistBar({
  title,
  index,
  total,
  nextLabel,
}: {
  title: string;
  index: number;
  total: number;
  nextLabel?: string | null;
}) {
  const last = index >= total - 1;
  return (
    <div className="list-bar" aria-live="polite">
      <b className="list-bar-title">{title}</b>
      <span>
        {index + 1} of {total}
        {last ? " · last stop" : nextLabel ? ` · next ${nextLabel}` : ""}
      </span>
    </div>
  );
}
