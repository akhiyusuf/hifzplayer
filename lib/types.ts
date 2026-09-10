export type Chapter = {
  id: number;
  name_simple: string;
  name_arabic: string;
  verses_count: number;
  translated_name?: { name: string } | null;
};

export type Recitation = {
  id: number;
  name: string;
  style: string;
};

export type Word = {
  pos: number;
  ar: string;
  taj: string | null;
  tajHTML?: string | null;
  gloss: string;
  tr: string;
};

export type Mark = {
  afterPos: number;
  ar: string;
  kind: string;
};

export type VerseAudio = {
  url: string;
  segments: import("./audio").WordSeg[] | null;
};

export type Verse = {
  key: string;
  number: number;
  words: Word[];
  marks: Mark[];
  translation: string;
  audio: VerseAudio | null;
  _est?: import("./audio").WordSeg[] | null;
  _estDur?: number;
  _phrases?: Word[][];
};

export type Recent = {
  chapter: number;
  from: number;
  to: number;
  name?: string;
};

export type Session = {
  chapter: number;
  from: number;
  to: number;
  verse: number;
  name: string;
  reciterId: number;
  reciterName: string;
  updatedAt: number;
};
