import PocketBase, { BaseAuthStore } from 'pocketbase'

// Das SDK im Browser spricht nur den Proxy an. Das Token liegt im
// httpOnly-Cookie, deshalb hält der authStore nichts Dauerhaftes (ADR 0003).
export function createBrowserPocketBase() {
  const pb = new PocketBase('/pb', new BaseAuthStore())
  pb.autoCancellation(false)
  return pb
}
