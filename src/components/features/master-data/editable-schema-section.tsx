import { Info, Plus, Trash2 } from 'lucide-react';
import { type CustomAttribute } from '@/lib/master-data/shared';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const SCHEMA_CHECKBOX_CLASSNAME =
  'size-5 border-slate-400 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground';

interface EditableSchemaSectionProps {
  title: string;
  description: string;
  attributes: CustomAttribute[];
  onUpdate: <TKey extends keyof CustomAttribute>(
    id: string,
    key: TKey,
    value: CustomAttribute[TKey]
  ) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  fieldError?: string | null;
}

export function EditableSchemaSection({
  title,
  description,
  attributes,
  onUpdate,
  onAdd,
  onRemove,
  fieldError,
}: EditableSchemaSectionProps) {
  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center gap-2">
        <h3
          className={`${TYPOGRAPHY_CLASSNAMES.textSmSemiBold} text-foreground`}
        >
          {title}
        </h3>
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`${title} help`}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
              >
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={6}
              className="max-w-xs text-xs leading-relaxed"
            >
              {description}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="rounded-md border bg-muted/50">
        <div className="grid grid-cols-12 gap-4 border-b bg-muted p-3 text-xs font-medium text-muted-foreground">
          <div className="col-span-5">Field Name</div>
          <div className="col-span-4">Input Type</div>
          <div className="col-span-2 text-center">Required?</div>
          <div className="col-span-1"></div>
        </div>

        <div className="space-y-2 p-2">
          {attributes.map((attribute) => (
            <div
              key={attribute.id}
              className="grid grid-cols-12 items-center gap-4 p-1"
            >
              <div className="col-span-5">
                <Input
                  value={attribute.fieldName}
                  onChange={(event) =>
                    onUpdate(attribute.id, 'fieldName', event.target.value)
                  }
                  placeholder="e.g., RAM or MAC Address"
                  className="h-9 bg-background"
                />
              </div>
              <div className="col-span-4">
                <Select
                  value={attribute.inputType}
                  onValueChange={(value) =>
                    onUpdate(
                      attribute.id,
                      'inputType',
                      value as CustomAttribute['inputType']
                    )
                  }
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Text">Text</SelectItem>
                    <SelectItem value="Number">Number</SelectItem>
                    <SelectItem value="Date">Date</SelectItem>
                    <SelectItem value="Dropdown">Dropdown</SelectItem>
                    <SelectItem value="Boolean">Yes/No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex justify-center">
                <Checkbox
                  checked={attribute.required}
                  className={SCHEMA_CHECKBOX_CLASSNAME}
                  onCheckedChange={(checked) =>
                    onUpdate(attribute.id, 'required', checked === true)
                  }
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(attribute.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-red-600"
                  disabled={attributes.length === 1}
                  aria-label="Remove field"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onAdd}
            className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} w-full text-primary hover:text-primary/90`}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Field
          </Button>
        </div>
      </div>
      {fieldError && (
        <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
          {fieldError}
        </p>
      )}
    </div>
  );
}
