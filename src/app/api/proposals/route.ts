import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, client_name, client_email, content, line_items, total_amount } = body;

  const slug = nanoid(8);

  const { data, error } = await supabase
    .from("proposals")
    .insert({
      user_id: user.id,
      title: title || "Untitled Proposal",
      slug,
      status: "draft",
      client_name: client_name || null,
      client_email: client_email || null,
      content: content || {},
      line_items: line_items || [],
      total_amount: total_amount || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ proposal: data });
}
