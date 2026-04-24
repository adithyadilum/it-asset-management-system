"use client";

import React, { useState } from "react";
import { AssetAssignmentDetailsPanel } from "@/components/features/asset-registry/panels/asset-assignment-panel";
import { Button } from "@/components/ui/button";

export default function AssignmentTestPage() {
  const [showPanel, setShowPanel] = useState(false);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      {/* 1. THE TOGGLE SWITCH / BUTTON */}
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-xl font-semibold text-slate-900">Panel Tester</h1>
        <Button 
          onClick={() => setShowPanel(true)}
          className="bg-[#00145a] hover:bg-[#000d3d]"
        >
          {showPanel ? "Panel is Open" : "Open Assignment Panel"}
        </Button>
      </div>

      {/* 2. THE PANEL IMPORT */}
      <AssetAssignmentDetailsPanel
        isOpen={showPanel}
        onClose={() => setShowPanel(false)}
        isLoading={false}
        
        // Mock Data to satisfy the interface
        assetId="LAP-HR-220"
        assetTag="QR Code"
        category="Laptop"
        model="Thinkpad T14"
        brand="Lenovo"
        serialNumber="PC1A2B3C"
        owner="TIQRI"
        assignedTo="Mark Kim"
        group="Admin"
        dateCreated="02 / 03 / 2026"
        updatedAt="04/06/2025"
        warranty="Expired"
        lastRepaired="08/10/2025"
        note="Storage upgrade needed"
        status="Available"
        
        // Handlers
        onEdit={() => console.log("Edit clicked")}
        onAssign={() => console.log("Assign clicked")}
        maintenanceEvents={[]} // Passing empty array to satisfy the prop
      />
    </div>
  );
}