import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import connectToDatabase from "@/lib/mongodb";
import Customer from "@/models/Customer";
import SaleRecord from "@/models/SaleRecord";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await authenticateRequest(req);
    if (!sessionUser) return unauthorizedResponse();

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const phone = (searchParams.get("phone") || "").trim();
    const details = searchParams.get("details") === "true";

    // 1. Fetch all sales to aggregate customer history
    const allSales = await SaleRecord.find({}).sort({ saleDate: -1, createdAt: -1 }).lean();

    // Group sales by customer phone (fallback to clean customer name)
    const salesByCustomerKey = new Map<string, any[]>();
    for (const sale of allSales) {
      if (!sale.customer || !sale.customer.name) continue;
      const key = (sale.customer.phone || sale.customer.name).trim().toLowerCase();
      const existing = salesByCustomerKey.get(key) || [];
      existing.push(sale);
      salesByCustomerKey.set(key, existing);
    }

    // 2. Fetch all registered customers in the Customer collection
    const registeredCustomers = await Customer.find({ isActive: true }).lean();

    // 3. Build unified customer list
    const customerMap = new Map<string, any>();

    // Add from Customer collection
    for (const cust of registeredCustomers) {
      const key = (cust.mobileNumber || cust.fullName).trim().toLowerCase();
      customerMap.set(key, {
        customerId: cust.customerId || cust._id.toString(),
        fullName: cust.fullName,
        mobileNumber: cust.mobileNumber,
        address: cust.address || "Visapur",
        totalPurchasesCount: 0,
        totalBilledPaise: 0,
        totalPaidPaise: 0,
        outstandingUdhariPaise: 0,
        lastPurchaseDate: cust.createdAt || new Date(),
        recentItems: [] as string[],
        sales: [] as any[],
        isRepeat: false,
      });
    }

    // Merge sales aggregation
    Array.from(salesByCustomerKey.entries()).forEach(([key, sales]) => {
      const primaryCust = sales[0].customer;
      const existing = customerMap.get(key) || {
        customerId: `CUST-${(primaryCust.phone || "000000").slice(-6)}`,
        fullName: primaryCust.name,
        mobileNumber: primaryCust.phone || "",
        address: primaryCust.address || "Visapur",
        totalPurchasesCount: 0,
        totalBilledPaise: 0,
        totalPaidPaise: 0,
        outstandingUdhariPaise: 0,
        lastPurchaseDate: sales[0].saleDate || sales[0].createdAt,
        recentItems: [] as string[],
        sales: [] as any[],
        isRepeat: false,
      };

      let totalBilled = 0;
      let totalPaid = 0;
      let totalDue = 0;
      const itemsSet = new Set<string>();

      for (const s of sales) {
        totalBilled += s.sellingPricePaise || 0;
        totalPaid += s.paidAmountPaise || 0;
        totalDue += s.balanceDuePaise || 0;
        if (s.itemName) itemsSet.add(s.itemName);
        if (s.items && Array.isArray(s.items)) {
          for (const item of s.items) {
            if (item.itemName) itemsSet.add(item.itemName);
          }
        }
      }

      existing.fullName = primaryCust.name; // Keep latest name
      if (primaryCust.address) existing.address = primaryCust.address;
      existing.totalPurchasesCount = sales.length;
      existing.totalBilledPaise = totalBilled;
      existing.totalPaidPaise = totalPaid;
      existing.outstandingUdhariPaise = totalDue;
      existing.lastPurchaseDate = sales[0].saleDate || sales[0].createdAt;
      existing.recentItems = Array.from(itemsSet).slice(0, 3);
      existing.isRepeat = sales.length >= 1;
      existing.sales = details ? sales : [];

      customerMap.set(key, existing);
    });

    let customerList = Array.from(customerMap.values());

    // Filter by specific phone if requested for single customer statement
    if (phone) {
      const matched = customerList.find(
        (c) => c.mobileNumber.replace(/\D/g, "").includes(phone.replace(/\D/g, "")) || c.mobileNumber === phone
      );
      if (matched) {
        // Return full sales details
        const custKey = (matched.mobileNumber || matched.fullName).trim().toLowerCase();
        matched.sales = salesByCustomerKey.get(custKey) || [];
        return NextResponse.json({ success: true, customer: matched });
      }
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    // Filter by search query if provided
    if (q) {
      customerList = customerList.filter((c) => {
        const nameMatch = c.fullName.toLowerCase().includes(q);
        const phoneMatch = c.mobileNumber.toLowerCase().includes(q);
        const addressMatch = (c.address || "").toLowerCase().includes(q);
        return nameMatch || phoneMatch || addressMatch;
      });
    }

    // Sort by repeat customers first, then most recent purchase
    customerList.sort((a, b) => {
      if (b.totalPurchasesCount !== a.totalPurchasesCount) {
        return b.totalPurchasesCount - a.totalPurchasesCount;
      }
      return new Date(b.lastPurchaseDate).getTime() - new Date(a.lastPurchaseDate).getTime();
    });

    return NextResponse.json({
      success: true,
      customers: customerList.map((c) => ({
        customerId: c.customerId,
        fullName: c.fullName,
        mobileNumber: c.mobileNumber,
        address: c.address || "Visapur",
        totalPurchasesCount: c.totalPurchasesCount,
        totalBilledRupees: c.totalBilledPaise / 100,
        totalPaidRupees: c.totalPaidPaise / 100,
        outstandingUdhariRupees: c.outstandingUdhariPaise / 100,
        lastPurchaseDate: c.lastPurchaseDate,
        recentItems: c.recentItems,
        isRepeat: c.isRepeat,
        salesCount: c.totalPurchasesCount,
      })),
    });
  } catch (error: any) {
    console.error("GET /api/sales/customers error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch customers" }, { status: 500 });
  }
}
