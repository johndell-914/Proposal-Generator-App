import NewProposalWizard from "@/components/proposal/NewProposalWizard";
import { createClient } from "@/lib/supabase/server";

export default async function NewProposalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const proposerName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Our Agency";

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Proposal</h1>
        <p className="text-gray-500 mt-1">
          Describe your project and AI will draft the proposal for you
        </p>
      </div>
      <NewProposalWizard proposerName={proposerName} />
    </div>
  );
}
