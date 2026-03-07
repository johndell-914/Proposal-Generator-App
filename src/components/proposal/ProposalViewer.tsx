"use client";

import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SignatureModal from "@/components/signature/SignatureModal";
import PaymentModal from "@/components/payment/PaymentModal";
import SuccessAnimation from "@/components/ui/SuccessAnimation";
import type { LineItem, Proposal, ProposalContent, ProposalStatus } from "@/lib/types";

const STATUS_STYLES: Record<ProposalStatus, { badge: string; message: string }> = {
  draft: { badge: "bg-gray-100 text-gray-600", message: "" },
  sent: { badge: "bg-blue-100 text-blue-700", message: "" },
  signed: {
    badge: "bg-yellow-100 text-yellow-700",
    message: "This proposal has been signed. Complete payment to get started.",
  },
  paid: {
    badge: "bg-green-100 text-green-700",
    message: "This proposal is signed and paid. We'll be in touch soon!",
  },
};

function formatCents(cents: number | null) {
  if (!cents) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100
  );
}

function renderMarkdown(text: string) {
  // Basic markdown rendering for proposal sections
  return text
    .split("\n")
    .map((line, i) => {
      if (line.startsWith("### ")) {
        return <h4 key={i} className="font-semibold text-gray-800 mt-4 mb-1">{line.slice(4)}</h4>;
      }
      if (line.startsWith("## ")) {
        return <h3 key={i} className="font-bold text-gray-900 text-lg mt-5 mb-2">{line.slice(3)}</h3>;
      }
      if (line.startsWith("# ")) {
        return <h2 key={i} className="font-bold text-gray-900 text-xl mt-6 mb-2">{line.slice(2)}</h2>;
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={i} className="ml-4 text-gray-700 leading-relaxed list-disc">
            {line.slice(2)}
          </li>
        );
      }
      if (line.startsWith("**") && line.endsWith("**")) {
        return <p key={i} className="font-semibold text-gray-800">{line.slice(2, -2)}</p>;
      }
      if (line.trim() === "") {
        return <div key={i} className="h-2" />;
      }
      return <p key={i} className="text-gray-700 leading-relaxed">{line}</p>;
    });
}

interface Props {
  proposal: Proposal;
}

