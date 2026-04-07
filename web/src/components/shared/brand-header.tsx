import Image from "next/image"

export function LoginBrandHeader() {
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