import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import {
  DREAMLEND_CONTRACT_ADDRESS,
  DREAMLEND_ABI,
  SOMNIA_TESTNET_CONFIG,
} from "@/lib/contracts";

// Create an ethers provider for reading from the blockchain
const getProvider = () => {
  return new ethers.JsonRpcProvider(
    SOMNIA_TESTNET_CONFIG.rpcUrls.default.http[0]
  );
};

export async function POST(request: NextRequest) {
  try {
    const { loanId } = await request.json();

    if (!loanId) {
      return NextResponse.json(
        { error: "Loan ID is required" },
        { status: 400 }
      );
    }

    // Create contract instance
    const provider = getProvider();
    const contract = new ethers.Contract(
      DREAMLEND_CONTRACT_ADDRESS,
      DREAMLEND_ABI,
      provider
    );

    // Call the contract to get loan details
    const loan = await contract.getLoan(BigInt(loanId));

    // Convert BigInt values to strings for JSON serialization
    const serializedLoan = {
      id: loan.id.toString(),
      lender: loan.lender,
      borrower: loan.borrower,
      tokenAddress: loan.tokenAddress,
      amount: loan.amount.toString(),
      interestRate: loan.interestRate.toString(),
      duration: loan.duration.toString(),
      collateralAddress: loan.collateralAddress,
      collateralAmount: loan.collateralAmount.toString(),
      startTime: loan.startTime.toString(),
      status: Number(loan.status), // Convert status enum to number
    };

    return NextResponse.json(serializedLoan);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorCode =
      error && typeof error === "object" && "code" in error
        ? (error as { code: string }).code
        : undefined;
    console.error("Error fetching loan details:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch loan details",
        details: errorMessage,
        code: errorCode,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}
