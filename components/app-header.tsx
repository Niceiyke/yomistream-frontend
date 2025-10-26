"use client"

import { useState, useEffect } from "react"
import { BookOpen, LogIn, LogOut, FolderOpen, Heart, Menu, X, ExternalLink, User, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface AppHeaderProps {
  favorites?: string[]
  onSignOut?: () => void
  showActions?: boolean
  backButton?: {
    label: string
    href: string
    scroll?: boolean
  }
}

export function AppHeader({ 
  favorites = [], 
  onSignOut, 
  showActions = true,
  backButton 
}: AppHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, signOut: authSignOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Close mobile menu when clicking outside or on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) { // md breakpoint
        setMobileMenuOpen(false)
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (mobileMenuOpen && !target.closest('header')) {
        setMobileMenuOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    document.addEventListener('click', handleClickOutside)

    return () => {
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [mobileMenuOpen])

  const handleSignOut = async () => {
    setMobileMenuOpen(false)
    
    // Call the auth context's signOut method
    await authSignOut()
    
    // Call the optional onSignOut prop if provided
    if (onSignOut) {
      await onSignOut()
    }
    
    // Redirect to home page
    router.push("/")
  }

  const handleNavClick = () => {
    setMobileMenuOpen(false)
  }

  return (
    <header className="border-b border-border bg-background shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-1 md:py-2">
        <div className="flex items-center justify-between">
          {/* Left Section - Logo and Back Button */}
          <div className="flex items-center space-x-3">
            {backButton && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hover:bg-accent -ml-2"
              >
                <Link href={backButton.href} scroll={backButton.scroll !== false}>
                  {backButton.label}
                </Link>
              </Button>
            )}
            <Link href="/" className="flex items-center space-x-3 group" scroll={false}>
              <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                  WordLyte
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                  Divine Illumination
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          {showActions && (
            <nav className="hidden md:flex items-center space-x-3">
              {user && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-border hover:bg-secondary/10 hover:text-secondary hover:border-secondary/50 transition-all duration-300"
                >
                  <Link href="/source-videos">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Source Videos
                  </Link>
                </Button>
              )}
              {user ? (
                <>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-border hover:bg-secondary/10 hover:text-secondary hover:border-secondary/50 transition-all duration-300"
                  >
                    <Link href="/collections">
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Collections
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-border hover:bg-secondary/10 hover:text-secondary hover:border-secondary/50 transition-all duration-300"
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Favorites ({favorites.length})
                  </Button>

                  {/* User Profile Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-border hover:bg-accent transition-all duration-300 flex items-center gap-2 px-3"
                      >
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || user.email} />
                          <AvatarFallback className="text-xs">
                            {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="hidden lg:inline text-sm font-medium">
                          {user.full_name || user.email.split('@')[0]}
                        </span>
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {user.full_name || 'User'}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                          </p>
                          {user.auth_provider && user.auth_provider !== 'local' && (
                            <p className="text-xs leading-none text-muted-foreground capitalize">
                              Signed in with {user.auth_provider}
                            </p>
                          )}
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          <span>Profile Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/collections" className="cursor-pointer">
                          <FolderOpen className="mr-2 h-4 w-4" />
                          <span>My Collections</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleSignOut}
                        className="cursor-pointer text-destructive focus:text-destructive"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sign Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    className="border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all duration-300"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-border hover:bg-secondary/10 hover:text-secondary hover:border-secondary/50 transition-all duration-300"
                >
                  <Link href="/auth/login">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </Link>
                </Button>
              )}
            </nav>
          )}

          {/* Mobile Menu Button */}
          {showActions && (
            <div className="md:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setMobileMenuOpen(!mobileMenuOpen)
                }}
                className="border-border hover:bg-accent"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Menu Dropdown */}
        {showActions && mobileMenuOpen && (
          <nav 
            className="md:hidden mt-4 pt-4 border-t border-border animate-in slide-in-from-top-2 duration-200"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col space-y-2">
              {user && (
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-border hover:bg-secondary/10 hover:text-secondary hover:border-secondary/50 justify-start transition-all duration-300"
                  onClick={handleNavClick}
                >
                  <Link href="/source-videos">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Source Videos
                  </Link>
                </Button>
              )}
              {user ? (
                <>
                  {/* User Profile Section in Mobile */}
                  <div className="flex items-center space-x-3 p-3 bg-accent/50 rounded-lg mb-2">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || user.email} />
                      <AvatarFallback>
                        {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.full_name || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                      {user.auth_provider && user.auth_provider !== 'local' && (
                        <p className="text-xs text-muted-foreground capitalize">
                          via {user.auth_provider}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    asChild
                    variant="outline"
                    className="w-full border-border hover:bg-secondary/10 hover:text-secondary hover:border-secondary/50 justify-start transition-all duration-300"
                    onClick={handleNavClick}
                  >
                    <Link href="/collections">
                      <FolderOpen className="w-4 h-4 mr-2" />
                      My Collections
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-border hover:bg-secondary/10 hover:text-secondary hover:border-secondary/50 justify-start transition-all duration-300"
                    onClick={handleNavClick}
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Favorites ({favorites.length})
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full border-border hover:bg-accent justify-start transition-all duration-300"
                    onClick={handleNavClick}
                  >
                    <Link href="/profile">
                      <User className="w-4 h-4 mr-2" />
                      Profile Settings
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSignOut}
                    className="w-full border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 justify-start transition-all duration-300"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-border hover:bg-secondary/10 hover:text-secondary hover:border-secondary/50 justify-start transition-all duration-300"
                  onClick={handleNavClick}
                >
                  <Link href="/auth/login">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </Link>
                </Button>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
