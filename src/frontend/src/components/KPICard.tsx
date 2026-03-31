import { Card, CardContent } from "@/components/ui/card";
import type { ReactNode } from "react";

interface KPICardProps {
  title: string;
  value: string;
  icon: ReactNode;
  subtitle?: string;
  trend?: { value: string; positive: boolean };
  color?: string;
}

export default function KPICard({
  title,
  value,
  icon,
  subtitle,
  trend,
  color = "#B8924A",
}: KPICardProps) {
  return (
    <Card className="bg-card rounded-xl shadow-card border-0">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground truncate">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && (
              <span
                className={`text-xs font-medium mt-1 inline-block ${
                  trend.positive ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {trend.positive ? "▲" : "▼"} {trend.value}
              </span>
            )}
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ml-3"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