export default function ProposalViewer({ proposal: initialProposal }: Props) {
  const [proposal, setProposal] = useState(initialProposal);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const content = proposal.content as ProposalContent;
  const lineItems = (proposal.line_items as LineItem[]) || [];
  const statusInfo = STATUS_STYLES[proposal.status];

  async function handleSigned(dataUrl: string) {
    setSigning(true);
    setError(null);
    try {
      const res = await fetch(`/api/sign/${proposal.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature_data_url: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProposal(data.proposal);
      setSignatureOpen(false);
      // Open payment immediately
      setTimeout(() => setPaymentOpen(true), 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save signature");
    } finally {
      setSigning(false);
    }
  }

  function handlePaymentSuccess() {
    setPaymentOpen(false);
    setProposal((p) => ({ ...p, status: "paid" }));
    setShowSuccess(true);
  }

  const canSign = proposal.status === "sent";
  const canPay = proposal.status === "signed";
  const isComplete = proposal.status === "paid";

  return (
    <div className="min-h-screen bg-white">
      <SuccessAnimation show={showSuccess} />
      <SignatureModal
        open={signatureOpen}
        onClose={() => setSignatureOpen(false)}
        onSigned={handleSigned}
        clientName={proposal.client_name || undefined}
      />
      {canPay && (
        <PaymentModal
          open={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          onSuccess={handlePaymentSuccess}
          proposalId={proposal.id}
          totalAmount={proposal.total_amount || 0}
          clientName={proposal.client_name || undefined}
        />
      )}

      {/* Status banner */}
      {(statusInfo.message || isComplete) && (
        <div
          className={`w-full px-6 py-3 text-center text-sm font-medium ${
            isComplete
              ? "bg-green-50 text-green-800 border-b border-green-200"
              : "bg-yellow-50 text-yellow-800 border-b border-yellow-200"
          }`}
        >
          {statusInfo.message}
        </div>
      )}

      {error && (
        <div className="w-full px-6 py-3 text-center text-sm text-red-700 bg-red-50 border-b border-red-200">
          {error}
        </div>
      )}

      {/* Cover section */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-700 text-white px-6 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Badge className={`${statusInfo.badge} text-xs`}>{proposal.status}</Badge>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-6">
            {content.cover_headline || proposal.title}
          </h1>
          {proposal.client_name && (
            <p className="text-slate-300 text-lg">
              Prepared for <span className="text-white font-semibold">{proposal.client_name}</span>
            </p>
          )}
          <p className="text-slate-400 text-sm mt-3">
            {new Date(proposal.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </section>

      {/* Proposal body */}
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-14">

        {/* Executive Summary */}
        {content.executive_summary && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Executive Summary</h2>
            <Separator className="mb-6" />
            <div className="prose max-w-none">
              {renderMarkdown(content.executive_summary)}
            </div>
          </section>
        )}

        {/* Scope of Work */}
        {content.scope_of_work && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Scope of Work</h2>
            <Separator className="mb-6" />
            <div className="prose max-w-none">
              {renderMarkdown(content.scope_of_work)}
            </div>
          </section>
        )}

        {/* Timeline */}
        {content.timeline && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Timeline</h2>
            <Separator className="mb-6" />
            <div className="prose max-w-none">
              {renderMarkdown(content.timeline)}
            </div>
          </section>
        )}

        {/* Investment */}
        {lineItems.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Investment</h2>
            <Separator className="mb-6" />
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold text-gray-700">
                      Description
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-700">
                      Qty
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">
                      Unit Price
                    </th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-700">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item: LineItem, i: number) => (
                    <tr
                      key={item.id || i}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-5 py-3 text-gray-700">{item.description}</td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {formatCents(item.unit_price)}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900">
                        {formatCents(item.quantity * item.unit_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={3} className="px-5 py-4 font-bold text-gray-900">
                      Total
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-xl text-gray-900">
                      {formatCents(proposal.total_amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}

        {/* Terms */}
        {content.terms && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Terms &amp; Conditions
            </h2>
            <Separator className="mb-6" />
            <div className="prose max-w-none text-sm text-gray-600">
              {renderMarkdown(content.terms)}
            </div>
          </section>
        )}

        {/* Signature display */}
        {proposal.signature_data_url && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Signature</h2>
            <Separator className="mb-6" />
            <div className="border border-gray-200 rounded-xl p-6 bg-gray-50 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proposal.signature_data_url}
                alt="Client signature"
                className="max-h-24 max-w-xs"
              />
              {proposal.signed_at && (
                <p className="text-xs text-gray-500 mt-2">
                  Signed on{" "}
                  {new Date(proposal.signed_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          </section>
        )}

        {/* CTA */}
        {!isComplete && (
          <section className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-200">
            {canSign && (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Ready to get started?
                </h3>
                <p className="text-gray-500 mb-6">
                  Review the proposal above and sign to move forward.
                </p>
                <Button
                  size="lg"
                  onClick={() => setSignatureOpen(true)}
                  disabled={signing}
                  className="px-10"
                >
                  Sign This Proposal
                </Button>
              </>
            )}
            {canPay && (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Proposal signed — complete payment to begin
                </h3>
                <p className="text-gray-500 mb-6">
                  Your signature has been recorded. Complete payment and we&apos;ll kick things off!
                </p>
                <Button
                  size="lg"
                  onClick={() => setPaymentOpen(true)}
                  className="px-10"
                >
                  Pay {formatCents(proposal.total_amount)} Now
                </Button>
              </>
            )}
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        <p>Powered by ProposalKit</p>
      </footer>
    </div>
  );
}
