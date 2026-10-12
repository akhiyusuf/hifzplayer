export const PALETTE_IDS = ["orange", "green", "ink", "pink", "gold"] as const;

export type PaletteId = (typeof PALETTE_IDS)[number];

export const DEFAULT_PALETTE: PaletteId = "orange";

export const PALETTES: readonly {
  id: PaletteId;
  name: string;
  swatch: string;
}[] = [
  { id: "orange", name: "Orange", swatch: "#e8590c" },
  { id: "green", name: "Green", swatch: "#2f7a56" },
  { id: "ink", name: "Black and white", swatch: "#171717" },
  { id: "pink", name: "Pink", swatch: "#c44d6e" },
  { id: "gold", name: "Gold", swatch: "#c4891a" },
];

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === "string" && (PALETTE_IDS as readonly string[]).includes(value);
}

export function parsePalette(value: unknown): PaletteId {
  return isPaletteId(value) ? value : DEFAULT_PALETTE;
}
