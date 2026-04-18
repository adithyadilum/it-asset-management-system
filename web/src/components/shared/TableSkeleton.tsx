import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  // placeholder rows to show (defaults to 5)
  rowCount?: number; 
  // An array of Tailwind width classes defining the layout (e.g., ["w-[20%]", "w-[50%]", "w-[30%]"])
  columnWidths: string[]; 
  // Whether to include a small checkbox skeleton (defaults to true)
  showCheckbox?: boolean; 
}

export function TableSkeleton({ 
  rowCount = 5, 
  columnWidths, 
  showCheckbox = true 
}: TableSkeletonProps) {
  return (
    <div className="w-full space-y-4">
      
      {/* Table Header Placeholder */}
      <div className="flex items-center space-x-4 border-b pb-4 px-2">
        {showCheckbox && <Skeleton className="h-4 w-4 rounded bg-slate-200" />}
        {/* Generates a header block for every width in the array */}
        {columnWidths.map((width, index) => (
          <Skeleton key={`header-col-${index}`} className={`h-6 ${width} bg-slate-200`} />
        ))}
      </div>
      
      {/* Table Rows Placeholder */}
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex items-center space-x-4 py-3 px-2 border-b border-slate-50 last:border-0">
          {showCheckbox && <Skeleton className="h-4 w-4 rounded bg-slate-100" />}
          
          {/* Generates the cells for this specific row based on the same array */}
          {columnWidths.map((width, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className={`h-5 ${width} bg-slate-100`} />
          ))}
        </div>
      ))}
      
    </div>
  );
}