"use client";

import { useActionState, useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
    createCategory,
    INITIAL_CATEGORY_FORM_STATE,
} from "@/actions/master-data";
import { FormPanel } from "@/components/shared/slide-panels/form-panel";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Pillar = "IT & Digital" | "Software" | "Office Furniture" | "Office Electronics";
type InputType = "Text" | "Number" | "Date" | "Dropdown" | "Boolean";

type CustomAttribute = {
    id: string;
    fieldName: string;
    inputType: InputType;
    required: boolean;
};

interface CategoryFormPanelProps {
    isOpen: boolean;
    onCloseUrl: string;
}

export function CategoryFormPanel({ isOpen, onCloseUrl }: CategoryFormPanelProps) {
    const router = useRouter();
    const [pillar, setPillar] = useState<Pillar>("IT & Digital");
    const [state, formAction, isPending] = useActionState(
        createCategory,
        INITIAL_CATEGORY_FORM_STATE
    );

    const [attributes, setAttributes] = useState<CustomAttribute[]>([
        { id: crypto.randomUUID(), fieldName: "", inputType: "Text", required: false },
    ]);

    const addAttribute = () => {
        setAttributes((previous) => ([
            ...previous,
            { id: crypto.randomUUID(), fieldName: "", inputType: "Text", required: false },
        ]));
    };

    const removeAttribute = (id: string) => {
        setAttributes((previous) => previous.filter((attribute) => attribute.id !== id));
    };

    const updateAttribute = <TKey extends keyof CustomAttribute>(
        id: string,
        key: TKey,
        value: CustomAttribute[TKey]
    ) => {
        setAttributes((previous) => previous.map((attribute) => (
            attribute.id === id ? { ...attribute, [key]: value } : attribute
        )));
    };

    const handleClose = useCallback((open: boolean) => {
        if (!open) {
            router.push(onCloseUrl, { scroll: false });
        }
    }, [onCloseUrl, router]);

    const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        formAction(new FormData(event.currentTarget));
    }, [formAction]);

    useEffect(() => {
        if (state.success) {
            handleClose(false);
        }
    }, [handleClose, state.success]);

    return (
        <FormPanel
            isOpen={isOpen}
            onClose={handleClose}
            title="Add New Category"
            onSubmit={handleSubmit}
            isSubmitting={isPending}
            submitLabel="Save Category"
            submittingLabel="Saving Category..."
        >
            <input type="hidden" name="pillar" value={pillar} />
            <input type="hidden" name="customSchema" value={JSON.stringify(attributes)} />

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>Type:</label>
                    <Select value={pillar} onValueChange={(value) => setPillar(value as Pillar)}>
                        <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="IT & Digital">Hardware</SelectItem>
                            <SelectItem value="Software">Software</SelectItem>
                        </SelectContent>
                    </Select>
                    {state.errors?.pillar && <p className="text-sm text-red-500">{state.errors.pillar[0]}</p>}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                            Category Name: <span className="text-red-500">*</span>
                        </label>
                        <Input name="name" placeholder="Wireless Keyboards" required />
                        {state.errors?.name && <p className="text-sm text-red-500">{state.errors.name[0]}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>Prefix Code :</label>
                        <div className="relative">
                            <Input name="prefix" placeholder="WKE" maxLength={3} className="uppercase" required />
                            <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" sideOffset={6}>
                                        Used to generate Asset IDs. This cannot be changed after creation.
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        {state.errors?.prefix && <p className="text-sm text-red-500">{state.errors.prefix[0]}</p>}
                    </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                    <div>
                        <h3 className={`${TYPOGRAPHY_CLASSNAMES.textSmSemiBold} text-slate-900`}>Custom Attributes</h3>
                        <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-slate-500`}>Define any specific details to track for this category.</p>
                    </div>

                    <div className="rounded-md border bg-slate-50/50">
                        <div className="grid grid-cols-12 gap-4 border-b bg-slate-50 p-3 text-xs font-medium text-slate-500">
                            <div className="col-span-5">Field Name</div>
                            <div className="col-span-4">Input Type</div>
                            <div className="col-span-2 text-center">Required?</div>
                            <div className="col-span-1"></div>
                        </div>

                        <div className="p-2 space-y-2">
                            {attributes.map((attr) => (
                                <div key={attr.id} className="grid grid-cols-12 gap-4 items-center p-1">
                                    <div className="col-span-5">
                                        <Input
                                            value={attr.fieldName}
                                            onChange={(e) => updateAttribute(attr.id, "fieldName", e.target.value)}
                                            placeholder="e.g., Size"
                                            className="bg-white h-9"
                                        />
                                    </div>
                                    <div className="col-span-4">
                                        <Select
                                            value={attr.inputType}
                                            onValueChange={(value) => updateAttribute(attr.id, "inputType", value as InputType)}
                                        >
                                            <SelectTrigger className="bg-white h-9"><SelectValue /></SelectTrigger>
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
                                            checked={attr.required}
                                            onCheckedChange={(checked) => updateAttribute(attr.id, "required", checked === true)}
                                        />
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeAttribute(attr.id)}
                                            disabled={attributes.length === 1}
                                            className="text-slate-400 hover:text-red-500"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="border-t bg-slate-50 p-3">
                            <Button type="button" variant="ghost" size="sm" onClick={addAttribute} className="text-slate-500 w-full hover:bg-slate-200">
                                <Plus className="h-4 w-4 mr-2" /> Add more
                            </Button>
                        </div>
                    </div>
                </div>

                {state.message && !state.success && (
                    <p className="text-sm font-medium text-red-500">{state.message}</p>
                )}
            </div>
        </FormPanel>
    );
}