import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clientName, projectDescription, proposerName } = await request.json();

  if (!projectDescription) {
    return NextResponse.json(
      { error: "Project description is required" },
      { status: 400 }
    );
  }

  const systemPrompt = `You are an expert proposal writer for a web and app development agency.
Your job is to write compelling, professional proposals that win clients.
Write in first person from the agency's perspective. Use confident, clear language.
Focus on value and outcomes, not just features.
Always respond with valid JSON only — no markdown, no code blocks, no explanation.`;

  const userPrompt = `Write a detailed project proposal with the following details:
- Client Name: ${clientName || "the client"}
- Proposer/Agency: ${proposerName || "our agency"}
- Project Description: ${projectDescription}

Return a JSON object with exactly these fields:
{
  "cover_headline": "A compelling headline for the cover page (max 15 words)",
  "executive_summary": "2-3 paragraph executive summary explaining the client's challenge and our proposed solution. Write in markdown with paragraphs.",
  "scope_of_work": "Detailed scope of work with deliverables organized as markdown with sections and bullet points. Include specific features, functionality, and what is out of scope.",
  "timeline": "Project timeline broken into phases. Use markdown with phase headings, durations, and milestone descriptions.",
  "terms": "Standard terms and conditions for a web/app development project. Cover payment terms (50% upfront, 50% on completion), revisions policy (2 rounds of revisions included), IP ownership (full ownership transferred upon payment), confidentiality, and cancellation policy."
}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from AI");
    }

    const proposalContent = JSON.parse(content.text);
    return NextResponse.json({ content: proposalContent });
  } catch (error) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate proposal content" },
      { status: 500 }
    );
  }
}
