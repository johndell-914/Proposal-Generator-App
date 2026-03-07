"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import type { LineItem, ProposalContent } from "@/lib/types";

const STEPS = ["Brief", "Review & Edit", "Pricing"] as const;

type Step = 0 | 1 | 2;

interface Props {
  proposerName: string;
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function NewProposalWizard({ proposerName }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 0 fields
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  // Step 1 fields (AI-generated, editable)
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<ProposalContent>({
    cover_headline: "",
    executive_summary: "",
    scope_of_work: "",
    timeline: "",
    terms: "",
  });

  // Step 2 fields
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: generateId(), description: "", quantity: 1, unit_price: 0 },
  ]);

  const totalCents = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  async function handleGenerate() {
    if (!projectDescription.trim()) {
      setError("Please describe the project.");
      return;
    }
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName, projectDescription, proposerName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setContent(data.content);
      setTitle(
        `${clientName ? clientName + " — " : ""}${data.content.cover_headline.slice(0, 60)}`
      );
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
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

  async function handlePublish(asDraft = false) {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          client_name: clientName || null,
          client_email: clientEmail || null,
          content,
          line_items: lineItems,
          total_amount: totalCents,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      const proposalId = data.proposal.id;

      if (!asDraft) {
        // Set status to "sent"
        await fetch(`/api/proposals/${proposalId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "sent" }),
        });
      }

      router.push(`/dashboard/proposals/${proposalId}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                i === step
                  ? "bg-blue-600 text-white"
                  : i < step
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm ${
                i === step ? "font-semibold text-gray-900" : "text-gray-400"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="w-8 h-px bg-gray-200 mx-1" />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Step 0: Brief */}
      {step === 0 && (
        <Card>
          <CardContent className="pt-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client name</Label>
                <Input
                  placeholder="Acme Corp"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Client email</Label>
                <Input
                  type="email"
                  placeholder="client@acme.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                Project description{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Describe the project in 1-2 paragraphs. Include the client's goals, key features needed, target audience, and any specific requirements..."
                rows={6}
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                className="resize-none"
              />
              <p className="text-xs text-gray-400">
                The more detail you provide, the better the AI-generated proposal.
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleGenerate}
                disabled={generating || !projectDescription.trim()}
                size="lg"
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⟳</span> Generating with AI...
                  </span>
                ) : (
                  "Generate Proposal with AI →"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Review & Edit */}
      {step === 1 && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Proposal title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Proposal title"
                />
              </div>
              <div className="space-y-2">
                <Label>Cover headline</Label>
                <Input
                  value={content.cover_headline}
                  onChange={(e) =>
                    setContent((c) => ({ ...c, cover_headline: e.target.value }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {(
            [
              ["Executive Summary", "executive_summary"],
              ["Scope of Work", "scope_of_work"],
              ["Timeline", "timeline"],
              ["Terms & Conditions", "terms"],
            ] as const
          ).map(([label, field]) => (
            <Card key={field}>
              <CardContent className="pt-6 space-y-2">
                <Label>{label}</Label>
                <Textarea
                  value={content[field]}
                  onChange={(e) =>
                    setContent((c) => ({ ...c, [field]: e.target.value }))
                  }
                  rows={field === "terms" ? 6 : 8}
                  className="font-mono text-sm resize-y"
                />
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(0)}>
              ← Back
            </Button>
            <Button onClick={() => setStep(2)}>Next: Set Pricing →</Button>
          </div>
        </div>
      )}

      {/* Step 2: Pricing */}
      {step === 2 && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base">Line Items</Label>
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
                      placeholder="e.g. Website Design"
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
                <span className="text-xl font-bold text-gray-900">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(totalCents / 100)}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              ← Back
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => handlePublish(true)}
                disabled={saving}
              >
                Save as Draft
              </Button>
              <Button onClick={() => handlePublish(false)} disabled={saving} size="lg">
                {saving ? "Publishing..." : "Publish & Get Link"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
