import { PackageSearch } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title = "لا توجد بيانات",
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 text-center ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground">
        {icon ?? <PackageSearch className="w-7 h-7" />}
      </div>
      <div className="space-y-1">
        <p className="font-bold text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
