"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { LineItem, Proposal, ProposalContent, ProposalStatus } from "@/lib/types";

const STATUS_STYLES: Record<ProposalStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  signed: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
};

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100
  );
}

export default function ProposalEditor({ proposal }: { proposal: Proposal }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(proposal.title);
  const [clientName, setClientName] = useState(proposal.client_name || "");
  const [clientEmail, setClientEmail] = useState(proposal.client_email || "");
  const [status, setStatus] = useState<ProposalStatus>(proposal.status);
  const [content, setContent] = useState<ProposalContent>(
    proposal.content as ProposalContent
  );
  const [lineItems, setLineItems] = useState<LineItem[]>(
    (proposal.line_items as LineItem[]) || []
  );

  const totalCents = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const publicUrl = `${appUrl}/p/${proposal.slug}`;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          client_name: clientName || null,
          client_email: clientEmail || null,
          content,
          line_items: lineItems,
          total_amount: totalCents,
          status,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setStatus("sent");
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          client_name: clientName || null,
          client_email: clientEmail || null,
          content,
          line_items: lineItems,
          total_amount: totalCents,
          status: "sent",
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setSaving(false);
    }
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      { id: generateId(), description: "", quantity: 1, unit_price: 0 },
    ]);
  }

  function updateLineItem(id: string, field: keyof LineItem, value: string | number) {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  function removeLineItem(id: string) {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function copyLink() {
    setCopying(true);
    await navigator.clipboard.writeText(publicUrl);
    setTimeout(() => setCopying(false), 1500);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">
            ← Dashboard
          </Link>
          <Badge className={STATUS_STYLES[status]}>{status}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {status !== "draft" && (
            <Button variant="outline" size="sm" onClick={copyLink}>
              {copying ? "Copied!" : "Copy Link"}
            </Button>
          )}
          {status === "draft" && (
            <Button variant="outline" size="sm" onClick={handlePublish} disabled={saving}>
              Publish
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saved ? "Saved ✓" : saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Link banner */}
      {status !== "draft" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-800">Client link</p>
            <p className="text-sm text-blue-600 font-mono">{publicUrl}</p>
          </div>
          <Button size="sm" variant="outline" onClick={copyLink}>
            {copying ? "Copied!" : "Copy"}
          </Button>
        </div>
      )}

      {/* Basic info */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>Proposal title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client name</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Acme Corp"
              />
            </div>
            <div className="space-y-2">
              <Label>Client email</Label>
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@acme.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content sections */}
      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-2">
            <Label>Cover headline</Label>
            <Input
              value={content.cover_headline}
              onChange={(e) =>
                setContent((c) => ({ ...c, cover_headline: e.target.value }))
              }
            />
          </div>
          <Separator />
          {(
            [
              ["Executive Summary", "executive_summary"],
              ["Scope of Work", "scope_of_work"],
              ["Timeline", "timeline"],
              ["Terms & Conditions", "terms"],
            ] as const
          ).map(([label, field]) => (
            <div key={field} className="space-y-2">
              <Label>{label}</Label>
              <Textarea
                value={content[field]}
                onChange={(e) =>
                  setContent((c) => ({ ...c, [field]: e.target.value }))
                }
                rows={field === "terms" ? 5 : 7}
                className="font-mono text-sm resize-y"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Line items */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base">Investment</Label>
            <Button variant="outline" size="sm" onClick={addLineItem}>
              + Add Item
            </Button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium px-1">
              <span className="col-span-6">Description</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-3 text-right">Unit Price</span>
              <span className="col-span-1" />
            </div>

            {lineItems.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                <Input
                  className="col-span-6"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) =>
                    updateLineItem(item.id, "description", e.target.value)
                  }
                />
                <Input
                  className="col-span-2 text-center"
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    updateLineItem(item.id, "quantity", parseInt(e.target.value) || 1)
                  }
                />
                <div className="col-span-3 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    $
                  </span>
                  <Input
                    className="pl-6"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    value={item.unit_price / 100 || ""}
                    onChange={(e) =>
                      updateLineItem(
                        item.id,
                        "unit_price",
                        Math.round(parseFloat(e.target.value) * 100) || 0
                      )
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="col-span-1 text-gray-400 hover:text-red-500 px-1"
                  onClick={() => removeLineItem(item.id)}
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>

          <div className="border-t pt-3 flex justify-between items-center">
            <span className="font-semibold text-gray-700">Total</span>
            <span className="text-xl font-bold">{formatCents(totalCents)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saved ? "Saved ✓" : saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
