"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/design-system";

export function ConversationHero() {
  return (
    <section className="w-full bg-white text-black">
      <div className="container mx-auto w-full max-w-5xl px-6 py-16">
        <Card className="border border-zinc-200">
          <CardHeader>
            <CardTitle className="text-2xl">Conversation Sandbox</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <p className="text-zinc-600">
              Build and preview conversation flows with the shared design-system components.
            </p>
            <div>
              <Button size="lg" className="rounded-full">Start a demo</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
