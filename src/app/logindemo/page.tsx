import { Suspense } from "react";
import LoginDemoClient from "./LoginDemoClient";

export default function LoginDemoPage() {
  return (
    <Suspense fallback={null}>
      <LoginDemoClient />
    </Suspense>
  );
}
