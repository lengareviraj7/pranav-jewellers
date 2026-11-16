// Pure JavaScript verification of mortgage engine logic
function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") {
    throw new Error("Date string is required");
  }
  const parts = dateStr.trim().split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  return { year, month, day };
}

function getDaysInMonth(year, month) {
  if (month === 2) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28;
  }
  if (month === 4 || month === 6 || month === 9 || month === 11) {
    return 30;
  }
  return 31;
}

function daysSinceEpoch(year, month, day) {
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function daysBetween(dateA, dateB) {
  return daysSinceEpoch(dateA.year, dateA.month, dateA.day) - daysSinceEpoch(dateB.year, dateB.month, dateB.day);
}

function addMonthsClamped(date, monthsToAdd) {
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

function calculateMortgageInterest(input) {
  const { mortgageDate, principalRupees, asOfDate } = input;
  const monthlyRate = input.monthlyRate ?? 2;
  const interestMode = input.interestMode ?? "yearly_compound";

  const mStart = parseDate(mortgageDate);
  const mEnd = parseDate(asOfDate);
  const diffDays = daysBetween(mEnd, mStart);

  const principalPaise = Math.round(100 * principalRupees);

  if (diffDays === 0) {
    return {
      principalRupees,
      monthlyRate,
      interestMode,
      completedMonths: 0,
      remainderDays: 0,
      chargeableMonths: 0,
      interestRupees: 0,
      totalDueRupees: principalRupees,
      elapsedDescription: "0 days (same day)",
      yearlyBreakdown: []
    };
  }

  let u = 0;
  while (daysBetween(mEnd, addMonthsClamped(mStart, u + 1)) >= 0) {
    u++;
  }

  const h = daysBetween(mEnd, addMonthsClamped(mStart, u));

  let chargeableMonths;
  if (u === 0) {
    chargeableMonths = 1;
  } else if (h <= 5) {
    chargeableMonths = u + 0;
  } else if (h <= 15) {
    chargeableMonths = u + 0.5;
  } else {
    chargeableMonths = u + 1;
  }

  const yearlyBreakdown = [];
  let totalInterestPaise = 0;
  let totalDuePaise = principalPaise;

  if (interestMode === "simple") {
    totalInterestPaise = Math.round((principalPaise * monthlyRate * chargeableMonths) / 100);
    totalDuePaise = principalPaise + totalInterestPaise;
    yearlyBreakdown.push({
      year: 1,
      months: chargeableMonths,
      startingPrincipalRupees: principalPaise / 100,
      interestRupees: totalInterestPaise / 100,
      endingAmountRupees: totalDuePaise / 100
    });
  } else {
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
        startingPrincipalRupees: currentPrincipalPaise / 100,
        interestRupees: interestPaise / 100,
        endingAmountRupees: endingPaise / 100
      });

      totalInterestPaise += interestPaise;
      currentPrincipalPaise = endingPaise;
      remainingMonths = Math.round((remainingMonths - blockMonths) * 100) / 100;
      yearNum++;
    }
    totalDuePaise = currentPrincipalPaise;
  }

  return {
    principalRupees,
    monthlyRate,
    interestMode,
    completedMonths: u,
    remainderDays: h,
    chargeableMonths,
    interestRupees: totalInterestPaise / 100,
    totalDueRupees: totalDuePaise / 100,
    yearlyBreakdown
  };
}

// TEST CASES
console.log("=== RUNNING SIDHESHWAR MORTGAGE ENGINE TEST CASES ===");

// Test 1: 13th month compound
// Principal: 20000, 3%, 13 months
const t1 = calculateMortgageInterest({
  mortgageDate: "2025-01-01",
  asOfDate: "2026-02-01",
  principalRupees: 20000,
  monthlyRate: 3,
  interestMode: "yearly_compound"
});
console.log("Test 1 (13 Months Compound):", t1);
if (t1.totalDueRupees === 28016 && t1.interestRupees === 8016) {
  console.log("✅ Test 1 PASSED (Exact ₹28,016)");
} else {
  console.error("❌ Test 1 FAILED", t1);
  process.exit(1);
}

// Test 2: Min 1-Month Rule (14 days)
// Principal: 35000, 2.5%, 14 days
const t2 = calculateMortgageInterest({
  mortgageDate: "2026-01-01",
  asOfDate: "2026-01-15",
  principalRupees: 35000,
  monthlyRate: 2.5,
  interestMode: "yearly_compound"
});
console.log("Test 2 (Min 1-Month Rule 14 days):", t2);
if (t2.chargeableMonths === 1 && t2.interestRupees === 875 && t2.totalDueRupees === 35875) {
  console.log("✅ Test 2 PASSED (Exact ₹35,875)");
} else {
  console.error("❌ Test 2 FAILED", t2);
  process.exit(1);
}

// Test 3: Simple Interest 4 months + 20 days -> rounds to 5 months
// Principal: 100000, 2%, 4 mo 20 d
const t3 = calculateMortgageInterest({
  mortgageDate: "2025-01-01",
  asOfDate: "2025-05-21",
  principalRupees: 100000,
  monthlyRate: 2,
  interestMode: "simple"
});
console.log("Test 3 (Simple 4 mo + 20 days):", t3);
if (t3.chargeableMonths === 5 && t3.interestRupees === 10000 && t3.totalDueRupees === 110000) {
  console.log("✅ Test 3 PASSED (Exact ₹110,000)");
} else {
  console.error("❌ Test 3 FAILED", t3);
  process.exit(1);
}

console.log("ALL CALCULATION VERIFICATION TESTS PASSED!");


module.exports = { calculateMortgageInterest };
