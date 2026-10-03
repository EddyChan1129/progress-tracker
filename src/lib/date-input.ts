// 日期 input 要 YYYY-MM-DD；用本地日期，唔用 UTC，避免時區令日期早一日。
export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
