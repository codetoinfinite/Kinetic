/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Code Block" (boardui.com/components/line-chart-card).
 * No BoardUI source was used.
 */

/**
 * A deliberately small TSX tokenizer for docs snippets. It is not a parser:
 * it reads left to right with one sticky regex per step and a tiny mode stack
 * (code / JSX tag / JSX text), which is enough to colour keywords, strings,
 * comments, numbers, function calls, JSX tag names and attribute names in the
 * kind of 5–60 line examples a docs page shows. No dependency, no WASM, no
 * grammar files.
 */

export type TokenKind =
  | "plain"
  | "comment"
  | "keyword"
  | "string"
  | "number"
  | "function"
  | "tag"
  | "attr"
  | "punct";

export interface Token {
  kind: TokenKind;
  text: string;
}

/** Tailwind classes per token kind. Every colour is a kit token that flips in dark mode. */
export const TOKEN_CLASS: Record<TokenKind, string> = {
  plain: "text-text-primary",
  comment: "text-text-secondary",
  keyword: "text-status-purple-text",
  string: "text-status-orange-text",
  number: "text-calendar-event-pink-time",
  function: "text-calendar-event-blue-title",
  tag: "text-calendar-event-emerald-time",
  attr: "text-status-cyan-text",
  punct: "text-text-secondary",
};

const KEYWORDS = new Set([
  "as", "async", "await", "break", "case", "catch", "class", "const", "continue",
  "default", "delete", "do", "else", "enum", "export", "extends", "for", "from",
  "function", "if", "implements", "import", "in", "instanceof", "interface", "let",
  "new", "of", "readonly", "return", "satisfies", "static", "switch", "this",
  "throw", "try", "type", "typeof", "var", "void", "while", "yield", "keyof",
]);

/** Literals read as values, so they share the number colour. */
const LITERALS = new Set(["true", "false", "null", "undefined", "NaN", "Infinity"]);

type Mode =
  | { kind: "code"; braces: number }
  | { kind: "tag"; closing: boolean }
  | { kind: "text" };

