"use client";

import {
  ChevronRight,
  Database,
  FileText,
  HardDrive,
  Monitor,
  ScrollText,
  Wrench,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { ReportTemplateData } from '@/types/standard-reports';

function DataSourceIcon({ dataSource, className }: { dataSource: string; className?: string }) {
  switch (dataSource) {
    case 'Assets':
      return <HardDrive className={className} />;
    case 'Maintenance Records':
      return <Wrench className={className} />;
    case 'Disposal Records':
      return <FileText className={className} />;
    case 'Software Licenses':
      return <Monitor className={className} />;
    case 'Audit Logs':
      return <ScrollText className={className} />;
    default:
      return <Database className={className} />;
  }
}

interface ReportTemplateCardProps {
  template: ReportTemplateData;
  onPreviewClick?: (templateId: number) => void;
  onDeleteClick?: (templateId: number) => void;
}

export function ReportTemplateCard({
  template,
  onPreviewClick,
  onDeleteClick,
}: ReportTemplateCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <>
      <Card size="sm" className="h-full justify-between border-border bg-background">
        <CardHeader className="gap-3 p-4 pb-3 min-w-0">
          <div className="flex items-start justify-between gap-3 min-w-0 w-full overflow-hidden">
            <div className="space-y-1 flex-1 min-w-0 overflow-hidden">
              <CardTitle className="text-base font-medium text-card-foreground truncate block w-full">
                {template.name}
              </CardTitle>
              <CardDescription className="text-sm leading-5 text-muted-foreground truncate block w-full">
                {template.description || template.dataSource}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <DataSourceIcon dataSource={template.dataSource} className="size-4 shrink-0 text-foreground" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    variant="destructive"
                    className="group cursor-pointer transition-colors hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700 [&>svg]:text-red-600 hover:[&>svg]:text-red-700 focus:[&>svg]:text-red-700"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex px-4 pb-4">
          <Button
            size="sm"
            className="mx-auto w-auto px-3"
            onClick={() => onPreviewClick?.(template.id)}
          >
            Preview report
            <ChevronRight className="size-4" />
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the &quot;{template.name}&quot; template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDeleteDialog(false);
                onDeleteClick?.(template.id);
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
