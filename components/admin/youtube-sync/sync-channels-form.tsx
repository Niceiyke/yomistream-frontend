'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { useToast } from '@/components/ui/use-toast'
import { useStartSync } from '@/lib/hooks/use-youtube-sync'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface FormFieldProps<T> {
  field: {
    value: T
    onChange: (value: T) => void
    onBlur: () => void
    name: string
  }
}

export const syncFormSchema = z.object({
  channelIds: z.string().min(1, {
    message: 'At least one channel ID is required',
  }),
  minDuration: z.number().min(0).default(30),
  syncMode: z.enum(['new_only', 'full']).default('new_only'),
  maxVideos: z.number().min(1).optional(),
})

export function SyncChannelsForm() {
  const { toast } = useToast()
  const startSync = useStartSync()
  const form = useForm<z.infer<typeof syncFormSchema>>({
    resolver: zodResolver(syncFormSchema),
    defaultValues: {
      minDuration: 30,
      syncMode: 'new_only',
    },
  })

  async function onSubmit(data: z.infer<typeof syncFormSchema>) {
    const channelIds = data.channelIds
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    try {
      await startSync.mutateAsync({
        channelIds,
        minDuration: data.minDuration,
        maxVideos: data.maxVideos,
        syncMode: data.syncMode,
      })
      toast({
        title: 'Sync started',
        description: `Queued ${channelIds.length} channel(s)`,
      })
    } catch (err: any) {
      toast({
        title: 'Failed to start sync',
        description: err?.message || 'Please try again',
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="channelIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Channel IDs</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter YouTube channel IDs, one per line"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                YouTube channel IDs (e.g. UCbb3dRzoZVTarrzFIbOBegQ)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="minDuration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum Duration (minutes)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  Only sync videos longer than this duration
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxVideos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Videos (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                  />
                </FormControl>
                <FormDescription>
                  Limit number of videos per channel
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="syncMode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sync Mode</FormLabel>
              <FormControl>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" {...field}>
                  <option value="new_only">New Videos Only</option>
                  <option value="full">Full Sync</option>
                </select>
              </FormControl>
              <FormDescription>
                Full sync updates all videos, new_only skips existing
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={startSync.isPending}>
          {startSync.isPending ? 'Starting...' : 'Start Sync'}
        </Button>
      </form>
    </Form>
  )
}

