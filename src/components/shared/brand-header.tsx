import Image from 'next/image';

type BrandHeaderProps = {
  collapsed?: boolean;
};

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
          className="size-8 object-contain dark:brightness-0 dark:invert"
        />
      </div>
    );
  }

  return (
    <div className="inline-flex items-center justify-center gap-1.5 md:gap-2">
      <Image
        src="/tiqri-logo.png"
        alt="TIQRI Corporate Logo"
        width={89}
        height={50}
        priority
        className="h-7 w-auto md:h-12.5 md:w-22.25 object-contain dark:brightness-0 dark:invert"
      />
      <span className="text-2xl md:text-4xl md:leading-12.5 font-semibold text-primary dark:text-white">
        Assets
      </span>
    </div>
  );
}

export function LoginBrandHeader() {
  return <BrandHeader />;
}
