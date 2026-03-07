import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { signature_data_url } = await request.json();

  if (!signature_data_url) {
    return NextResponse.json(
      { error: "Signature is required" },
      { status: 400 }
    );
  }

  // Get client IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Check proposal exists and is in a signable state
  const { data: proposal, error: fetchError } = await supabase
    .from("proposals")
    .select("id, status")
    .eq("id", id)
    .in("status", ["sent"])
    .single();

  if (fetchError || !proposal) {
    return NextResponse.json(
      { error: "Proposal not found or already signed" },
      { status: 404 }
    );
  }

  const { data, error } = await supabase
    .from("proposals")
    .update({
      signature_data_url,
      signed_at: new Date().toISOString(),
      signed_ip: ip,
      status: "signed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ proposal: data });
}
