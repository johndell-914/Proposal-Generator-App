export type ProposalStatus = "draft" | "sent" | "signed" | "paid";

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number; // in cents
}

export interface ProposalContent {
  cover_headline: string;
  executive_summary: string;
  scope_of_work: string;
  timeline: string;
  terms: string;
}

export interface Proposal {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  status: ProposalStatus;
  client_name: string | null;
  client_email: string | null;
  content: ProposalContent;
  line_items: LineItem[];
  total_amount: number | null; // in cents
  signature_data_url: string | null;
  signed_at: string | null;
  signed_ip: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}
