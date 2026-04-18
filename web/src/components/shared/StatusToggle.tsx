import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils"; 

interface StatusToggleProps {
  isActive: boolean;
  onToggle: (checked: boolean) => void;
  activeText?: string; 
  inactiveText?: string;
  disabled?: boolean;
  className?: string; // Add the className prop
}

export function StatusToggle({
  isActive,
  onToggle,
  activeText = "Active",
  inactiveText = "Inactive",
  disabled = false,
  className, 
}: StatusToggleProps) {
  return (
    
    <div className={cn("flex items-center space-x-3", className)}>
      <Switch
        id="status-toggle"
        checked={isActive}
        onCheckedChange={onToggle}
        disabled={disabled}
      />
      <Label 
        htmlFor="status-toggle" 
        className={cn(
          "text-sm font-medium transition-colors",
          isActive ? "text-slate-900" : "text-slate-500"
        )}
      >
        {isActive ? activeText : inactiveText}
      </Label>
    </div>
  );
}