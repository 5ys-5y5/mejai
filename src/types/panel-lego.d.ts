import "react";

declare module "react" {
  interface HTMLAttributes<T> {
    "panel-lego"?: string;
  }

  interface SVGAttributes<T> {
    "panel-lego"?: string;
  }
}
