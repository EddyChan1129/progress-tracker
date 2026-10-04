import { auth } from "@/lib/firebase/client";

export async function deleteResource(path: string, body: Record<string, string>) {
  const user = auth.currentUser;
  if (!user) throw new Error("請先登入。");
  const response = await fetch(path, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) {
    throw new Error(typeof result?.error === "string" ? result.error : `刪除失敗，請重試。（HTTP ${response.status}）`);
  }
}
