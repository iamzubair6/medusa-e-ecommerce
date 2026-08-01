"use client";

import { Printer } from "lucide-react";
import { Button } from "@ecom/ui";

export function PrintButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()}>
      <Printer className="mr-1 h-4 w-4" /> Print
    </Button>
  );
}
