import { NextResponse } from "next/server"

import { isPublicSignupEnabled } from "@/lib/signup-config"

export async function GET() {
  return NextResponse.json({
    signupEnabled: isPublicSignupEnabled(),
  })
}
