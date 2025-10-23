"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Upload,
  FileVideo,
  Link,
  CheckCircle,
  XCircle,
  Loader2,
  FileAudio,
  Play,
  Clock
} from "lucide-react"

interface TranscriptionResult {
  transcription_id: string
  status: string
  transcript?: string
  segments?: any[]
  error?: string
}

export function AdminUploadInterface() {
  const [activeTab, setActiveTab] = useState("file")
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState("")
  const [webhookUrl, setWebhookUrl] = useState("")
  const [language, setLanguage] = useState("")
  const [videoId, setVideoId] = useState("")
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<TranscriptionResult | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)

  const transcribeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8001"

      const response = await fetch(`${apiBaseUrl}/api/v1/transcription/transcribe`, {
        method: "POST",
        headers: {
          // Let browser set Content-Type for FormData
        },
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Transcription failed")
      }

      return response.json()
    },
    onSuccess: (data) => {
      setResult(data)
      setIsTranscribing(false)
      setProgress(100)
    },
    onError: (error) => {
      setResult({ transcription_id: "", status: "failed", error: error.message })
      setIsTranscribing(false)
      setProgress(0)
    }
  })

  const handleFileUpload = async () => {
    if (!file) return

    setIsTranscribing(true)
    setProgress(10)
    setResult(null)

    const formData = new FormData()
    formData.append("file", file)

    if (webhookUrl) formData.append("webhook_url", webhookUrl)
    if (language) formData.append("language", language)
    if (videoId) formData.append("video_id", videoId)

    console.log("File upload Form data:", formData)

    setProgress(25)
    transcribeMutation.mutate(formData)
  }

  const handleUrlTranscription = async () => {
    if (!url.trim()) return

    setIsTranscribing(true)
    setProgress(10)
    setResult(null)

    const formData = new FormData()
    formData.append("audio_url", url.trim())

    if (webhookUrl) formData.append("webhook_url", webhookUrl)
    if (language) formData.append("language", language)
    if (videoId) formData.append("video_id", videoId)

    console.log("URL transcription Form data:", formData)

    // Use URL transcription endpoint
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8001"
    const response = await fetch(`${apiBaseUrl}/api/v1/transcription/transcribe-url`, {
      method: "POST",
      headers: {
        // Let browser set Content-Type for FormData
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || "URL transcription failed")
    }

    const result = await response.json()
    setResult(result)
    setIsTranscribing(false)
    setProgress(100)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const isVideoFile = (filename: string) => {
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv']
    return videoExtensions.some(ext => filename.toLowerCase().endsWith(ext))
  }

  const isAudioFile = (filename: string) => {
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac']
    return audioExtensions.some(ext => filename.toLowerCase().endsWith(ext))
  }

  const getFileIcon = (filename: string) => {
    if (isVideoFile(filename)) return <FileVideo className="h-8 w-8 text-blue-500" />
    if (isAudioFile(filename)) return <FileAudio className="h-8 w-8 text-green-500" />
    return <Upload className="h-8 w-8 text-gray-500" />
  }

  const getFileType = (filename: string) => {
    if (isVideoFile(filename)) return "Video File"
    if (isAudioFile(filename)) return "Audio File"
    return "Unsupported File"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Transcription Service</h1>
        <p className="text-muted-foreground">
          Upload video or audio files for automatic transcription using AI.
          Supports MP4, AVI, MOV, MP3, WAV, and more formats.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file">Upload File</TabsTrigger>
          <TabsTrigger value="url">From URL</TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                File Upload
              </CardTitle>
              <CardDescription>
                Upload a video or audio file directly from your computer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Input */}
              <div className="space-y-2">
                <Label htmlFor="file-upload">Select File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept="audio/*,video/*"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
              </div>

              {/* File Preview */}
              {file && (
                <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
                  {getFileIcon(file.name)}
                  <div className="flex-1">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {getFileType(file.name)} • {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}

              {/* Additional Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="video-id">Video ID *</Label>
                  <Input
                    id="video-id"
                    placeholder="Enter video UUID"
                    value={videoId}
                    onChange={(e) => setVideoId(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Required: Video to associate transcription with</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL (Optional)</Label>
                  <Input
                    id="webhook-url"
                    type="url"
                    placeholder="https://your-app.com/webhook"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language (Optional)</Label>
                  <Input
                    id="language"
                    placeholder="en, es, fr, etc."
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  />
                </div>
              </div>

              {/* Upload Button */}
              <Button
                onClick={handleFileUpload}
                disabled={!file || !videoId.trim() || isTranscribing}
                className="w-full"
                size="lg"
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transcribing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Transcription
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="url" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                URL Transcription
              </CardTitle>
              <CardDescription>
                Provide a direct link to a video or audio file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* URL Input */}
              <div className="space-y-2">
                <Label htmlFor="url-input">File URL</Label>
                <Input
                  id="url-input"
                  type="url"
                  placeholder="https://example.com/video.mp4"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>

              {/* Additional Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="video-id-url">Video ID *</Label>
                  <Input
                    id="video-id-url"
                    placeholder="Enter video UUID"
                    value={videoId}
                    onChange={(e) => setVideoId(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Required: Video to associate transcription with</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook-url-url">Webhook URL (Optional)</Label>
                  <Input
                    id="webhook-url-url"
                    type="url"
                    placeholder="https://your-app.com/webhook"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language-url">Language (Optional)</Label>
                  <Input
                    id="language-url"
                    placeholder="en, es, fr, etc."
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  />
                </div>
              </div>

              {/* Transcribe Button */}
              <Button
                onClick={handleUrlTranscription}
                disabled={!url.trim() || !videoId.trim() || isTranscribing}
                className="w-full"
                size="lg"
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transcribing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Transcription
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Progress */}
      {isTranscribing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Processing...</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                This may take several minutes depending on file size
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.status === "completed" ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Transcription {result.status === "completed" ? "Complete" : "Failed"}
            </CardTitle>
            <CardDescription>
              Transcription ID: {result.transcription_id}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.error ? (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            ) : result.transcript ? (
              <div className="space-y-4">
                <div>
                  <Label>Transcript</Label>
                  <Textarea
                    value={result.transcript}
                    readOnly
                    className="min-h-[200px] mt-2"
                  />
                </div>

                {result.segments && result.segments.length > 0 && (
                  <div>
                    <Label>Segments ({result.segments.length})</Label>
                    <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                      {result.segments.map((segment: any, index: number) => (
                        <div key={index} className="p-3 bg-muted rounded-lg">
                          <div className="flex justify-between text-sm text-muted-foreground mb-1">
                            <span>{segment.start?.toFixed(2)}s - {segment.end?.toFixed(2)}s</span>
                          </div>
                          <p className="text-sm">{segment.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No transcript available</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
