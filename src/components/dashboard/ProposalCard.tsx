"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Proposal, ProposalStatus } from "@/lib/types";

const STATUS_STYLES: Record<ProposalStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  signed: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
};

function formatCents(cents: number | null) {
  if (!cents) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProposalCard({ proposal }: { proposal: Proposal }) {
  const router = useRouter();
  const [copying, setCopying] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const publicUrl = `${appUrl}/p/${proposal.slug}`;

  async function copyLink() {
    setCopying(true);
    await navigator.clipboard.writeText(publicUrl);
    setTimeout(() => setCopying(false), 1500);
  }

  async function deleteProposal() {
    if (!confirm("Delete this proposal? This cannot be undone.")) return;
    const supabase = createClient();
    await supabase.from("proposals").delete().eq("id", proposal.id);
    router.refresh();
  }

  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-tight">
            {proposal.title}
          </CardTitle>
          <Badge className={`text-xs shrink-0 ${STATUS_STYLES[proposal.status]}`}>
            {proposal.status}
          </Badge>
        </div>
        {proposal.client_name && (
          <p className="text-sm text-gray-500">{proposal.client_name}</p>
        )}
      </CardHeader>
      <CardContent className="flex-1 pb-2">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{formatDate(proposal.created_at)}</span>
          <span className="font-medium text-gray-900">
            {formatCents(proposal.total_amount)}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 pt-2">
        <Link href={`/dashboard/proposals/${proposal.id}/edit`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            Edit
          </Button>
        </Link>
        {proposal.status !== "draft" && (
          <Button
            variant="outline"
            size="sm"
            onClick={copyLink}
            className="flex-1"
          >
            {copying ? "Copied!" : "Copy Link"}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={deleteProposal}
          className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
        >
          ✕
        </Button>
      </CardFooter>
    </Card>
  );
}
