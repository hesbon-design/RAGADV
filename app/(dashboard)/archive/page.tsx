import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BotMessageSquare, Sparkles, Database, Layers } from "lucide-react";

export default function ArchivePage() {
  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Ask Archive & Knowledge Reflection</h1>
          <Badge variant="secondary" className="text-xs font-semibold">
            Sprint 5–7 Roadmap
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Conversational Q&A across the permanent organizational memory archive with Reciprocal Rank Fusion.
        </p>
      </div>

      <Card className="border-border/60 bg-muted/20 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-lg mx-auto">
          <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 shadow-xs">
            <BotMessageSquare className="size-7" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight">
            Self-Learning Knowledge Reflection Engine
          </h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Approved compliance reports are queued for Contextual Chunking, 768-dimensional vector embedding, and automated synthesis.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left text-xs">
            <div className="p-3.5 rounded-lg border bg-background/80 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Database className="size-3.5 text-primary" />
                Hybrid Search
              </div>
              <p className="text-muted-foreground text-[11px]">
                Dense embeddings + sparse BM25 keyword matching via Reciprocal Rank Fusion (RRF k=60).
              </p>
            </div>

            <div className="p-3.5 rounded-lg border bg-background/80 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Sparkles className="size-3.5 text-primary" />
                Knowledge Reflection
              </div>
              <p className="text-muted-foreground text-[11px]">
                3-sentence synthesis connecting novel claims, historical precedents, and open risks with 1.5× boost.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
