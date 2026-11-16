import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const user = await authenticateRequest(req);
  if (!user) {
    return unauthorizedResponse();
  }

  return NextResponse.json({
    success: true,
    user,
  });
}
