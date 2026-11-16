
import OpenAI from "openai";
import { NextResponse } from "next/server";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SYSTEM_PROMPT = `
You are an AI Sports Betting Assistant for a university
senior capstone project.

Your responsibilities:
- Explain sports betting odds and terminology.
- Explain implied probability and moneylines.
- Help users understand sportsbook comparisons.
- Explain basic sports analytics and predictions.
- Be concise, clear, and friendly.
- Never invent live sportsbook odds or game results.
- Never invent predictions or claim access to live data.
- Explain that live sportsbook data is not yet connected.
- Never guarantee betting outcomes.
- Keep answers educational and responsible.

RESPONSE RULES:
- Answer the user's question directly.
- Do not show internal reasoning, planning, or analysis.
- Provide only the final answer.
- Keep explanations concise unless more detail is requested.
`;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OpenRouter API key." },
        { status: 500 }
      );
    }

    const { messages } = await request.json();

    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.length > 20 ||
      !messages.every(
        (m: Message) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.length > 0 &&
          m.content.length <= 2000
      ) ||
      messages[messages.length - 1].role !== "user"
    ) {
      return NextResponse.json(
        { error: "Invalid chat messages." },
        { status: 400 }
      );
    }

    const client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
    });

    const completion = await client.chat.completions.create({
      model: "nemotron-3.5-lightning:free",

      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        ...messages,
      ],

      max_tokens: 1500,
      temperature: 0.2,
    });

    const reply = completion.choices[0]?.message?.content;

    if (!reply) {
      return NextResponse.json(
        { error: "The AI returned an empty response." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      reply,
      model: completion.model,
    });

  } catch (error) {
    console.error("OpenRouter API error:", error);

    return NextResponse.json(
      { error: "Unable to generate a response." },
      { status: 500 }
    );
  }
}
