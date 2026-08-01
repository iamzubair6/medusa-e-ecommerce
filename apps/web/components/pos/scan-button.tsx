"use client";

import { useEffect, useRef, useState } from "react";
import { ScanLine, X } from "lucide-react";
import { Button, Card, CardContent } from "@ecom/ui";

/**
 * Camera barcode scanner: any phone/tablet running /pos becomes the scan tool
 * (no hardware needed). Uses @zxing/browser — loaded on demand so the counter
 * bundle stays lean — because iOS Safari has no native BarcodeDetector.
 * Requires HTTPS (or localhost) for camera access.
 */
export function ScanButton({ onCode }: { onCode: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-12 px-4"
        onClick={() => setOpen(true)}
        aria-label="Scan a barcode with the camera"
      >
        <ScanLine className="mr-2 h-5 w-5" /> Scan
      </Button>
      {open && (
        <ScannerModal
          onClose={() => setOpen(false)}
          onCode={(code) => {
            setOpen(false);
            onCode(code);
          }}
        />
      )}
    </>
  );
}

function ScannerModal({ onClose, onCode }: { onClose: () => void; onCode: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let controls: { stop: () => void } | null = null;

    const start = async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (stopped || !videoRef.current) return;
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          videoRef.current,
          (result) => {
            if (result && !stopped) {
              stopped = true;
              controls?.stop();
              onCode(result.getText().trim());
            }
          },
        );
      } catch {
        if (!stopped) {
          setError(
            "Camera unavailable. Allow camera access for this site (and use HTTPS) — or type the SKU instead.",
          );
        }
      }
    };
    void start();

    return () => {
      stopped = true;
      controls?.stop();
    };
  }, [onCode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Scan a barcode"
      onClick={onClose}
    >
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Point the camera at the barcode</p>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close scanner" autoFocus>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {error ? (
            <p className="py-8 text-center text-sm text-destructive">{error}</p>
          ) : (
            <div className="relative overflow-hidden rounded-lg bg-black">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption -- live camera feed */}
              <video ref={videoRef} className="aspect-[4/3] w-full object-cover" />
              <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/70" aria-hidden />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
