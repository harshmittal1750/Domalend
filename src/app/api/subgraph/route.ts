// app/api/subgraph/route.ts
import { NextRequest, NextResponse } from "next/server";

const SUBGRAPH_URL =
  process.env.NEXT_PUBLIC_SUBGRAPH_URL ||
  "https://api.subgraph.somnia.network/api/public/d5671b32-2846-489e-a577-e7d9702dd17b/subgraphs/dreamlend-graph/v0.0.1/";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const response = await fetch(SUBGRAPH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      cache: "no-store", // Disable caching for real-time data
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Subgraph request failed:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch from subgraph", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
