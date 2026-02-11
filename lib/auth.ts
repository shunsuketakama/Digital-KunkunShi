import { headers } from "next/headers";

export function getUserIdFromRequest(): string {
  const userId = headers().get("x-user-id");
  if (userId) return userId;
  return "00000000-0000-0000-0000-000000000001";
}
