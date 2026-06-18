import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";
import { Switch } from "@/components/ui/switch";

interface ActiveStatusToggleProps {
    isActive: boolean;
    isDetailMode?: boolean;
    onChange?: (checked: boolean) => void;
}

export function ActiveStatusToggle({
    isActive,
    isDetailMode = false,
    onChange,
}: ActiveStatusToggleProps) {
    return (
        <div className="flex items-center justify-between rounded-lg border p-4">
            {!isDetailMode ? <input type="hidden" name="isActive" value={String(isActive)} /> : null}
            <div className="space-y-0.5">
                <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                    Active Status
                </label>
                <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                    Keep this value selectable for new records.
                </p>
            </div>
            <Switch
                checked={isActive}
                disabled={isDetailMode}
                onCheckedChange={onChange}
            />
        </div>
    );
}
