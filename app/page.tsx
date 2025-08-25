import React from "react";
import EnhancedAnnotator from "@/components/audio-waveform";

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <EnhancedAnnotator />
      </div>
    </main>
  )
}
