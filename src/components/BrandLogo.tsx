import Image from "next/image";

import { cn } from "@/lib/utils";
import { brandLogoSpec } from "@/lib/brand/brandAssets";

export type BrandLogoProps = {
  imageClassName?: string;
};

export function BrandLogo({ imageClassName }: BrandLogoProps) {
  const { src, alt, width, height, wrapperClass, roundedClass } = brandLogoSpec;
  return (
    <div className={cn(wrapperClass, roundedClass)}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={cn("h-full w-full object-cover", imageClassName)}
        priority
      />
    </div>
  );
}
