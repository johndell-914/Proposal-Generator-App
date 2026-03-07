import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { proposal_id } = await request.json();

  if (!proposal_id) {
    return NextResponse.json({ error: "proposal_id is required" }, { status: 400 });
  }

  // Fetch proposal — no auth required since client is paying
  const { data: proposal, error } = await supabase
    .from("proposals")
    .select("id, title, client_name, client_email, total_amount, status, stripe_payment_intent_id")
    .eq("id", proposal_id)
    .in("status", ["signed"])
    .single();

  if (error || !proposal) {
    return NextResponse.json(
      { error: "Proposal not found or not in a payable state" },
      { status: 404 }
    );
  }

  if (!proposal.total_amount || proposal.total_amount <= 0) {
    return NextResponse.json(
      { error: "Proposal has no payment amount set" },
      { status: 400 }
    );
  }

  // Reuse existing PaymentIntent if one exists
  if (proposal.stripe_payment_intent_id) {
    const existingIntent = await stripe.paymentIntents.retrieve(
      proposal.stripe_payment_intent_id
    );
    if (existingIntent.status === "requires_payment_method") {
      return NextResponse.json({ client_secret: existingIntent.client_secret });
    }
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: proposal.total_amount,
    currency: "usd",
    description: proposal.title,
    receipt_email: proposal.client_email || undefined,
    metadata: {
      proposal_id: proposal.id,
      client_name: proposal.client_name || "",
    },
  });

  // Save the payment intent ID to the proposal
  await supabase
    .from("proposals")
    .update({ stripe_payment_intent_id: paymentIntent.id })
    .eq("id", proposal_id);

  return NextResponse.json({ client_secret: paymentIntent.client_secret });
}
