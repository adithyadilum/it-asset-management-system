import Image from "next/image"

type BrandHeaderProps = {
  collapsed?: boolean
}

export function BrandHeader({ collapsed = false }: BrandHeaderProps) {
  if (collapsed) {
    return (
      <div className="inline-flex items-center justify-center">
        <Image
          src="/icon.png"
          alt="TIQRI Assets Icon"
          width={32}
          height={32}
          priority
          className="size-8 object-contain"
        />
      </div>
    )
  }

  return (
    <div className="inline-flex items-center justify-center gap-2">
      <Image
        src="/tiqri-logo.png"
        alt="TIQRI Corporate Logo"
        width={89}
        height={50}
        priority
        className="h-12.5 w-22.25 object-contain"
      />
      <span className="text-4xl leading-12.5 font-semibold text-primary">Assets</span>
    </div>
  )
}

export function LoginBrandHeader() {
  return <BrandHeader />
}