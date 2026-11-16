import { NextRequest, NextResponse } from "next/server";
import { calculateMortgageInterest, getTodayIST } from "@/lib/mortgage-engine";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  try {
    const body = await req.json();
    const {
      mortgageDate,
      principalRupees,
      asOfDate = getTodayIST(),
      monthlyRate = 2.0,
      interestMode = "yearly_compound",
    } = body;

    const result = calculateMortgageInterest({
      mortgageDate,
      principalRupees: Number(principalRupees),
      asOfDate,
      monthlyRate: Number(monthlyRate),
      interestMode,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