const RE = {
  space: /\s+/y,
  lineComment: /\/\/[^\n]*/y,
  blockComment: /\/\*[\s\S]*?(?:\*\/|$)/y,
  string: /"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?|`(?:\\[\s\S]|[^`\\])*`?/y,
  number: /(?:0[xX][\da-fA-F_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?n?)/y,
  ident: /[A-Za-z_$][\w$]*/y,
  tagName: /[A-Za-z_$][\w$.:-]*/y,
  operator: /=>|\.\.\.|\?\?=?|\?\.|[=!]==?|[<>]=?|&&|\|\||[-+*/%&|^~!?:;,.()[\]{}=<>@#]/y,
  jsxText: /[^<{]+/y,
  any: /[\s\S]/y,
};

function match(re: RegExp, src: string, at: number): string | null {
  re.lastIndex = at;
  const m = re.exec(src);
  return m && m[0].length > 0 ? m[0] : null;
}

// #region critical
/**
 * Split TSX source into coloured tokens. The mode stack is what lets one
 * regex pass tell `a < b` from `<Card>`: a `<` opens a tag only in
 * expression position (start, after a keyword, or after punctuation other
 * than `)`/`]`), and once inside a tag every bare identifier is an attribute.
 */
export function tokenizeTsx(src: string): Token[] {
  const out: Token[] = [];
  const stack: Mode[] = [{ kind: "code", braces: 0 }];
  let lastSignificant: Token | null = null;
  let i = 0;

  const push = (kind: TokenKind, text: string) => {
    const prev = out[out.length - 1];
    if (prev && prev.kind === kind) prev.text += text;
    else out.push({ kind, text });
    if (kind !== "comment" && text.trim() !== "") lastSignificant = { kind, text };
  };
  const top = () => stack[stack.length - 1] ?? { kind: "code" as const, braces: 0 };
  const inExpressionPosition = () => {
    const last: Token | null = lastSignificant;
    if (!last) return true;
    if (last.kind === "keyword") return true;
    return last.kind === "punct" && !/[)\]]$/.test(last.text);
  };
  const openTag = (closing: boolean) => {
    push("punct", closing ? "</" : "<");
    i += closing ? 2 : 1;
    const name = match(RE.tagName, src, i);
    if (name) {
      push("tag", name);
      i += name.length;
    }
    stack.push({ kind: "tag", closing });
  };

  while (i < src.length) {
    const mode = top();

    if (mode.kind === "text") {
      if (src.startsWith("</", i)) {
        if (src[i + 2] === ">") {
          // Fragment close `</>` ends this text run.
          push("punct", "</>");
          i += 3;
          stack.pop();
        } else openTag(true);
        continue;
      }
      if (src[i] === "<") {
        if (src[i + 1] === ">") {
          push("punct", "<>");
          i += 2;
          stack.push({ kind: "text" });
        } else openTag(false);
        continue;
      }
      if (src[i] === "{") {
        push("punct", "{");
        i += 1;
        stack.push({ kind: "code", braces: 0 });
        continue;
      }
      const text = match(RE.jsxText, src, i) ?? src.charAt(i);
      out.push({ kind: "plain", text });
      i += text.length;
      continue;
    }

    const space = match(RE.space, src, i);
    if (space) {
      out.push({ kind: "plain", text: space });
      i += space.length;
      continue;
    }
    const comment = match(RE.lineComment, src, i) ?? match(RE.blockComment, src, i);
    if (comment) {
      push("comment", comment);
      i += comment.length;
      continue;
    }
    const str = match(RE.string, src, i);
    if (str) {
      push("string", str);
      i += str.length;
      continue;
    }

    if (mode.kind === "tag") {
      if (src.startsWith("/>", i)) {
        push("punct", "/>");
        i += 2;
        stack.pop();
        continue;
      }
      if (src[i] === ">") {
        push("punct", ">");
        i += 1;
        stack.pop();
        // A closing tag also ends the text run it closed; an opening tag starts one.
        if (mode.closing) {
          if (top().kind === "text") stack.pop();
        } else stack.push({ kind: "text" });
        continue;
      }
      if (src[i] === "{") {
        push("punct", "{");
        i += 1;
        stack.push({ kind: "code", braces: 0 });
        continue;
      }
      const attr = match(RE.tagName, src, i);
      if (attr) {
        push("attr", attr);
        i += attr.length;
        continue;
      }
    } else {
      if (src[i] === "<" && inExpressionPosition()) {
        if (src[i + 1] === ">") {
          push("punct", "<>");
          i += 2;
          stack.push({ kind: "text" });
          continue;
        }
        if (/[A-Za-z_$]/.test(src[i + 1] ?? "")) {
          openTag(false);
          continue;
        }
      }
      if (src[i] === "{") {
        mode.braces += 1;
      } else if (src[i] === "}") {
        if (mode.braces > 0) mode.braces -= 1;
        else if (stack.length > 1) {
          push("punct", "}");
          i += 1;
          stack.pop();
          continue;
        }
      }
      const num = match(RE.number, src, i);
      if (num) {
        push("number", num);
        i += num.length;
        continue;
      }
      const ident = match(RE.ident, src, i);
      if (ident) {
        const next = src.slice(i + ident.length).match(/^\s*(\(|<[A-Za-z_$][\w$]*>\()/);
        const kind: TokenKind = KEYWORDS.has(ident)
          ? "keyword"
          : LITERALS.has(ident)
            ? "number"
            : next
              ? "function"
              : "plain";
        push(kind, ident);
        i += ident.length;
        continue;
      }
    }

    const op = match(RE.operator, src, i) ?? match(RE.any, src, i) ?? src.charAt(i);
    push("punct", op);
    i += op.length;
  }

  return out;
}
// #endregion

/**
 * Re-cut a token stream at newlines so each line can be rendered as its own
 * row (line numbers, highlighted lines). A multi-line comment or template
 * string keeps its colour on every line it spans.
 */
export function splitLines(tokens: Token[]): Token[][] {
  const lines: Token[][] = [[]];
  for (const token of tokens) {
    const parts = token.text.split("\n");
    parts.forEach((part, index) => {
      if (index > 0) lines.push([]);
      if (part) lines[lines.length - 1]?.push({ kind: token.kind, text: part });
    });
  }
  return lines;
}
