"use client"

import { useState, useRef, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { getAccessTokenCached } from "@/lib/auth-cache"
import { API_BASE_URL } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Upload,
  X,
  Image as ImageIcon,
  FileImage,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadedFile {
  file: File
  preview: string
  id: string
  status: "uploading" | "completed" | "error"
  progress: number
  error?: string
}

interface UploadInterfaceProps {
  onUploadComplete?: (files: UploadedFile[]) => void
}

export function UploadInterface({ onUploadComplete }: UploadInterfaceProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9),
      status: "uploading",
      progress: 0,
    }))

    setUploadedFiles(prev => [...prev, ...newFiles])

    // Start actual upload for each file
    newFiles.forEach(uploadedFile => {
      simulateUpload(uploadedFile.id, uploadedFile.file)
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.svg']
    },
    multiple: true,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  })

  const simulateUpload = async (fileId: string, file: File) => {
    try {
      const token = await getAccessTokenCached()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', 'thumbnails') // Default category
      formData.append('tags', 'uploaded')
      formData.append('description', '')

      const response = await fetch(`${API_BASE_URL}/api/admin/images/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()

      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === fileId
            ? { ...f, status: "completed", progress: 100 }
            : f
        )
      )

      // Call completion callback if provided
      onUploadComplete?.([result.data])
    } catch (error) {
      console.error('Upload error:', error)
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === fileId
            ? { ...f, status: "error", progress: 0, error: "Upload failed" }
            : f
        )
      )
    }
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.id === fileId)
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter(f => f.id !== fileId)
    })
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Upload Images</h2>
          <p className="text-muted-foreground mt-1">
            Upload thumbnails, banners, and images for your Christian content
          </p>
        </div>
      </div>

      {/* Upload Area */}
      <Card className="bg-card border-border shadow-sm">
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer",
              isDragActive || isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-accent/30"
            )}
          >
            <input {...getInputProps()} ref={fileInputRef} />
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {isDragActive ? "Drop images here" : "Drag & drop images here"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  or click to browse files from your computer
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                  <span>Supported formats: JPG, PNG, GIF, WebP, SVG</span>
                  <span>•</span>
                  <span>Maximum file size: 10MB</span>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  handleFileSelect()
                }}
                className="mt-4"
              >
                <FileImage className="h-4 w-4 mr-2" />
                Browse Files
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadedFiles.length > 0 && (
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">Upload Progress</CardTitle>
            <CardDescription className="text-muted-foreground">
              {uploadedFiles.filter(f => f.status === "completed").length} of {uploadedFiles.length} files uploaded
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadedFiles.map((uploadedFile) => (
              <div key={uploadedFile.id} className="flex items-center gap-4 p-4 border border-border rounded-lg">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-accent flex-shrink-0">
                  <img
                    src={uploadedFile.preview}
                    alt={uploadedFile.file.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-foreground truncate">
                      {uploadedFile.file.name}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {formatFileSize(uploadedFile.file.size)}
                    </Badge>
                  </div>

                  {uploadedFile.status === "uploading" && (
                    <div className="space-y-2">
                      <Progress value={uploadedFile.progress} className="h-2" />
                      <p className="text-sm text-muted-foreground">
                        Uploading... {uploadedFile.progress}%
                      </p>
                    </div>
                  )}

                  {uploadedFile.status === "completed" && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <p className="text-sm text-green-600">Upload completed</p>
                    </div>
                  )}

                  {uploadedFile.status === "error" && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <p className="text-sm text-red-600">
                        {uploadedFile.error || "Upload failed"}
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(uploadedFile.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upload Settings */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Upload Settings</CardTitle>
          <CardDescription className="text-muted-foreground">
            Configure your image upload preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                className="w-full p-2 bg-input border border-border rounded-md"
                defaultValue="thumbnails"
              >
                <option value="thumbnails">Thumbnails</option>
                <option value="banners">Banners</option>
                <option value="profile">Profile Images</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (optional)</Label>
              <Input
                id="tags"
                placeholder="christian, sermon, worship"
                className="bg-input border-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Add a description for your images..."
              className="bg-input border-border"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              Images will be optimized and stored securely
            </div>
            <div className="flex gap-3">
              <Button variant="outline">Save as Draft</Button>
              <Button
                disabled={uploadedFiles.length === 0 || uploadedFiles.some(f => f.status !== "completed")}
                className="bg-primary hover:bg-primary/90"
              >
                {uploadedFiles.some(f => f.status === "uploading") ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Publish Images
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
