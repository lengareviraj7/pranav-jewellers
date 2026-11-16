"use client";

import React from "react";
import InventoryManager from "@/components/InventoryManager";

export default function SilverInventoryPage() {
  return (
    <InventoryManager
      metalType="silver"
      title="Silver Showroom Inventory"
      subtitle="Complete stock tracking of silver utensils, pooja articles, anklets, and 999/925 ornaments with dynamic category management and milligram net weights."
      purityOptions={["999", "925", "800"]}
    />
  );
}
