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
}: {
  list: Playlist;
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
        <Icon name="sparkles" size={13} />
        Plus
      </span>
    </button>
  );
}

function PlaylistsLockedCard({ onUnlock }: { onUnlock: () => void }) {
  const pitch = playlistsLockedPitch();
  return (
    <button type="button" className="lists-locked tap" onClick={onUnlock} aria-label={pitch.title}>
      <span className="lists-locked-mark">
        <Icon name="sparkles" size={22} />
      </span>
      <b>{pitch.title}</b>
      <span>{pitch.body}</span>
      <span className="occ-meta">{pitch.cta}</span>
    </button>
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

  return (
    <section className="picker-section">
      <div className="index-head">
        <span className="label-eyebrow">For occasions</span>
        {locked ? null : <span className="lists-hint">{occasionHintCopy(plus)}</span>}
      </div>
      {locked ? (
        <PlaylistsLockedCard
          onUnlock={() => {
            if (ready) askPlus("playlists");
          }}
        />
      ) : (
        <div className="occ-scroller">
          {OCCASION_PLAYLISTS.map((list) => (
            <OccasionCard key={list.id} list={list} onPlay={() => start(list.id)} />
          ))}
        </div>
      )}
    </section>
  );
}
