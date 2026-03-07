"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface PaymentFormProps {
  onSuccess: () => void;
  onClose: () => void;
  total: number;
}

function PaymentForm({ onSuccess, onClose, total }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || "Payment failed");
      setProcessing(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message || "Payment failed");
      setProcessing(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <PaymentElement />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || processing} size="lg">
          {processing
            ? "Processing..."
            : `Pay ${new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(total / 100)}`}
        </Button>
      </div>
    </form>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  proposalId: string;
  totalAmount: number;
  clientName?: string;
}

export default function PaymentModal({
  open,
  onClose,
  onSuccess,
  proposalId,
  totalAmount,
  clientName,
}: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setClientSecret(null);
    setLoadError(null);

    fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposal_id: proposalId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setLoadError(d.error);
        else setClientSecret(d.client_secret);
      })
      .catch(() => setLoadError("Failed to initialize payment"));
  }, [open, proposalId]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete payment</DialogTitle>
          <DialogDescription>
            {clientName
              ? `Hi ${clientName} — you're one step away from getting started.`
              : "Enter your payment details to complete your purchase."}
          </DialogDescription>
        </DialogHeader>

        {loadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2 mt-2">
            {loadError}
          </div>
        )}

        {!clientSecret && !loadError && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {clientSecret && (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: { theme: "stripe" } }}
          >
            <PaymentForm
              onSuccess={onSuccess}
              onClose={onClose}
              total={totalAmount}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}
