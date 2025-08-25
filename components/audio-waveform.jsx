"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play,
  Pause,
  Upload,
  Trash2,
  Download,
  Image as ImageIcon,
  Music,
  Sparkles,
  FileText,
  Palette,
} from "lucide-react";
import { Toaster, toast } from "react-hot-toast";

export default function EnhancedAnnotator() {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const imageCanvasRef = useRef(null);
  const animationRef = useRef();

  const [audioBuffer, setAudioBuffer] = useState(null);
  const [audioContext, setAudioContext] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState([]);
  const [audioUrl, setAudioUrl] = useState("");
  const [imageFile, setImageFile] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [annotations, setAnnotations] = useState([]);
  const [animationTime, setAnimationTime] = useState(0);
  const [hoveredBar, setHoveredBar] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState("audio");

  const colors = [
    "#6366f1",
    "#15803d",
    "#ea580c",
    "#ff9738",
    "#4b5563",
    "#ec4899",
    "#10b981",
    "#f59e0b",
  ];

  // Initialize audio context
  useEffect(() => {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    setAudioContext(context);
    return () => {
      context.close().catch((err) => console.error("Error closing AudioContext:", err));
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Dynamic canvas sizing
  useEffect(() => {
    const updateCanvasSize = () => {
      const audioCanvas = canvasRef.current;
      const imageCanvas = imageCanvasRef.current;

      if (audioCanvas) {
        const parent = audioCanvas.parentElement;
        if (parent) {
          audioCanvas.width = parent.clientWidth;
          audioCanvas.height = parent.clientHeight || 300;
        }
      }

      if (imageCanvas && imageFile) {
        const img = new Image();
        img.src = imageFile;
        img.onload = () => {
          const parent = imageCanvas.parentElement;
          if (parent) {
            imageCanvas.width = img.width || parent.clientWidth;
            imageCanvas.height = img.height || 500;
          }
        };
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [imageFile]);

  // Waveform generation
  const generateWaveformData = useCallback((buffer) => {
    const rawData = buffer.getChannelData(0);
    const samples = 1200;
    const blockSize = Math.floor(rawData.length / samples);
    const filteredData = [];

    for (let i = 0; i < samples; i++) {
      const blockStart = blockSize * i;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[blockStart + j]);
      }
      filteredData.push(sum / blockSize);
    }

    const multiplier = Math.pow(Math.max(...filteredData), -1);
    return filteredData.map((n) => n * multiplier);
  }, []);

  // Waveform drawing
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    const pulseAlpha = 0.05 + Math.sin(animationTime * 0.005) * 0.03;
    bgGradient.addColorStop(0, `rgba(99, 102, 241, ${pulseAlpha})`);
    bgGradient.addColorStop(0.5, `rgba(139, 92, 246, ${pulseAlpha * 0.5})`);
    bgGradient.addColorStop(1, `rgba(99, 102, 241, ${pulseAlpha})`);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(99, 102, 241, 0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const y = (height / 10) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const barWidth = width / waveformData.length;
    const centerY = height / 2;

    waveformData.forEach((amplitude, i) => {
      const x = i * barWidth;
      const baseHeight = amplitude * height * 0.8;

      let animatedHeight = baseHeight;
      if (isPlaying) {
        const waveEffect = 1 + Math.sin(animationTime * 0.008 + i * 0.05) * 0.15;
        const rippleEffect = 1 + Math.sin(animationTime * 0.012 + i * 0.03) * 0.08;
        animatedHeight = baseHeight * waveEffect * rippleEffect;
      }

      if (hoveredBar === i) {
        animatedHeight *= 1.3;
        const glowRadius = 15 + Math.sin(animationTime * 0.02) * 5;
        ctx.shadowColor = "#6366f1";
        ctx.shadowBlur = glowRadius;
      }

      const progress = duration > 0 ? currentTime / duration : 0;
      const barProgress = i / waveformData.length;

      const barGradient = ctx.createLinearGradient(
        x,
        centerY - animatedHeight / 2,
        x,
        centerY + animatedHeight / 2
      );

      if (barProgress <= progress && isPlaying) {
        const intensity = 1 + Math.sin(animationTime * 0.01 + i * 0.1) * 0.3;
        barGradient.addColorStop(0, `hsl(245, 100%, ${60 + intensity * 10}%)`);
        barGradient.addColorStop(0.5, `hsl(260, 100%, ${70 + intensity * 10}%)`);
        barGradient.addColorStop(1, `hsl(245, 100%, ${60 + intensity * 10}%)`);
      } else {
        const staticIntensity = 0.4 + amplitude * 0.3;
        barGradient.addColorStop(0, `rgba(99, 102, 241, ${staticIntensity})`);
        barGradient.addColorStop(0.5, `rgba(139, 92, 246, ${staticIntensity + 0.1})`);
        barGradient.addColorStop(1, `rgba(99, 102, 241, ${staticIntensity})`);
      }

      ctx.fillStyle = barGradient;

      const barY = centerY - animatedHeight / 2;
      const radius = Math.min(barWidth / 3, 3);

      ctx.beginPath();
      ctx.roundRect(x + 1, barY, barWidth - 2, animatedHeight, radius);
      ctx.fill();

      ctx.shadowBlur = 0;
    });

    if (duration > 0 && currentTime >= 0) {
      const progressX = (currentTime / duration) * width;

      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 20;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, height);
      ctx.stroke();

      if (isPlaying) {
        const pulseRadius = 12 + Math.sin(animationTime * 0.03) * 6;
        const glowRadius = 25 + Math.sin(animationTime * 0.02) * 10;

        ctx.shadowBlur = glowRadius;
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(progressX, height / 2, pulseRadius, 0, 2 * Math.PI);
        ctx.fill();

        ctx.shadowBlur = 5;
        ctx.fillStyle = "#fef2f2";
        ctx.beginPath();
        ctx.arc(progressX, height / 2, pulseRadius * 0.3, 0, 2 * Math.PI);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
    }

    annotations
      .filter((a) => a.type === "audio")
      .forEach((annotation) => {
        const x = annotation.x;

        ctx.shadowColor = annotation.color;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = annotation.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        const baseRadius = 10;
        const pulseRadius = baseRadius + Math.sin(animationTime * 0.02) * 4;
        const glowRadius = pulseRadius + 8;

        ctx.shadowBlur = 20;
        ctx.fillStyle = `${annotation.color}40`;
        ctx.beginPath();
        ctx.arc(x, 20, glowRadius, 0, 2 * Math.PI);
        ctx.fill();

        ctx.shadowBlur = 10;
        ctx.fillStyle = annotation.color;
        ctx.beginPath();
        ctx.arc(x, 20, pulseRadius, 0, 2 * Math.PI);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.beginPath();
        ctx.arc(x - 2, 18, pulseRadius * 0.3, 0, 2 * Math.PI);
        ctx.fill();

        ctx.shadowBlur = 0;
      });

    if (isPlaying) {
      for (let i = 0; i < 5; i++) {
        const sparkleX = (Math.sin(animationTime * 0.005 + i) + 1) * width / 2;
        const sparkleY = (Math.cos(animationTime * 0.007 + i * 2) + 1) * height / 2;
        const sparkleSize = 2 + Math.sin(animationTime * 0.01 + i) * 1;

        ctx.fillStyle = `hsla(${60 + i * 72}, 70%, 80%, ${
          0.3 + Math.sin(animationTime * 0.015 + i) * 0.3
        })`;
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, sparkleSize, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }, [waveformData, currentTime, duration, annotations, isPlaying, animationTime, hoveredBar]);

  // Image drawing
  const drawImageAnnotations = useCallback(() => {
    const canvas = imageCanvasRef.current;
    if (!canvas || !imageLoaded || !imageFile) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.src = imageFile;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      annotations
        .filter((a) => a.type === "image")
        .forEach((annotation) => {
          const pulseSize = 8 + Math.sin(animationTime * 0.02) * 3;
          const glowSize = pulseSize + 10;

          ctx.shadowColor = annotation.color;
          ctx.shadowBlur = 20;
          ctx.fillStyle = `${annotation.color}40`;
          ctx.beginPath();
          ctx.arc(annotation.x, annotation.y, glowSize, 0, 2 * Math.PI);
          ctx.fill();

          ctx.shadowBlur = 10;
          ctx.fillStyle = annotation.color;
          ctx.beginPath();
          ctx.arc(annotation.x, annotation.y, pulseSize, 0, 2 * Math.PI);
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.beginPath();
          ctx.arc(annotation.x - 2, annotation.y - 2, pulseSize * 0.3, 0, 2 * Math.PI);
          ctx.fill();

          ctx.shadowBlur = 0;
        });
    };
  }, [annotations, animationTime, imageLoaded, imageFile]);

  // File upload handlers
  const handleAudioUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !audioContext) {
      toast.error("No file selected or AudioContext unavailable");
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = await audioContext.decodeAudioData(arrayBuffer);

      setAudioBuffer(buffer);
      setDuration(buffer.duration);

      const waveform = generateWaveformData(buffer);
      setWaveformData(waveform);

      const url = URL.createObjectURL(file);
      setAudioUrl(url);

      if (audioRef.current) {
        audioRef.current.src = url;
      }
    } catch (error) {
      console.error("Error processing audio file:", error);
      toast.error("Failed to process audio file");
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast.error("No image selected");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageFile(e.target?.result);
        setImageLoaded(true);
      };
      reader.onerror = () => {
        toast.error("Failed to load image");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error processing image file:", error);
      toast.error("Failed to process image file");
    }
  };

  // Canvas click handlers
  const handleAudioCanvasClick = (event) => {
    const canvas = canvasRef.current;
    if (!canvas || duration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = (x / canvas.width) * duration;

    const newAnnotation = {
      id: Date.now().toString(),
      time,
      x,
      y: 0,
      title: `Audio Note ${annotations.filter((a) => a.type === "audio").length + 1}`,
      note: "",
      color: colors[annotations.length % colors.length],
      type: "audio",
    };

    setAnnotations((prev) => [...prev, newAnnotation]);
  };

  const handleImageCanvasClick = (event) => {
    const canvas = imageCanvasRef.current;
    if (!canvas || !imageLoaded) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newAnnotation = {
      id: Date.now().toString(),
      x,
      y,
      title: `Image Note ${annotations.filter((a) => a.type === "image").length + 1}`,
      note: "",
      color: colors[annotations.length % colors.length],
      type: "image",
    };

    setAnnotations((prev) => [...prev, newAnnotation]);
  };

  // Mouse move handler
  const handleCanvasMouseMove = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setMousePosition({ x, y });

    const barIndex = Math.floor((x / canvas.width) * waveformData.length);
    setHoveredBar(barIndex);
  };

  // Annotation management
  const updateAnnotation = (id, updates) => {
    setAnnotations((prev) => prev.map((ann) => (ann.id === id ? { ...ann, ...updates } : ann)));
  };

  const deleteAnnotation = (id) => {
    setAnnotations((prev) => prev.filter((ann) => ann.id !== id));
  };

  // Audio controls
  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Export functionality
  const exportAnnotations = () => {
    const sortedAnnotations = [...annotations].sort((a, b) => {
      if (a.type === "audio" && b.type === "audio") {
        return (a.time || 0) - (b.time || 0);
      } else if (a.type === "image" && b.type === "image") {
        return a.x - b.x || (a.y || 0) - (b.y || 0);
      }
      return a.type.localeCompare(b.type);
    });

    const exportData = {
      annotations: sortedAnnotations,
      audioFile: audioUrl || undefined,
      imageFile: imageFile || undefined,
      duration: duration || undefined,
      timestamp: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `annotations_${new Date().toISOString().split("T")[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const exportAsText = () => {
    const sortedAnnotations = [...annotations].sort((a, b) => {
      if (a.type === "audio" && b.type === "audio") {
        return (a.time || 0) - (b.time || 0);
      } else if (a.type === "image" && b.type === "image") {
        return a.x - b.x || (a.y || 0) - (b.y || 0);
      }
      return a.type.localeCompare(b.type);
    });

    const audioAnnotations = sortedAnnotations.filter((a) => a.type === "audio");
    const imageAnnotations = sortedAnnotations.filter((a) => a.type === "image");

    let content = `# Annotation Export\n\n`;
    content += `Generated: ${new Date().toLocaleString()}\n\n`;

    if (audioAnnotations.length > 0) {
      content += `## Audio Annotations\n\n`;
      audioAnnotations.forEach((annotation, index) => {
        const time = annotation.time ? formatTime(annotation.time) : "N/A";
        content += `### ${index + 1}. ${annotation.title}\n`;
        content += `**Time:** ${time}\n`;
        content += `**Note:** ${annotation.note || "No note"}\n\n`;
      });
    }

    if (imageAnnotations.length > 0) {
      content += `## Image Annotations\n\n`;
      imageAnnotations.forEach((annotation, index) => {
        content += `### ${index + 1}. ${annotation.title}\n`;
        content += `**Position:** (${annotation.x}, ${annotation.y})\n`;
        content += `**Note:** ${annotation.note || "No note"}\n\n`;
      });
    }

    const dataBlob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `annotations_${new Date().toISOString().split("T")[0]}.md`;
    link.click();

    URL.revokeObjectURL(url);
  };

  // Animation and update loops
  const updateTime = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateTime);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateTime);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    let animationId;
    const animate = () => {
      if (isPlaying || annotations.length > 0 || imageLoaded) {
        setAnimationTime((prev) => prev + 1);
        drawWaveform();
        drawImageAnnotations();
      }
      animationId = requestAnimationFrame(animate);
    };

    if (isPlaying || annotations.length > 0 || imageLoaded) {
      animationId = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, annotations, imageLoaded, drawWaveform, drawImageAnnotations]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900 p-4">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-4 py-8">
          <div className="flex items-center justify-center gap-3">
            <div className="relative">
              <Sparkles className="w-8 h-8 text-indigo-500 animate-pulse" />
              <div className="absolute inset-0 animate-ping">
                <Sparkles className="w-8 h-8 text-indigo-300 opacity-75" />
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Enhanced Annotator Studio
            </h1>
            <div className="relative">
              <Palette className="w-8 h-8 text-pink-500 animate-bounce" />
            </div>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Annotate audio waveforms and images with beautiful animations. Export your annotations in
            multiple formats.
          </p>
        </div>

        <Card className="p-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-2xl border-0 ring-1 ring-white/20">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900">
              <TabsTrigger
                value="audio"
                className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 transition-all duration-300"
              >
                <Music className="w-4 h-4" />
                Audio Waveform
              </TabsTrigger>
              <TabsTrigger
                value="image"
                className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 transition-all duration-300"
              >
                <ImageIcon className="w-4 h-4" />
                Image Annotation
              </TabsTrigger>
            </TabsList>

            <TabsContent value="audio" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Audio Waveform
                </h2>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Audio
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleAudioUpload}
                className="hidden"
              />

              <audio ref={audioRef} className="hidden" />

              <div className="relative group">
                <canvas
                  ref={canvasRef}
                  className="w-full h-72 bg-gradient-to-br from-white to-indigo-50 dark:from-slate-800 dark:to-indigo-900 rounded-2xl cursor-crosshair border-2 border-indigo-200 dark:border-indigo-700 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.01]"
                  onClick={handleAudioCanvasClick}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseLeave={() => setHoveredBar(null)}
                />
                {waveformData.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="text-2xl font-semibold text-gray-600 dark:text-gray-400">
                        Upload an audio file to see the magic ✨
                      </div>
                      <div className="text-sm opacity-70">
                        Click anywhere on the waveform to add annotations
                      </div>
                    </div>
                  </div>
                )}
                {hoveredBar !== null && duration > 0 && (
                  <div
                    className="absolute bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 px-3 py-2 rounded-lg text-sm pointer-events-none z-10 shadow-xl border border-indigo-200 dark:border-indigo-700 animate-in fade-in-0 zoom-in-95 duration-200"
                    style={{
                      left: mousePosition.x - 40,
                      top: mousePosition.y - 50,
                    }}
                  >
                    {formatTime((hoveredBar / waveformData.length) * duration)}
                  </div>
                )}
              </div>

              {audioUrl && (
                <div className="flex items-center gap-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/50 dark:to-purple-900/50 rounded-xl">
                  <Button
                    onClick={togglePlayback}
                    className="flex items-center gap-3 bg-white dark:bg-slate-800/80 hover:scale-105 transition-all duration-300 shadow-lg"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    {isPlaying ? "Pause" : "Play"}
                  </Button>
                  <div className="text-lg font-mono text-gray-600 dark:text-gray-400">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-indigo-600">Annotations</h3>
                {annotations
                  .filter((a) => a.type === "audio")
                  .map((annotation) => (
                    <Popover key={annotation.id}>
                      <PopoverTrigger asChild>
                        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-all duration-200">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: annotation.color }}
                            />
                            <div>
                              <div className="font-semibold">{annotation.title}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {annotation.time ? `Time: ${formatTime(annotation.time)}` : "N/A"}
                              </div>
                            </div>
                          </div>
                          <Trash2
                            className="w-5 h-5 text-red-500 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteAnnotation(annotation.id);
                            }}
                          />
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-4">
                          <h4 className="font-semibold">Edit Annotation</h4>
                          <Input
                            value={annotation.title}
                            onChange={(e) =>
                              updateAnnotation(annotation.id, { title: e.target.value })
                            }
                            placeholder="Annotation title"
                          />
                          <Textarea
                            value={annotation.note}
                            onChange={(e) =>
                              updateAnnotation(annotation.id, { note: e.target.value })
                            }
                            placeholder="Add a note"
                            rows={4}
                          />
                          <div className="flex flex-wrap gap-2">
                            {colors.map((color) => (
                              <button
                                key={color}
                                className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800"
                                style={{ backgroundColor: color }}
                                onClick={() => updateAnnotation(annotation.id, { color })}
                              />
                            ))}
                          </div>
                          <Button
                            variant="destructive"
                            onClick={() => deleteAnnotation(annotation.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="image" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Image Annotation
                </h2>
                <Button
                  onClick={() => imageInputRef.current?.click()}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Upload Image
                </Button>
              </div>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              <div className="relative group">
                {imageFile ? (
                  <div className="relative">
                    <img
                      src={imageFile}
                      alt="Annotation target"
                      className="w-full max-h-[500px] object-contain rounded-2xl shadow-xl border-2 border-purple-200 dark:border-purple-700"
                      onLoad={() => setImageLoaded(true)}
                    />
                    <canvas
                      ref={imageCanvasRef}
                      className="absolute inset-0 w-full h-full cursor-crosshair rounded-2xl"
                      onClick={handleImageCanvasClick}
                    />
                  </div>
                ) : (
                  <div className="h-64 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl border-2 border-dashed border-purple-300 dark:border-purple-600 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <ImageIcon className="w-16 h-16 mx-auto text-purple-400 animate-bounce" />
                      <div className="text-xl font-semibold text-gray-600 dark:text-gray-400">
                        Upload an image to start annotating 📸
                      </div>
                      <div className="text-sm opacity-70">
                        Click anywhere on the image to add annotations
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-indigo-600">Annotations</h3>
                {annotations
                  .filter((a) => a.type === "image")
                  .map((annotation) => (
                    <Popover key={annotation.id}>
                      <PopoverTrigger asChild>
                        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-all duration-200">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: annotation.color }}
                            />
                            <div>
                              <div className="font-semibold">{annotation.title}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                Position: ({annotation.x}, {annotation.y})
                              </div>
                            </div>
                          </div>
                          <Trash2
                            className="w-5 h-5 text-red-500 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteAnnotation(annotation.id);
                            }}
                          />
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-4">
                          <h4 className="font-semibold">Edit Annotation</h4>
                          <Input
                            value={annotation.title}
                            onChange={(e) =>
                              updateAnnotation(annotation.id, { title: e.target.value })
                            }
                            placeholder="Annotation title"
                          />
                          <Textarea
                            value={annotation.note}
                            onChange={(e) =>
                              updateAnnotation(annotation.id, { note: e.target.value })
                            }
                            placeholder="Add a note"
                            rows={4}
                          />
                          <div className="flex flex-wrap gap-2">
                            {colors.map((color) => (
                              <button
                                key={color}
                                className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800"
                                style={{ backgroundColor: color }}
                                onClick={() => updateAnnotation(annotation.id, { color })}
                              />
                            ))}
                          </div>
                          <Button
                            variant="destructive"
                            onClick={() => deleteAnnotation(annotation.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-4 mt-8">
            <Button
              onClick={exportAnnotations}
              className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <Download className="w-4 h-4 mr-2" />
              Export as JSON
            </Button>
            <Button
              onClick={exportAsText}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <FileText className="w-4 h-4 mr-2" />
              Export as Markdown
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}