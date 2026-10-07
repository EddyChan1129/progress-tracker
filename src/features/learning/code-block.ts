export function insertCodeBlock(
  value: string,
  start: number,
  end: number,
  language: string,
) {
  const selected = value.slice(start, end);
  const longestFence = Math.max(
    2,
    ...Array.from(selected.matchAll(/`+/g), (match) => match[0].length),
  );
  const fence = "`".repeat(longestFence + 1);
  const before = value.slice(0, start);
  const after = value.slice(end);
  const opening = `${before && !before.endsWith("\n") ? "\n" : ""}${fence}${language}\n`;
  const closing = `${selected.endsWith("\n") ? "" : "\n"}${fence}${after && !after.startsWith("\n") ? "\n" : ""}`;
  return {
    content: before + opening + selected + closing + after,
    start: start + opening.length,
    end: start + opening.length + selected.length,
  };
}
