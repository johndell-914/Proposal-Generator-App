"use client";

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  onSigned: (dataUrl: string) => void;
  clientName?: string;
}

export default function SignatureModal({ open, onClose, onSigned, clientName }: Props) {
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [saving, setSaving] = useState(false);

  function handleClear() {
    sigRef.current?.clear();
    setIsEmpty(true);
  }

  async function handleApply() {
    if (!sigRef.current || sigRef.current.isEmpty()) return;
    setSaving(true);
    const dataUrl = sigRef.current.toDataURL("image/png");
    await onSigned(dataUrl);
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sign this proposal</DialogTitle>
          <DialogDescription>
            {clientName
              ? `By signing, ${clientName} agrees to the terms outlined in this proposal.`
              : "By signing, you agree to the terms outlined in this proposal."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 relative">
            <SignatureCanvas
              ref={sigRef}
              penColor="#1a1a1a"
              canvasProps={{
                width: 460,
                height: 180,
                className: "rounded-lg w-full",
                style: { touchAction: "none" },
              }}
              onBegin={() => setIsEmpty(false)}
            />
            {isEmpty && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-gray-400 text-sm">Draw your signature here</p>
              </div>
            )}
          </div>
          <div className="border-t border-gray-200 mt-1 pt-1">
            <p className="text-xs text-gray-400 text-center">
              Sign above using your mouse or touch
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={isEmpty || saving}>
              {saving ? "Applying..." : "Apply Signature"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
