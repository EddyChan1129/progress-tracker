export const allowedMarkdownElements = [
  "a",
  "blockquote",
  "br",
  "code",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "ul",
];

export function markdownUrlTransform(url: string, key: string) {
  if (key !== "href") return undefined;

  try {
    const protocol = new URL(url).protocol;

    return protocol === "http:" || protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}
