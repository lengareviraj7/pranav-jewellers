"use client";

import React from "react";
import InventoryManager from "@/components/InventoryManager";

export default function GoldInventoryPage() {
  return (
    <InventoryManager
      metalType="gold"
      title="Gold Showroom Inventory"
      subtitle="Complete stock tracking of gold jewellery, bullion, coins, and ornaments with dynamic category management and milligram net weights."
      purityOptions={["24K", "22K", "20K", "18K"]}
    />
  );
}
