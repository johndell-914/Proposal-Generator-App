import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProposalEditor from "@/components/proposal/ProposalEditor";
import type { Proposal } from "@/lib/types";

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: proposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!proposal) notFound();

  return (
    <div className="max-w-4xl mx-auto">
      <ProposalEditor proposal={proposal as Proposal} />
    </div>
  );
}
