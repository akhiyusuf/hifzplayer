const TAJ_TAGS = new Set(["tajweed", "rule"]);

function esc(s: string | null | undefined): string {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

let tajRoot: HTMLDivElement | null = null;
function root(): HTMLDivElement {
  if (!tajRoot) {
    tajRoot = document.implementation.createHTMLDocument("taj").createElement("div");
  }
  return tajRoot;
}

export function tajToSpans(src: string | null | undefined): string {
  try {
    const el = root();
    el.innerHTML = String(src ?? "");
    const walk = (node: Node): string => {
      let out = "";
      for (const c of Array.from(node.childNodes)) {
        if (c.nodeType === 3) out += esc(c.nodeValue);
        else if (c.nodeType === 1) {
          const eln = c as Element;
          const cls = (eln.getAttribute?.("class") || "").trim().split(/\s+/)[0] || "";
          if (TAJ_TAGS.has(eln.tagName.toLowerCase()) && /^[\w-]+$/.test(cls)) {
            out += `<i class="tj tj-${cls}">${walk(c)}</i>`;
          } else out += walk(c);
        }
      }
      return out;
    };
    const html = walk(el);
    el.innerHTML = "";
    return html;
  } catch {
    return esc(src);
  }
}

export function splitTajweedVerse(src: string | null | undefined, wordCount: number): string[] | null {
  if (!src || !wordCount) return null;
  try {
    const el = root();
    el.innerHTML = String(src);
    const out: string[] = [];
    const stack: string[] = [];
    let cur = "";
    let hasText = false;
    const openAll = () => stack.map((cl) => `<i class="tj tj-${cl}">`).join("");
    const closeAll = () => "</i>".repeat(stack.length);
    const pushWord = () => {
      if (hasText) out.push(cur);
      cur = "";
      hasText = false;
    };
    const boundary = () => {
      cur += closeAll();
      pushWord();
      cur = openAll();
    };
    const emitText = (txt: string) => {
      const parts = String(txt).split(/\s+/);
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) boundary();
        if (parts[i]) {
          cur += esc(parts[i]);
          hasText = true;
        }
      }
    };
    const walk = (node: Node) => {
      for (const c of Array.from(node.childNodes)) {
        if (c.nodeType === 3) emitText(c.nodeValue || "");
        else if (c.nodeType === 1) {
          const eln = c as Element;
          const cls = (eln.getAttribute?.("class") || "").trim().split(/\s+/)[0] || "";
          if (TAJ_TAGS.has(eln.tagName.toLowerCase()) && /^[\w-]+$/.test(cls)) {
            stack.push(cls);
            cur += `<i class="tj tj-${cls}">`;
            walk(c);
            stack.pop();
            cur += "</i>";
          } else if (cls === "end") boundary();
          else walk(c);
        }
      }
    };
    walk(el);
    pushWord();
    el.innerHTML = "";
    for (let i = out.length - 1; i >= 0 && out.length > wordCount; i--) {
      const bare = out[i].replace(/<[^>]+>/g, "");
      if (/^[۞۩]+$/.test(bare)) {
        if (i + 1 < out.length) out[i + 1] = out[i] + " " + out[i + 1];
        else if (i > 0) out[i - 1] = out[i - 1] + " " + out[i];
        else continue;
        out.splice(i, 1);
      }
    }
    return out.length === wordCount ? out : null;
  } catch {
    return null;
  }
}
