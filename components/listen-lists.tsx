"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { useAppData } from "@/lib/app-data";
import {
  listenLeadCopy,
  occasionHintCopy,
  playlistsLocked,
  playlistsLockedPitch,
} from "@/lib/plus-presence";
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
  onPlay,
  locked = false,
}: {
  list: Playlist;
  onPlay: () => void;
  locked?: boolean;
}) {
  return (
    <button
      type="button"
      className={`occ-card tap${locked ? " locked" : ""}`}
      onClick={onPlay}
      aria-label={locked ? `${list.title} — Plus` : `Play ${list.title}`}
    >
      <span className="occ-ar" lang="ar" dir="rtl">
        {list.arabic}
      </span>
      <b>{list.title}</b>
      <span>{list.blurb}</span>
      <span className="occ-meta">
        {locked ? (
          <>
            <Icon name="lock" size={13} />
            Plus
          </>
        ) : (
          <>
            <Icon name="sparkles" size={13} />
            Plus
          </>
        )}
      </span>
    </button>
  );
}

function PlaylistsLockedBanner({ onUnlock }: { onUnlock: () => void }) {
  const pitch = playlistsLockedPitch();
  return (
    <div className="lists-locked-banner">
      <span className="lists-locked-mark">
        <Icon name="sparkles" size={22} />
      </span>
      <div className="lists-locked-copy">
        <b>{pitch.title}</b>
        <span>{pitch.body}</span>
      </div>
      <button type="button" className="btn-primary lists-locked-cta" onClick={onUnlock}>
        {pitch.cta}
      </button>
    </div>
  );
}

export function ListenPageIntro() {
  const { plus } = usePlus();
  return <p className="lists-lead">{listenLeadCopy(plus)}</p>;
}

export function ListenLists() {
  const { plus, askPlus, ready } = usePlus();
  const start = useStartList();
  const locked = playlistsLocked(plus);
  const unlock = () => {
    if (ready) askPlus("playlists");
  };

  return (
    <section className="picker-section">
      <div className="index-head">
        <span className="label-eyebrow">For occasions</span>
        {locked ? null : <span className="lists-hint">{occasionHintCopy(plus)}</span>}
      </div>
      {locked ? <PlaylistsLockedBanner onUnlock={unlock} /> : null}
      <div className="occ-scroller">
        {OCCASION_PLAYLISTS.map((list) => (
          <OccasionCard
            key={list.id}
            list={list}
            locked={locked}
            onPlay={() => (locked ? unlock() : start(list.id))}
          />
        ))}
      </div>
    </section>
  );
}
