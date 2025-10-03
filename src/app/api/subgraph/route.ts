// app/api/subgraph/route.ts
import { NextRequest, NextResponse } from "next/server";

// Use local indexer instead of remote subgraph
const SUBGRAPH_URL =
  process.env.NEXT_PUBLIC_SUBGRAPH_URL || "http://localhost:3001/graphql";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    console.log(
      "🔍 Proxying GraphQL query to:",
      SUBGRAPH_URL,
      "\nQuery:",
      query.substring(0, 100) + "..."
    );

    const response = await fetch(SUBGRAPH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      cache: "no-store", // Disable caching for real-time data
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Indexer request failed:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch from indexer", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(
      "✅ Indexer response:",
      JSON.stringify(data).substring(0, 200) + "..."
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ API route error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
