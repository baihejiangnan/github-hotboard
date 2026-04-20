import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const callbackUrl = url.searchParams.get("callbackUrl") || "/explore";

  // 清除所有 next-auth 相关的 cookies
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  for (const cookie of allCookies) {
    if (cookie.name.startsWith("next-auth") || cookie.name.startsWith("__Secure-next-auth")) {
      cookieStore.delete(cookie.name);
    }
  }

  // 重定向到 NextAuth 的 signout 端点，然后再重定向到 callbackUrl
  return NextResponse.redirect(
    new URL(`/api/auth/signout?callbackUrl=${encodeURIComponent(callbackUrl)}`, request.url)
  );
}
