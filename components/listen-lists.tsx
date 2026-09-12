"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { useAppData } from "@/lib/app-data";
import { PLUS_NAME } from "@/lib/brand";
import { usePlus } from "@/lib/plus";
import {
  OCCASION_PLAYLISTS,
  playlistHref,
  reciterDisplayName,
  sortRecitersForBestOf,
  type Playlist,
} from "@/lib/playlists";
import type { Recitation } from "@/lib/types";

export function useStartList() {
  const router = useRouter();
  const { reciterId, setReciterId } = useAppData();
  const { plus, ready, askPlus } = usePlus();

  return useCallback(
    (listId: string, voiceId?: number | null) => {
      if (!ready) return;
      if (!plus) {
        askPlus("playlists");
        return;
      }
      const reciter = voiceId && voiceId > 0 ? voiceId : reciterId;
      if (voiceId && voiceId > 0) setReciterId(voiceId);
      const href = playlistHref({ listId, reciterId: reciter, stop: 0, play: true });
      if (href) router.push(href);
    },
    [askPlus, plus, ready, reciterId, router, setReciterId],
  );
}

function OccasionCard({
  list,
  reciterName,
  locked,
  onPlay,
}: {
  list: Playlist;
  reciterName: string;
  locked: boolean;
  onPlay: () => void;
}) {
  return (
    <button type="button" className="occ-card tap" onClick={onPlay} aria-label={`Play ${list.title}`}>
      <span className="occ-ar" lang="ar" dir="rtl">
        {list.arabic}
      </span>
      <b>{list.title}</b>
      <span>{list.blurb}</span>
      <span className="occ-meta">
        {locked ? (
          <>
            <Icon name="sparkles" size={13} />
            {PLUS_NAME}
          </>
        ) : (
          <>
            <Icon name="play" size={13} />
            {reciterName}
          </>
        )}
      </span>
    </button>
  );
}

export function ListenLists({ teaser = false }: { teaser?: boolean }) {
  const { recitations, reciterId, reciterName, status } = useAppData();
  const { plus } = usePlus();
  const start = useStartList();
  const occasions = teaser ? OCCASION_PLAYLISTS.slice(0, 4) : OCCASION_PLAYLISTS;
  const voices = teaser
    ? sortRecitersForBestOf(recitations).slice(0, 4)
    : sortRecitersForBestOf(recitations);
  const qari = reciterName(reciterId);
  const locked = !plus;

  return (
    <>
      <section className="picker-section">
        <div className="index-head">
          <span className="label-eyebrow">For occasions</span>
          {teaser ? (
            <Link className="qari-inline tap" href="/listen">
              All lists
              <Icon name="chevron-right" size={13} style={{ color: "var(--text-muted)", flex: "none" }} />
            </Link>
          ) : (
            <span className="lists-hint">{locked ? `Look around · play is ${PLUS_NAME}` : qari}</span>
          )}
        </div>
        <div className="occ-scroller">
          {occasions.map((list) => (
            <OccasionCard
              key={list.id}
              list={list}
              reciterName={qari}
              locked={locked}
              onPlay={() => start(list.id)}
            />
          ))}
        </div>
      </section>
      {status === "ready" && voices.length > 0 ? (
        <section className="picker-section">
          <div className="index-head">
            <span className="label-eyebrow">In this voice</span>
          </div>
          <div className="index-card">
            {voices.map((r: Recitation) => (
              <div key={r.id} className="index-row">
                <button
                  type="button"
                  className="index-play tap"
                  aria-label={`Best of ${reciterDisplayName(r.name, r.style)}`}
                  onClick={() => start("best", r.id)}
                >
                  <span className="in">
                    <Icon name="mic" size={15} />
                  </span>
                  <span className="itext">
                    <b>{reciterDisplayName(r.name, r.style)}</b>
                    <span>Loved passages in this recitation</span>
                  </span>
                  {locked ? (
                    <Icon name="sparkles" size={16} style={{ color: "var(--action-primary)", flex: "none" }} />
                  ) : (
                    <Icon name="play" size={16} style={{ color: "var(--text-muted)", flex: "none" }} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
