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

  // Get color class based on score (professional, not flashy)
  const getColorClass = (score: number): string => {
    if (score >= 80) return "bg-accent text-accent-foreground"; // Green for high scores
    if (score >= 60)
      return "bg-primary/10 text-primary border border-primary/20"; // Blue for good scores
    if (score >= 40)
      return "bg-warning/10 text-warning border border-warning/20"; // Yellow for average
    return "bg-muted text-muted-foreground border border-border"; // Gray for low scores
  };

  const grade = getGrade(score);
  const colorClass = getColorClass(score);

  // Size classes
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  const badgeContent = (
    <div className="flex items-center gap-2">
      <Badge
        className={`${colorClass} ${sizeClasses[size]} font-semibold tracking-tight`}
      >
        {grade}
      </Badge>
      <span className="text-xs text-muted-foreground font-medium">
        {score}/100
      </span>
      {showTooltip && (
        <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
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
