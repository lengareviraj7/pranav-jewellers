import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AUTH_COOKIE_NAME, UserSession } from "./auth";
import connectToDatabase from "./mongodb";
import User from "@/models/User";

export async function authenticateRequest(req: NextRequest): Promise<UserSession | null> {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;

  await connectToDatabase();
  const user = await User.findById(decoded.userId).lean();
  if (!user || !user.isActive) return null;

  return decoded;
}

export function unauthorizedResponse(message = "Unauthorized access") {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}
