"use client"

import type React from "react"
import { useRef, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, Upload, Trash2, Edit3 } from "lucide-react"

interface Annotation {
  id: string
  time: number
  x: number
  title: string
  note: string
  color: string
}

interface AudioWaveformProps {
  className?: string
}

export function AudioWaveform({ className = "" }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const animationRef = useRef<number>()

  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [audioUrl, setAudioUrl] = useState<string>("")
  const [animationTime, setAnimationTime] = useState(0)
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  const colors = ["#6366f1", "#15803d", "#ea580c", "#ff9738", "#4b5563"]

  useEffect(() => {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)()
    setAudioContext(context)

    return () => {
      context.close()
    }
  }, [])

  const generateWaveformData = useCallback((buffer: AudioBuffer) => {
    const rawData = buffer.getChannelData(0)
    const samples = 1000 // Number of samples for waveform
    const blockSize = Math.floor(rawData.length / samples)
    const filteredData = []

    for (let i = 0; i < samples; i++) {
      const blockStart = blockSize * i
      let sum = 0
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[blockStart + j])
      }
      filteredData.push(sum / blockSize)
    }

    const multiplier = Math.pow(Math.max(...filteredData), -1)
    return filteredData.map((n) => n * multiplier)
  }, [])

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || waveformData.length === 0) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    const bgGradient = ctx.createLinearGradient(0, 0, 0, height)
    bgGradient.addColorStop(0, "rgba(99, 102, 241, 0.05)")
    bgGradient.addColorStop(0.5, "rgba(99, 102, 241, 0.02)")
    bgGradient.addColorStop(1, "rgba(99, 102, 241, 0.05)")
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, width, height)

    const barWidth = width / waveformData.length
    const centerY = height / 2

    waveformData.forEach((amplitude, i) => {
      const x = i * barWidth
      const baseHeight = amplitude * height * 0.7

      let animatedHeight = baseHeight
      if (isPlaying) {
        const pulseEffect = 1 + Math.sin(animationTime * 0.01 + i * 0.1) * 0.1
        animatedHeight = baseHeight * pulseEffect
      }

      if (hoveredBar === i) {
        animatedHeight *= 1.2
      }

      const barGradient = ctx.createLinearGradient(x, centerY - animatedHeight / 2, x, centerY + animatedHeight / 2)

      const progress = currentTime / duration
      const barProgress = i / waveformData.length

      if (barProgress <= progress && isPlaying) {
        barGradient.addColorStop(0, "#6366f1")
        barGradient.addColorStop(0.5, "#8b5cf6")
        barGradient.addColorStop(1, "#6366f1")

        ctx.shadowColor = "#6366f1"
        ctx.shadowBlur = 8
      } else {
        barGradient.addColorStop(0, "rgba(99, 102, 241, 0.3)")
        barGradient.addColorStop(0.5, "rgba(139, 92, 246, 0.4)")
        barGradient.addColorStop(1, "rgba(99, 102, 241, 0.3)")

        ctx.shadowBlur = 0
      }

      ctx.fillStyle = barGradient

      const barY = centerY - animatedHeight / 2
      const radius = Math.min(barWidth / 4, 2)

      ctx.beginPath()
      ctx.roundRect(x + 1, barY, barWidth - 2, animatedHeight, radius)
      ctx.fill()

      ctx.shadowBlur = 0
    })

    if (duration > 0) {
      const progressX = (currentTime / duration) * width

      ctx.shadowColor = "#ef4444"
      ctx.shadowBlur = 12
      ctx.strokeStyle = "#ef4444"
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(progressX, 0)
      ctx.lineTo(progressX, height)
      ctx.stroke()

      if (isPlaying) {
        const pulseRadius = 8 + Math.sin(animationTime * 0.02) * 4
        ctx.fillStyle = "rgba(239, 68, 68, 0.6)"
        ctx.beginPath()
        ctx.arc(progressX, height / 2, pulseRadius, 0, 2 * Math.PI)
        ctx.fill()
      }

      ctx.shadowBlur = 0
    }

    annotations.forEach((annotation) => {
      const x = annotation.x

      ctx.shadowColor = annotation.color
      ctx.shadowBlur = 8
      ctx.strokeStyle = annotation.color
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()

      const markerRadius = 8 + Math.sin(animationTime * 0.015) * 2
      ctx.fillStyle = annotation.color
      ctx.beginPath()
      ctx.arc(x, 15, markerRadius, 0, 2 * Math.PI)
      ctx.fill()

      ctx.fillStyle = "white"
      ctx.beginPath()
      ctx.arc(x, 15, markerRadius * 0.4, 0, 2 * Math.PI)
      ctx.fill()

      ctx.shadowBlur = 0
    })

    if (isPlaying) {
      const overlayGradient = ctx.createLinearGradient(0, 0, width, 0)
      overlayGradient.addColorStop(0, "rgba(99, 102, 241, 0.1)")
      overlayGradient.addColorStop(0.5, "rgba(139, 92, 246, 0.15)")
      overlayGradient.addColorStop(1, "rgba(99, 102, 241, 0.1)")

      ctx.fillStyle = overlayGradient
      ctx.fillRect(0, 0, (currentTime / duration) * width, height)
    }
  }, [waveformData, currentTime, duration, annotations, isPlaying, animationTime, hoveredBar])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !audioContext) return

    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = await audioContext.decodeAudioData(arrayBuffer)

      setAudioBuffer(buffer)
      setDuration(buffer.duration)

      const waveform = generateWaveformData(buffer)
      setWaveformData(waveform)

      const url = URL.createObjectURL(file)
      setAudioUrl(url)

      if (audioRef.current) {
        audioRef.current.src = url
      }
    } catch (error) {
      console.error("Error processing audio file:", error)
    }
  }

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || duration === 0) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const time = (x / canvas.width) * duration

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      time,
      x,
      title: `Note ${annotations.length + 1}`,
      note: "",
      color: colors[annotations.length % colors.length],
    }

    setAnnotations((prev) => [...prev, newAnnotation])

    const canvas2d = canvas.getContext("2d")
    if (canvas2d) {
      const ripple = () => {
        canvas2d.strokeStyle = newAnnotation.color
        canvas2d.lineWidth = 2
        canvas2d.beginPath()
        canvas2d.arc(x, event.clientY - rect.top, 20, 0, 2 * Math.PI)
        canvas2d.stroke()
      }
      setTimeout(ripple, 50)
    }
  }

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    setMousePosition({ x, y })

    const barIndex = Math.floor((x / canvas.width) * waveformData.length)
    setHoveredBar(barIndex)
  }

  const handleCanvasMouseLeave = () => {
    setHoveredBar(null)
  }

  const updateAnnotation = (id: string, updates: Partial<Annotation>) => {
    setAnnotations((prev) => prev.map((ann) => (ann.id === id ? { ...ann, ...updates } : ann)))
  }

  const deleteAnnotation = (id: string) => {
    setAnnotations((prev) => prev.filter((ann) => ann.id !== id))
  }

  const togglePlayback = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const updateTime = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateTime)
    }
  }

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateTime)
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying])

  useEffect(() => {
    drawWaveform()
  }, [drawWaveform])

  const animate = () => {
    setAnimationTime((prev) => prev + 1)
    requestAnimationFrame(animate)
  }

  useEffect(() => {
    const animationId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animationId)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Card className={`p-6 ${className} bg-gradient-to-br from-background to-muted/20`}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-foreground bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Audio Waveform Annotator
          </h2>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="flex items-center gap-2 hover:scale-105 transition-transform duration-200"
          >
            <Upload className="w-4 h-4" />
            Upload Audio
          </Button>
        </div>

        <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />

        <audio ref={audioRef} className="hidden" />

        <div className="relative group">
          <canvas
            ref={canvasRef}
            width={800}
            height={200}
            className="w-full h-48 bg-gradient-to-r from-muted/50 to-muted rounded-xl cursor-crosshair border border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300"
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
          />
          {waveformData.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <div className="text-lg font-medium">Upload an audio file to see the waveform</div>
                <div className="text-sm opacity-70">Click anywhere on the waveform to add annotations</div>
              </div>
            </div>
          )}
          {hoveredBar !== null && duration > 0 && (
            <div
              className="absolute bg-popover text-popover-foreground px-2 py-1 rounded text-xs pointer-events-none z-10 shadow-lg border"
              style={{
                left: mousePosition.x - 30,
                top: mousePosition.y - 35,
                transform: "translateX(-50%)",
              }}
            >
              {formatTime((hoveredBar / waveformData.length) * duration)}
            </div>
          )}
        </div>

        {audioUrl && (
          <div className="flex items-center gap-4">
            <Button
              onClick={togglePlayback}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-transparent hover:scale-105 transition-all duration-200"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? "Pause" : "Play"}
            </Button>
            <div className="text-sm text-muted-foreground font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        )}

        {annotations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-foreground">Annotations</h3>
            <div className="space-y-2">
              {annotations.map((annotation) => (
                <div key={annotation.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: annotation.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {formatTime(annotation.time)}
                      </Badge>
                      <span className="font-medium text-sm">{annotation.title}</span>
                    </div>
                    {annotation.note && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">{annotation.note}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium">Title</label>
                            <Input
                              value={annotation.title}
                              onChange={(e) => updateAnnotation(annotation.id, { title: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Note</label>
                            <Textarea
                              value={annotation.note}
                              onChange={(e) => updateAnnotation(annotation.id, { note: e.target.value })}
                              className="mt-1"
                              rows={3}
                            />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAnnotation(annotation.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
