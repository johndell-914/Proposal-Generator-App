import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import ProposalCard from "@/components/dashboard/ProposalCard";
import type { Proposal } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: proposals } = await supabase
    .from("proposals")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Proposals</h1>
          <p className="text-gray-500 mt-1">
            {proposals?.length ?? 0} proposal{proposals?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/dashboard/proposals/new">
          <Button size="lg">+ New Proposal</Button>
        </Link>
      </div>

      {!proposals || proposals.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-400 text-lg mb-4">No proposals yet</p>
          <Link href="/dashboard/proposals/new">
            <Button>Create your first proposal</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proposals.map((proposal: Proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </div>
      )}
    </div>
  );
}
