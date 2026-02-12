export type BrandLogoSpec = {
  src: string;
  alt: string;
  width: number;
  height: number;
  roundedClass: string;
  wrapperClass: string;
};

export const brandLogoSpec: BrandLogoSpec = {
  src: "/brand/logo.svg",
  alt: "Mejai logomark",
  width: 36,
  height: 36,
  roundedClass: "rounded-xl",
  wrapperClass: "relative h-9 w-9 overflow-hidden bg-slate-200",
};
