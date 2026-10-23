import "server-only"

import { unstable_rethrow } from "next/navigation"
import { NextResponse } from "next/server"

import { currentUser, type User } from "@/lib/session"

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

/** Wraps a route handler: maps HttpError to JSON and hides other errors. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args)
    } catch (err) {
      // Let Next.js handle its own control-flow errors (prerender bailouts, redirects).
      unstable_rethrow(err)
      if (err instanceof HttpError) return json({ error: err.message }, err.status)
      console.error(err)
      return json({ error: "Something went wrong. Try again." }, 500)
    }
  }
}

export async function requireUser(): Promise<User> {
  const user = await currentUser()
  if (!user) throw new HttpError(401, "Connect your wallet first.")
  return user
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T
  } catch {
    throw new HttpError(400, "Invalid request body.")
  }
}
