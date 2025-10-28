"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"


interface Collection {
  id: string
  name: string
  description: string | null
}

interface AddToCollectionDialogProps {
  videoId: string
  children: React.ReactNode
}

export function AddToCollectionDialog({ videoId, children }: AddToCollectionDialogProps) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollections, setSelectedCollections] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const supabase = null // Temporarily disabled - collections functionality needs backend API migration

  useEffect(() => {
    if (isOpen) {
      loadCollections()
    }
  }, [isOpen])

  const loadCollections = async () => {
    // TODO: Implement collections API when backend is ready
    setCollections([])
  }

  const handleSave = async () => {
    // TODO: Implement collections API when backend is ready
    console.log("Collections functionality temporarily disabled")
    setIsOpen(false)
  }

  const toggleCollection = (collectionId: string) => {
    setSelectedCollections((prev) =>
      prev.includes(collectionId) ? prev.filter((id) => id !== collectionId) : [...prev, collectionId],
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Add to Collections</DialogTitle>
          <DialogDescription className="text-slate-300">
            Choose which collections to add this video to.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-60 overflow-y-auto">
          {collections.length > 0 ? (
            <div className="space-y-3">
              {collections.map((collection) => (
                <div key={collection.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={collection.id}
                    checked={selectedCollections.includes(collection.id)}
                    onCheckedChange={() => toggleCollection(collection.id)}
                  />
                  <label htmlFor={collection.id} className="flex-1 text-white cursor-pointer">
                    <div className="font-medium">{collection.name}</div>
                    {collection.description && <div className="text-sm text-slate-400">{collection.description}</div>}
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">You don't have any collections yet.</p>
              <Button asChild variant="outline" className="border-slate-600 text-white bg-transparent">
                <a href="/collections">Create Your First Collection</a>
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
