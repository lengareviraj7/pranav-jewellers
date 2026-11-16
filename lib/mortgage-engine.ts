export interface MortgageInput {
  mortgageDate: string; // YYYY-MM-DD
  principalRupees: number;
  asOfDate: string; // YYYY-MM-DD
  monthlyRate?: number; // e.g. 2, 2.5, 3
  interestMode?: 'yearly_compound' | 'simple';
}

export interface YearlyBreakdownItem {
  year: number;
  months: number;
  startingPrincipalPaise: number;
  startingPrincipalRupees: number;
  interestPaise: number;
  interestRupees: number;
  endingAmountPaise: number;
  endingAmountRupees: number;
}

export interface MortgageResult {
  mortgageDate: string;
  asOfDate: string;
  principalPaise: number;
  principalRupees: number;
  monthlyRate: number;
  interestMode: 'yearly_compound' | 'simple';
  completedMonths: number;
  remainderDays: number;
  chargeableMonths: number;
  interestPaise: number;
  interestRupees: number;
  totalDuePaise: number;
  totalDueRupees: number;
  elapsedDescription: string;
  yearlyBreakdown: YearlyBreakdownItem[];
  ruleVersion: string;
}

export interface ParsedDate {
  year: number;
  month: number;
  day: number;
}

export function parseDate(dateStr: string): ParsedDate {
  if (!dateStr || typeof dateStr !== "string") {
    throw new Error("Date string is required");
  }
  const parts = dateStr.trim().split("-");
  if (parts.length !== 3) {
    throw new Error(`Invalid date format "${dateStr}". Expected YYYY-MM-DD.`);
  }
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Invalid date values in "${dateStr}". Expected valid YYYY-MM-DD.`);
  }

  const maxDays = getDaysInMonth(year, month);
  if (day > maxDays) {
    throw new Error(`Invalid date "${dateStr}". Month ${month} only has ${maxDays} days in ${year}.`);
  }

  return { year, month, day };
}

export function getDaysInMonth(year: number, month: number): number {
  if (month === 2) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28;
  }
  if (month === 4 || month === 6 || month === 9 || month === 11) {
    return 30;
  }
  return 31;
}

function daysSinceEpoch(year: number, month: number, day: number): number {
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

export function daysBetween(dateA: ParsedDate, dateB: ParsedDate): number {
  return daysSinceEpoch(dateA.year, dateA.month, dateA.day) - daysSinceEpoch(dateB.year, dateB.month, dateB.day);
}

export function addMonthsClamped(date: ParsedDate, monthsToAdd: number): ParsedDate {
  if (monthsToAdd === 0) return { ...date };
  const totalMonths = 12 * date.year + (date.month - 1) + monthsToAdd;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  const maxDays = getDaysInMonth(targetYear, targetMonth);
  return {
    year: targetYear,
    month: targetMonth,
    day: Math.min(date.day, maxDays),
  };
}

export function formatDate(date: ParsedDate): string {
  const y = date.year.toString().padStart(4, "0");
  const m = date.month.toString().padStart(2, "0");
  const d = date.day.toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getTodayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function calculateMortgageInterest(input: MortgageInput): MortgageResult {
  const { mortgageDate, principalRupees, asOfDate } = input;
  const monthlyRate = input.monthlyRate ?? 2;
  const interestMode = input.interestMode ?? "yearly_compound";

  if (typeof principalRupees !== "number" || isNaN(principalRupees) || principalRupees <= 0) {
    throw new Error("Principal amount must be a valid number strictly greater than ₹0.");
  }
  if (typeof monthlyRate !== "number" || isNaN(monthlyRate) || monthlyRate < 0) {
    throw new Error("Monthly interest rate must be a non-negative number.");
  }
  if (interestMode !== "yearly_compound" && interestMode !== "simple") {
    throw new Error("Interest mode must be 'yearly_compound' or 'simple'.");
  }

  const mStart = parseDate(mortgageDate);
  const mEnd = parseDate(asOfDate);
  const diffDays = daysBetween(mEnd, mStart);

  if (diffDays < 0) {
    throw new Error("Mortgage date cannot be in the future relative to today's date.");
  }

  const principalPaise = Math.round(100 * principalRupees);
  const ruleVersion = interestMode === "yearly_compound" ? "v2-siddheshwar-yearly-compound" : "v2-siddheshwar-simple";

  if (diffDays === 0) {
    return {
      mortgageDate,
      asOfDate,
      principalPaise,
      principalRupees: principalPaise / 100,
      monthlyRate,
      interestMode,
      completedMonths: 0,
      remainderDays: 0,
      chargeableMonths: 0,
      interestPaise: 0,
      interestRupees: 0,
      totalDuePaise: principalPaise,
      totalDueRupees: principalPaise / 100,
      elapsedDescription: "0 days (same day)",
      yearlyBreakdown: [],
      ruleVersion,
    };
  }

  // Count completed calendar months
  let u = 0;
  while (daysBetween(mEnd, addMonthsClamped(mStart, u + 1)) >= 0) {
    u++;
  }

  // Remainder days after completed months
  const h = daysBetween(mEnd, addMonthsClamped(mStart, u));

  // Chargeable months tier logic
  let chargeableMonths: number;
  if (u === 0) {
    chargeableMonths = 1; // Minimum 1 full month rule for any positive duration < 1 month
  } else if (h <= 5) {
    chargeableMonths = u + 0;
  } else if (h <= 15) {
    chargeableMonths = u + 0.5;
  } else {
    chargeableMonths = u + 1;
  }

  const yearlyBreakdown: YearlyBreakdownItem[] = [];
  let totalInterestPaise = 0;
  let totalDuePaise = principalPaise;

  if (interestMode === "simple") {
    totalInterestPaise = Math.round((principalPaise * monthlyRate * chargeableMonths) / 100);
    totalDuePaise = principalPaise + totalInterestPaise;
    yearlyBreakdown.push({
      year: 1,
      months: chargeableMonths,
      startingPrincipalPaise: principalPaise,
      startingPrincipalRupees: principalPaise / 100,
      interestPaise: totalInterestPaise,
      interestRupees: totalInterestPaise / 100,
      endingAmountPaise: totalDuePaise,
      endingAmountRupees: totalDuePaise / 100,
    });
  } else {
    // yearly_compound
    let remainingMonths = chargeableMonths;
    let currentPrincipalPaise = principalPaise;
    let yearNum = 1;

    while (remainingMonths > 0) {
      const blockMonths = Math.min(remainingMonths, 12);
      const interestPaise = Math.round((currentPrincipalPaise * monthlyRate * blockMonths) / 100);
      const endingPaise = currentPrincipalPaise + interestPaise;

      yearlyBreakdown.push({
        year: yearNum,
        months: blockMonths,
        startingPrincipalPaise: currentPrincipalPaise,
        startingPrincipalRupees: currentPrincipalPaise / 100,
        interestPaise,
        interestRupees: interestPaise / 100,
        endingAmountPaise: endingPaise,
        endingAmountRupees: endingPaise / 100,
      });

      totalInterestPaise += interestPaise;
      currentPrincipalPaise = endingPaise;
      remainingMonths = Math.round((remainingMonths - blockMonths) * 100) / 100;
      yearNum++;
    }
    totalDuePaise = currentPrincipalPaise;
  }

  let elapsedDescription: string;
  if (u === 0) {
    elapsedDescription = `${h} ${h === 1 ? "day" : "days"}`;
  } else if (h === 0) {
    elapsedDescription = `${u} ${u === 1 ? "month" : "months"}`;
  } else {
    elapsedDescription = `${u} ${u === 1 ? "month" : "months"}, ${h} ${h === 1 ? "day" : "days"}`;
  }

  return {
    mortgageDate,
    asOfDate,
    principalPaise,
    principalRupees: principalPaise / 100,
    monthlyRate,
    interestMode,
    completedMonths: u,
    remainderDays: h,
    chargeableMonths,
    interestPaise: totalInterestPaise,
    interestRupees: totalInterestPaise / 100,
    totalDuePaise,
    totalDueRupees: totalDuePaise / 100,
    elapsedDescription,
    yearlyBreakdown,
    ruleVersion,
  };
}
