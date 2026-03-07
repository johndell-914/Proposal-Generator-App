import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProposalViewer from "@/components/proposal/ProposalViewer";
import type { Proposal } from "@/lib/types";

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: proposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("slug", slug)
    .in("status", ["sent", "signed", "paid"])
    .single();

  if (!proposal) notFound();

  return <ProposalViewer proposal={proposal as Proposal} />;
}
