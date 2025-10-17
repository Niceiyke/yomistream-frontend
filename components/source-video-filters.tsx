"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Filter, Calendar, Clock, Tag as TagIcon, Globe, SortAsc, X, ChevronDown, ChevronUp, Grid, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"

interface SourceVideoFiltersProps {
  // Search
  searchQuery: string
  onSearchChange: (value: string) => void

  // Language
  selectedLanguage: string
  onLanguageChange: (value: string) => void

  // Date Range
  dateRange: {
    from: Date | undefined
    to: Date | undefined
  }
  onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void

  // Duration
  selectedDuration: string
  onDurationChange: (value: string) => void

  // Tags
  availableTags: string[]
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void

  // Channels
  availableChannels: { id: string; name: string }[]
  selectedChannel: string
  onChannelChange: (value: string) => void

  // Sort
  sortBy: string
  onSortChange: (value: string) => void

  // View Mode
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void

  // Exclude Trimmed
  excludeTrimmed: boolean
  onExcludeTrimmedChange: (value: boolean) => void

  // Loading
  isLoading: boolean

  // Actions
  onClearAll: () => void
}

export function SourceVideoFilters({
  searchQuery,
  onSearchChange,
  selectedLanguage,
  onLanguageChange,
  dateRange,
  onDateRangeChange,
  selectedDuration,
  onDurationChange,
  availableTags,
  selectedTags,
  onTagsChange,
  availableChannels,
  selectedChannel,
  onChannelChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  excludeTrimmed,
  onExcludeTrimmedChange,
  isLoading,
  onClearAll
}: SourceVideoFiltersProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)

  // Count active filters
  const activeFiltersCount = [
    searchQuery,
    selectedLanguage !== "all",
    dateRange.from || dateRange.to,
    selectedDuration !== "all",
    selectedTags.length > 0,
    selectedChannel !== "all",
    excludeTrimmed
  ].filter(Boolean).length

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag))
    } else {
      onTagsChange([...selectedTags, tag])
    }
  }

  const handleClearFilter = (filterType: string) => {
    switch (filterType) {
      case 'search':
        onSearchChange('')
        break
      case 'language':
        onLanguageChange('all')
        break
      case 'date':
        onDateRangeChange({ from: undefined, to: undefined })
        break
      case 'duration':
        onDurationChange('all')
        break
      case 'tags':
        onTagsChange([])
        break
      case 'channel':
        onChannelChange('all')
        break
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search videos, channels, or topics..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className={`pl-10 transition-all duration-200 ${
              searchFocused ? 'ring-2 ring-primary/20 border-primary' : ''
            }`}
          />
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2">
          {/* View Toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('grid')}
              className="rounded-r-none border-r"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-40">
              <SortAsc className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="duration_asc">Shortest First</SelectItem>
              <SelectItem value="duration_desc">Longest First</SelectItem>
              <SelectItem value="title">Title A-Z</SelectItem>
            </SelectContent>
          </Select>

          {/* Advanced Filters Toggle */}
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="relative">
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 h-5 w-5 rounded-full p-0 text-xs bg-primary text-primary-foreground"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
                {isFiltersOpen ? (
                  <ChevronUp className="w-4 h-4 ml-2" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-2" />
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      </div>

      {/* Active Filters Display */}
      {(searchQuery || selectedLanguage !== "all" || dateRange.from || dateRange.to ||
        selectedDuration !== "all" || selectedTags.length > 0 || selectedChannel !== "all" || excludeTrimmed) && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Active filters:</span>

          {searchQuery && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Search className="w-3 h-3" />
              "{searchQuery}"
              <button
                onClick={() => handleClearFilter('search')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full w-4 h-4 flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {selectedLanguage !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {selectedLanguage.toUpperCase()}
              <button
                onClick={() => handleClearFilter('language')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full w-4 h-4 flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {(dateRange.from || dateRange.to) && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {dateRange.from && dateRange.to
                ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`
                : dateRange.from
                ? `From ${format(dateRange.from, 'MMM d')}`
                : `Until ${format(dateRange.to!, 'MMM d')}`
              }
              <button
                onClick={() => handleClearFilter('date')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full w-4 h-4 flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {selectedDuration !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {selectedDuration === "short" && "< 5 min"}
              {selectedDuration === "medium" && "5-20 min"}
              {selectedDuration === "long" && "20-60 min"}
              {selectedDuration === "very_long" && "> 60 min"}
              <button
                onClick={() => handleClearFilter('duration')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full w-4 h-4 flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              <TagIcon className="w-3 h-3" />
              {tag}
              <button
                onClick={() => handleTagToggle(tag)}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full w-4 h-4 flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}

          {selectedChannel !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Channel: {availableChannels.find(c => c.id === selectedChannel)?.name || selectedChannel}
              <button
                onClick={() => handleClearFilter('channel')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full w-4 h-4 flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {excludeTrimmed && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Exclude Processed
              <button
                onClick={() => onExcludeTrimmedChange(false)}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full w-4 h-4 flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Advanced Filters Panel */}
      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <CollapsibleContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border">
            {/* Language Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Language
              </Label>
              <Select value={selectedLanguage} onValueChange={onLanguageChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Languages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="ru">Russian</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="ko">Korean</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date Range
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      "Pick a date range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range: DateRange | undefined) => onDateRangeChange(range ? { from: range.from, to: range.to } : { from: undefined, to: undefined })}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Duration Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Duration
              </Label>
              <Select value={selectedDuration} onValueChange={onDurationChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Any Duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Duration</SelectItem>
                  <SelectItem value="short">Short (&lt; 5 min)</SelectItem>
                  <SelectItem value="medium">Medium (5-20 min)</SelectItem>
                  <SelectItem value="long">Long (20-60 min)</SelectItem>
                  <SelectItem value="very_long">Very Long (&gt; 60 min)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Channel Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Channel</Label>
              <Select value={selectedChannel} onValueChange={onChannelChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  {availableChannels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Exclude Trimmed Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Content Status</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="exclude-trimmed"
                  checked={excludeTrimmed}
                  onCheckedChange={(checked) => onExcludeTrimmedChange(checked as boolean)}
                />
                <Label
                  htmlFor="exclude-trimmed"
                  className="text-sm font-normal cursor-pointer"
                >
                  Exclude processed videos
                </Label>
              </div>
            </div>

            {/* Tags Filter */}
            {availableTags.length > 0 && (
              <div className="space-y-2 md:col-span-2 lg:col-span-4">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <TagIcon className="w-4 h-4" />
                  Tags
                </Label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {availableTags.map((tag) => (
                    <div key={tag} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tag-${tag}`}
                        checked={selectedTags.includes(tag)}
                        onCheckedChange={() => handleTagToggle(tag)}
                      />
                      <Label
                        htmlFor={`tag-${tag}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {tag}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
