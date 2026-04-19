"use client";

export async function readApiError(response: Response, fallback: string) {
  const payload = await response
    .json()
    .catch(() => null) as { error?: string } | null;

  if (response.status === 401) {
    return "当前登录态不可用，请刷新页面后重试。";
  }

  return payload?.error || fallback;
}

