import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  // Supabase OAuth flow removed; redirect users back to login
  return NextResponse.redirect(`${origin}/auth/login`)
}
