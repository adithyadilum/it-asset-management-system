import type { ReactNode } from "react"

interface DataTablesContainerProps {
  leftSection: ReactNode
  rightSection: ReactNode
}

export function DataTablesContainer({ leftSection, rightSection }: DataTablesContainerProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="w-full">
        {leftSection}
      </div>
      <div className="w-full flex flex-col">
        {rightSection}
      </div>
    </div>
  )
}
