import { AudioWaveform } from "@/components/audio-waveform"

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <AudioWaveform />
      </div>
    </main>
  )
}
