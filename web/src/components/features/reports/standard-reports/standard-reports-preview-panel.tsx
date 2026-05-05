'use client';

import { ChevronRight, Download, Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';

export function StandardReportsPreviewPanel() {
  return (
    <div className="flex min-h-0 flex-col rounded-xl gap-6 bg-background">
      <CardHeader className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className={TYPOGRAPHY_CLASSNAMES.textLgSemiBold}>
              Report Preview (Showing first 0 rows)
            </h3>
          </div>

          <div className="flex items-center gap-2.5">
            <Button className="bg-success text-success-foreground hover:bg-success/80" size="sm">
              <Download className="size-4" />
              Export CSV
            </Button>
            <Button variant="default" size="sm">
              Generate PDF
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <div className="flex-1 p-6 pt-0 flex flex-col min-h-0">
        <Card className="border-border bg-card flex h-full min-h-0 flex-col rounded-xl shadow-sm overflow-hidden">
          <CardContent className="flex h-full flex-1 items-center justify-center p-4">
            <div className="flex max-w-lg flex-col items-center gap-4 text-center text-muted-foreground">
              <Filter className="size-12 text-foreground" strokeWidth={1} />
              <div className="space-y-1.5">
                <p className={TYPOGRAPHY_CLASSNAMES.textSmRegular}>
                  Select your filters and click Preview Data to see results here.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
