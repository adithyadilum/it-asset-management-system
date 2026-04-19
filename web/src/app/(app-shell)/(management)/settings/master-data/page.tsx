import Link from "next/link";

import { BrandFormPanel } from "@/components/features/master-data/brand-form-panel";
import { CategoryFormPanel } from "@/components/features/master-data/category-form-panel";
import { Button } from "@/components/ui/button";

type MasterDataPageProps = {
  searchParams: Promise<{
    panel?: string;
  }>;
};

export default async function MasterDataPage({ searchParams }: MasterDataPageProps) {
  const params = await searchParams;
  const currentPanel = params.panel;
  const isPanelOpen = !!currentPanel;

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50 transition-[gap] duration-300 ease-out" style={{ gap: isPanelOpen ? '0.5rem' : '0' }}>

      {/* MAIN CONTENT AREA */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col p-6 overflow-auto bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Master Data</h1>
            <p className="text-slate-500">Manage categories, brands, and system taxonomy.</p>
          </div>

          <div className="flex gap-3">
            <Link href="?panel=brand">
              <Button variant="outline">Add Brand</Button>
            </Link>
            <Link href="?panel=category">
              <Button>Add Category</Button>
            </Link>
          </div>
        </div>

        {/* TODO: Tomorrow, we will drop the Shadcn Tabs here 
          to switch between the Brands Table, Categories Table, etc. 
        */}
        <div className="flex-1 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400">
          Data Tables will go here
        </div>
      </main>

      <BrandFormPanel
        isOpen={currentPanel === "brand"}
        onCloseUrl="/settings/master-data"
      />

      <CategoryFormPanel
        isOpen={currentPanel === "category"}
        onCloseUrl="/settings/master-data"
      />
    </div>
  );
}