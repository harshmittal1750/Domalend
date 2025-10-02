"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useP2PLending } from "@/hooks/useP2PLending";
import {
  DREAMLEND_CONTRACT_ADDRESS,
  DREAMLEND_ABI,
  SOMNIA_TESTNET_CONFIG,
  LoanStatus,
} from "@/lib/contracts";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Users,
  Activity,
  Clock,
  Target,
  AlertCircle,
  RefreshCw,
  BarChart3,
} from "lucide-react";

interface AnalyticsData {
  totalValueLocked: bigint;
  totalLoansCreated: number;
  volumeTraded: bigint;
  averageAPR: number;
  averageDuration: number;
  activeLoans: number;
  repaidLoans: number;
  defaultedLoans: number;
  totalCollateralLocked: bigint;
  dailyActivity: Array<{
    date: string;
    loansCreated: number;
    loansAccepted: number;
    loansRepaid: number;
    loansLiquidated: number;
  }>;
  aprDistribution: Array<{
    range: string;
    count: number;
  }>;
  durationDistribution: Array<{
    range: string;
    count: number;
  }>;
}

interface EventLog {
  loanId: bigint;
  lender?: string;
  borrower?: string;
  tokenAddress?: string;
  amount?: bigint;
  interestRate?: bigint;
  duration?: bigint;
  collateralAddress?: string;
  collateralAmount?: bigint;
  timestamp?: bigint;
  blockNumber: bigint;
  transactionHash: string;
}

interface ContractLog extends ethers.Log {
  args: {
    loanId: ethers.BigNumberish;
    lender?: string;
    borrower?: string;
    liquidator?: string;
    tokenAddress?: string;
    amount?: ethers.BigNumberish;
    interestRate?: ethers.BigNumberish;
    duration?: ethers.BigNumberish;
    collateralAddress?: string;
    collateralAmount?: ethers.BigNumberish;
    timestamp?: ethers.BigNumberish;
  };
}

