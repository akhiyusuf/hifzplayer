"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { useAppData } from "@/lib/app-data";
import { PLUS_NAME } from "@/lib/brand";
import { usePlus } from "@/lib/plus";
import { OCCASION_PLAYLISTS, playlistHref, type Playlist } from "@/lib/playlists";

export function useStartList() {
  const router = useRouter();
  const { reciterId } = useAppData();
  const { plus, ready, askPlus } = usePlus();

  return useCallback(
    (listId: string) => {
      if (!ready) return;
      if (!plus) {
        askPlus("playlists");
        return;
      }
      const href = playlistHref({ listId, reciterId, stop: 0, play: true });
      if (href) router.push(href);
    },
    [askPlus, plus, ready, reciterId, router],
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

export function ListenLists() {
  const { reciterId, reciterName } = useAppData();
  const { plus } = usePlus();
  const start = useStartList();
  const qari = reciterName(reciterId);
  const locked = !plus;

  return (
    <section className="picker-section">
      <div className="index-head">
        <span className="label-eyebrow">For occasions</span>
        <span className="lists-hint">{locked ? `Look around · play is ${PLUS_NAME}` : qari}</span>
      </div>
      <div className="occ-scroller">
        {OCCASION_PLAYLISTS.map((list) => (
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
  );
}
