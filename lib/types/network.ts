export interface NetworkInformation {
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g'
  downlink?: number
  rtt?: number
  saveData?: boolean
  addEventListener?: (type: string, listener: EventListener) => void
  removeEventListener?: (type: string, listener: EventListener) => void
}

export interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation
  mozConnection?: NetworkInformation
  webkitConnection?: NetworkInformation
}

export type ConnectionQuality = 'slow' | 'medium' | 'fast'

export interface ConnectionInfo {
  quality: ConnectionQuality
  effectiveType?: string
  downlink?: number
  saveData?: boolean
}