export default function AnalyticsPage() {
  const { isConnected } = useP2PLending();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Create ethers provider for reading blockchain data
  const getProvider = () => {
    return new ethers.JsonRpcProvider(
      SOMNIA_TESTNET_CONFIG.rpcUrls.default.http[0]
    );
  };

  const fetchAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = getProvider();
      const contract = new ethers.Contract(
        DREAMLEND_CONTRACT_ADDRESS,
        DREAMLEND_ABI,
        provider
      );

      // Get current block number
      const currentBlock = await provider.getBlockNumber();
      const totalBlocks = Math.min(2000, currentBlock); // Look back max 2000 blocks
      const chunkSize = 500; // RPC limit per query
      const startBlock = Math.max(0, currentBlock - totalBlocks);

      // Define event filters
      const loanCreatedFilter = contract.filters.LoanCreated();
      const loanAcceptedFilter = contract.filters.LoanAccepted();
      const loanRepaidFilter = contract.filters.LoanRepaid();
      const loanLiquidatedFilter = contract.filters.LoanLiquidated();

      // Function to fetch events in chunks
      const fetchEventsInChunks = async (
        filter: ReturnType<typeof contract.filters.LoanCreated>
      ) => {
        const allLogs = [];
        for (
          let fromBlock = startBlock;
          fromBlock <= currentBlock;
          fromBlock += chunkSize
        ) {
          const toBlock = Math.min(fromBlock + chunkSize - 1, currentBlock);
          try {
            const logs = await contract.queryFilter(filter, fromBlock, toBlock);
            allLogs.push(...logs);
          } catch (error: unknown) {
            console.warn(
              `Failed to fetch events from block ${fromBlock} to ${toBlock}:`,
              error
            );

            // If even the chunk size is too large, try smaller chunks
            if (
              error instanceof Error &&
              error.message?.includes("block range exceeds")
            ) {
              const smallerChunkSize = 100;
              for (
                let smallFromBlock = fromBlock;
                smallFromBlock <= toBlock;
                smallFromBlock += smallerChunkSize
              ) {
                const smallToBlock = Math.min(
                  smallFromBlock + smallerChunkSize - 1,
                  toBlock
                );
                try {
                  const smallLogs = await contract.queryFilter(
                    filter,
                    smallFromBlock,
                    smallToBlock
                  );
                  allLogs.push(...smallLogs);
                } catch (smallError) {
                  console.warn(
                    `Failed to fetch events from small block range ${smallFromBlock} to ${smallToBlock}:`,
                    smallError
                  );
                }
              }
            }
          }
        }
        return allLogs;
      };

      // Fetch all event logs in parallel chunks
      const [
        loanCreatedLogs,
        loanAcceptedLogs,
        loanRepaidLogs,
        loanLiquidatedLogs,
      ] = await Promise.all([
        fetchEventsInChunks(loanCreatedFilter),
        fetchEventsInChunks(loanAcceptedFilter),
        fetchEventsInChunks(loanRepaidFilter),
        fetchEventsInChunks(loanLiquidatedFilter),
      ]);

      // Process event data - cast logs to ContractLog to access args
      const loanCreatedEvents: EventLog[] = loanCreatedLogs.map((log) => {
        const contractLog = log as ContractLog;
        return {
          loanId: BigInt(contractLog.args.loanId.toString()),
          lender: contractLog.args.lender,
          tokenAddress: contractLog.args.tokenAddress,
          amount: BigInt(contractLog.args.amount!.toString()),
          interestRate: BigInt(contractLog.args.interestRate!.toString()),
          duration: BigInt(contractLog.args.duration!.toString()),
          collateralAddress: contractLog.args.collateralAddress,
          collateralAmount: BigInt(
            contractLog.args.collateralAmount!.toString()
          ),
          blockNumber: BigInt(contractLog.blockNumber.toString()),
          transactionHash: contractLog.transactionHash,
        };
      });

      const loanAcceptedEvents: EventLog[] = loanAcceptedLogs.map((log) => {
        const contractLog = log as ContractLog;
        return {
          loanId: BigInt(contractLog.args.loanId.toString()),
          borrower: contractLog.args.borrower,
          timestamp: BigInt(contractLog.args.timestamp!.toString()),
          blockNumber: BigInt(contractLog.blockNumber.toString()),
          transactionHash: contractLog.transactionHash,
        };
      });

      const loanRepaidEvents: EventLog[] = loanRepaidLogs.map((log) => {
        const contractLog = log as ContractLog;
        return {
          loanId: BigInt(contractLog.args.loanId.toString()),
          borrower: contractLog.args.borrower,
          timestamp: BigInt(contractLog.args.timestamp!.toString()),
          blockNumber: BigInt(contractLog.blockNumber.toString()),
          transactionHash: contractLog.transactionHash,
        };
      });

      const loanLiquidatedEvents: EventLog[] = loanLiquidatedLogs.map((log) => {
        const contractLog = log as ContractLog;
        return {
          loanId: BigInt(contractLog.args.loanId.toString()),
          borrower: contractLog.args.liquidator,
          timestamp: BigInt(contractLog.args.timestamp!.toString()),
          blockNumber: BigInt(contractLog.blockNumber.toString()),
          transactionHash: contractLog.transactionHash,
        };
      });

      // Get detailed loan information for TVL calculation
      const allLoanIds = [...new Set(loanCreatedEvents.map((e) => e.loanId))];
      const loanDetails = await Promise.all(
        allLoanIds.map(async (loanId) => {
          try {
            const response = await fetch("/api/loan-details", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ loanId: loanId.toString() }),
            });

            if (!response.ok) return null;
            return await response.json();
          } catch (error) {
            console.error(`Failed to fetch loan ${loanId}:`, error);
            return null;
          }
        })
      );

      const validLoans = loanDetails.filter(Boolean);

      // Calculate metrics
      const totalLoansCreated = loanCreatedEvents.length;
      const volumeTraded = loanCreatedEvents.reduce(
        (sum, event) => sum + event.amount!,
        BigInt(0)
      );

      // TVL = Active loans amount + collateral locked
      const activeLoans = validLoans.filter(
        (loan) => loan.status === LoanStatus.Active
      );
      const totalValueLocked = activeLoans.reduce((sum, loan) => {
        return sum + BigInt(loan.amount) + BigInt(loan.collateralAmount);
      }, BigInt(0));

      const totalCollateralLocked = activeLoans.reduce((sum, loan) => {
        return sum + BigInt(loan.collateralAmount);
      }, BigInt(0));

      // Calculate averages
      const averageAPR =
        loanCreatedEvents.length > 0
          ? loanCreatedEvents.reduce(
              (sum, event) => sum + Number(event.interestRate!) / 100,
              0
            ) / loanCreatedEvents.length
          : 0;

      const averageDuration =
        loanCreatedEvents.length > 0
          ? loanCreatedEvents.reduce(
              (sum, event) => sum + Number(event.duration!) / (24 * 60 * 60),
              0
            ) / loanCreatedEvents.length
          : 0;

      // Status counts
      const repaidLoans = validLoans.filter(
        (loan) => loan.status === LoanStatus.Repaid
      ).length;
      const defaultedLoans = validLoans.filter(
        (loan) => loan.status === LoanStatus.Defaulted
      ).length;

      // Daily activity (group by day)
      const dailyActivityMap = new Map<
        string,
        {
          date: string;
          loansCreated: number;
          loansAccepted: number;
          loansRepaid: number;
          loansLiquidated: number;
        }
      >();

      // Helper function to get date string from block number (approximate)
      const getDateFromBlockNumber = (blockNumber: bigint) => {
        // Rough approximation - in reality you'd want to fetch block timestamps
        const blocksPerDay = 7200; // ~12 second blocks
        const daysAgo = Math.floor(
          Number(BigInt(currentBlock) - blockNumber) / blocksPerDay
        );
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString().split("T")[0];
      };

      loanCreatedEvents.forEach((event) => {
        const date = getDateFromBlockNumber(event.blockNumber);
        if (!dailyActivityMap.has(date)) {
          dailyActivityMap.set(date, {
            date,
            loansCreated: 0,
            loansAccepted: 0,
            loansRepaid: 0,
            loansLiquidated: 0,
          });
        }
        dailyActivityMap.get(date)!.loansCreated++;
      });

      loanAcceptedEvents.forEach((event) => {
        const date = getDateFromBlockNumber(event.blockNumber);
        if (!dailyActivityMap.has(date)) {
          dailyActivityMap.set(date, {
            date,
            loansCreated: 0,
            loansAccepted: 0,
            loansRepaid: 0,
            loansLiquidated: 0,
          });
        }
        dailyActivityMap.get(date)!.loansAccepted++;
      });

      loanRepaidEvents.forEach((event) => {
        const date = getDateFromBlockNumber(event.blockNumber);
        if (!dailyActivityMap.has(date)) {
          dailyActivityMap.set(date, {
            date,
            loansCreated: 0,
            loansAccepted: 0,
            loansRepaid: 0,
            loansLiquidated: 0,
          });
        }
        dailyActivityMap.get(date)!.loansRepaid++;
      });

      loanLiquidatedEvents.forEach((event) => {
        const date = getDateFromBlockNumber(event.blockNumber);
        if (!dailyActivityMap.has(date)) {
          dailyActivityMap.set(date, {
            date,
            loansCreated: 0,
            loansAccepted: 0,
            loansRepaid: 0,
            loansLiquidated: 0,
          });
        }
        dailyActivityMap.get(date)!.loansLiquidated++;
      });

      const dailyActivity = Array.from(dailyActivityMap.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      );

      // APR Distribution
      const aprRanges = ["0-5%", "5-10%", "10-20%", "20%+"];
      const aprDistribution = aprRanges.map((range) => {
        let count = 0;
        loanCreatedEvents.forEach((event) => {
          const apr = Number(event.interestRate!) / 100;
          if (range === "0-5%" && apr < 5) count++;
          else if (range === "5-10%" && apr >= 5 && apr < 10) count++;
          else if (range === "10-20%" && apr >= 10 && apr < 20) count++;
          else if (range === "20%+" && apr >= 20) count++;
        });
        return { range, count };
      });

      // Duration Distribution
      const durationRanges = [
        "< 7 days",
        "7-30 days",
        "30-90 days",
        "90+ days",
      ];
      const durationDistribution = durationRanges.map((range) => {
        let count = 0;
        loanCreatedEvents.forEach((event) => {
          const days = Number(event.duration!) / (24 * 60 * 60);
          if (range === "< 7 days" && days < 7) count++;
          else if (range === "7-30 days" && days >= 7 && days < 30) count++;
          else if (range === "30-90 days" && days >= 30 && days < 90) count++;
          else if (range === "90+ days" && days >= 90) count++;
        });
        return { range, count };
      });

      const analytics: AnalyticsData = {
        totalValueLocked,
        totalLoansCreated,
        volumeTraded,
        averageAPR,
        averageDuration,
        activeLoans: activeLoans.length,
        repaidLoans,
        defaultedLoans,
        totalCollateralLocked,
        dailyActivity,
        aprDistribution,
        durationDistribution,
      };

      setAnalyticsData(analytics);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching analytics data:", err);
      setError("Failed to fetch analytics data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const formatCurrency = (
    value: bigint
    // tokenAddress?: string
  ) => {
    // For now, we'll use a generic formatting since we don't have token context
    // In the future, this could be enhanced to use proper token decimals
    return `${parseFloat(ethers.formatEther(value)).toFixed(2)} tokens`;
  };

  const StatusDistributionChart = () => {
    if (!analyticsData) return null;

    const data = [
      { name: "Active", value: analyticsData.activeLoans, color: "#0088FE" },
      { name: "Repaid", value: analyticsData.repaidLoans, color: "#00C49F" },
      {
        name: "Defaulted",
        value: analyticsData.defaultedLoans,
        color: "#FF8042",
      },
    ];

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            dataKey="value"
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ name, value }) => `${name}: ${value}`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>DreamLend Analytics</CardTitle>
            <CardDescription>
              Connect your wallet to view platform analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please connect your wallet to view analytics data.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Platform Analytics</h1>
          <p className="text-gray-600 mt-2">
            Real-time insights into DreamLend protocol activity
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Analyzing data from the last ~2000 blocks (due to RPC limitations)
          </p>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>
        <Button
          onClick={fetchAnalyticsData}
          disabled={isLoading}
          variant="outline"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh Data
        </Button>
      </div>

      {error && (
        <Alert className="mb-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && !analyticsData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-6 w-[60px]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : analyticsData ? (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {formatCurrency(analyticsData.totalValueLocked)}
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      Total Value Locked
                    </p>
                    <p className="text-xs text-gray-500">
                      Active loans + collateral
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <div className="p-2 rounded-lg bg-green-100 text-green-600">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {formatCurrency(analyticsData.volumeTraded)}
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      Volume Traded
                    </p>
                    <p className="text-xs text-gray-500">
                      Total lending volume
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {analyticsData.totalLoansCreated}
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      Total Loans Created
                    </p>
                    <p className="text-xs text-gray-500">
                      All-time loan offers
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                    <Activity className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {analyticsData.activeLoans}
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      Active Loans
                    </p>
                    <p className="text-xs text-gray-500">Currently running</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <div className="p-2 rounded-lg bg-red-100 text-red-600">
                    <Target className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {analyticsData.averageAPR.toFixed(2)}%
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      Average APR
                    </p>
                    <p className="text-xs text-gray-500">Across all loans</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {Math.round(analyticsData.averageDuration)}
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      Avg Duration (Days)
                    </p>
                    <p className="text-xs text-gray-500">Typical loan length</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {formatCurrency(analyticsData.totalCollateralLocked)}
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      Collateral Locked
                    </p>
                    <p className="text-xs text-gray-500">
                      Total collateral value
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Daily Activity Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Activity</CardTitle>
                <CardDescription>
                  Loan creation and management over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="loansCreated"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                    />
                    <Area
                      type="monotone"
                      dataKey="loansAccepted"
                      stackId="1"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                    />
                    <Area
                      type="monotone"
                      dataKey="loansRepaid"
                      stackId="1"
                      stroke="#ffc658"
                      fill="#ffc658"
                    />
                    <Area
                      type="monotone"
                      dataKey="loansLiquidated"
                      stackId="1"
                      stroke="#ff7300"
                      fill="#ff7300"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Loan Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Loan Status Distribution</CardTitle>
                <CardDescription>Current status of all loans</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusDistributionChart />
              </CardContent>
            </Card>
          </div>

          {/* Distribution Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* APR Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>APR Distribution</CardTitle>
                <CardDescription>
                  Interest rate distribution across loans
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.aprDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Duration Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Duration Distribution</CardTitle>
                <CardDescription>Loan duration preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.durationDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
