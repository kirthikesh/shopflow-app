"use client";

// There is no login yet, so each browser gets an anonymous id for its cart.
const KEY = "shopflow-user-id";

export function getUserId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = `anon-${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "anon-guest";
  }
}
