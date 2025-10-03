"use client";

import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DomaRankBadgeProps {
  score: number; // 0-100
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

/**
 * DomaRank Badge - Professional AI Score Display
 * Clean, typography-forward design showing our proprietary AI valuation
 */
export function DomaRankBadge({
  score,
  size = "md",
  showTooltip = true,
}: DomaRankBadgeProps) {
  // Calculate letter grade based on score
  const getGrade = (score: number): string => {
    if (score >= 90) return "A+";
    if (score >= 80) return "A";
    if (score >= 70) return "B+";
    if (score >= 60) return "B";
    if (score >= 50) return "C+";
    if (score >= 40) return "C";
    return "D";
  };

  // Get color class based on score (bold and prominent)
  const getColorClass = (score: number): string => {
    if (score >= 90)
      return "bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white border-0 shadow-lg shadow-emerald-500/50"; // A+ Premium
    if (score >= 80)
      return "bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-lg shadow-green-500/40"; // A Grade
    if (score >= 70)
      return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-md shadow-blue-500/30"; // B+ Good
    if (score >= 60)
      return "bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0 shadow-md shadow-yellow-500/30"; // B Average
    if (score >= 50)
      return "bg-gradient-to-r from-orange-500 to-yellow-600 text-white border-0 shadow-sm"; // C+ Below Average
    if (score >= 40)
      return "bg-gradient-to-r from-red-500 to-orange-600 text-white border-0 shadow-sm"; // C Poor
    return "bg-gradient-to-r from-gray-500 to-slate-600 text-white border-0"; // D Very Poor
  };

  const grade = getGrade(score);
  const colorClass = getColorClass(score);

  // Size classes - larger and bolder
  const sizeClasses = {
    sm: "text-sm px-3 py-1.5 font-bold",
    md: "text-lg px-4 py-2 font-bold",
    lg: "text-2xl px-6 py-3 font-extrabold",
  };

  const scoreClasses = {
    sm: "text-xs font-bold",
    md: "text-sm font-bold",
    lg: "text-base font-bold",
  };

  const badgeContent = (
    <div className="flex items-center gap-2">
      <Badge
        className={`${colorClass} ${sizeClasses[size]} tracking-tight uppercase animate-in fade-in zoom-in duration-300`}
      >
        {grade}
      </Badge>
      <span className={`${scoreClasses[size]} text-foreground`}>
        {score}/100
      </span>
      {showTooltip && (
        <Info className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors cursor-help" />
      )}
    </div>
  );

  if (!showTooltip) {
    return <div className="inline-flex items-center gap-2">{badgeContent}</div>;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-2 cursor-help">
            {badgeContent}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs p-4 bg-card border border-border shadow-lg"
        >
          <div className="space-y-2">
            <p className="font-semibold text-sm text-foreground">
              DomaRank™ Score
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Our proprietary AI score based on this domain's age, market
              demand, and quality. The Collateral Value is our risk-adjusted
              valuation based on this score, ensuring safer lending for you.
            </p>
            <div className="pt-2 border-t border-border mt-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                AI-Verified Asset
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Simple DomaRank Score Display (no badge, just number)
 * For use in data tables or compact layouts
 */
export function DomaRankScore({ score }: { score: number }) {
  const getColorClass = (score: number): string => {
    if (score >= 80) return "text-accent";
    if (score >= 60) return "text-primary";
    if (score >= 40) return "text-warning";
    return "text-muted-foreground";
  };

  return (
    <span className={`font-semibold tabular-nums ${getColorClass(score)}`}>
      {score}
    </span>
  );
}

export default DomaRankBadge;
