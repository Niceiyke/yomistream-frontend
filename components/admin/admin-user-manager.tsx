import React, { useState } from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { apiGet, apiPut, apiDelete, apiPost } from "@/lib/api"
import { getAccessTokenCached } from "@/lib/auth-cache"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Search, Filter, Edit, Trash2, User, Crown, Shield, Eye, Users, Mail, Calendar, Activity, Ban, CheckCircle, XCircle, MoreHorizontal, Plus, Download, Upload, RefreshCw, UserPlus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"

interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  user_type: 'viewer' | 'creator' | 'admin' | 'moderator'
  is_active: boolean
  is_verified: boolean
  is_premium: boolean
  created_at: string
  updated_at: string
  last_login_at: string | null
  profile?: {
    bio?: string
    location_country?: string
    location_city?: string
    denomination?: string
    church_affiliation?: string
    total_watch_time?: number
    total_videos_watched?: number
  }
}

export function AdminUserManager() {
  const [searchTerm, setSearchTerm] = useState("")
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false)
  const [deleteUserId, setDeleteUserId] = useState<string>("")
  const [currentTab, setCurrentTab] = useState("list")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [isBulkActionDialogOpen, setIsBulkActionDialogOpen] = useState(false)

  const queryClient = useQueryClient()
  const { toast } = useToast()

  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await getAccessTokenCached()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Fetch users with new unified API
  const { data: usersData, isLoading: usersLoading, error: usersError, refetch } = useQuery({
    queryKey: ["admin", "users", searchTerm, userTypeFilter, statusFilter],
    queryFn: async () => {
      const headers = await authHeaders()
      const params = new URLSearchParams({
        page: '1',
        page_size: '100', // Load more users for better management
        ...(searchTerm && { search: searchTerm }),
        ...(userTypeFilter !== 'all' && { user_type: userTypeFilter }),
        ...(statusFilter === 'active' && { is_active: 'true' }),
        ...(statusFilter === 'inactive' && { is_active: 'false' }),
        ...(statusFilter === 'verified' && { is_verified: 'true' }),
        ...(statusFilter === 'unverified' && { is_verified: 'false' }),
        ...(statusFilter === 'premium' && { is_premium: 'true' }),
        ...(statusFilter === 'free' && { is_premium: 'false' }),
      })
      return apiGet(`/api/admin/users?${params}`, { headers })
    },
  })

  const users = (usersData?.users || usersData || []) as User[]

  // Debug logging
  React.useEffect(() => {
    if (usersData) {
      console.log('Users data received:', usersData)
      console.log('Users array:', users)
      console.log('Users length:', users.length)
    }
    if (usersError) {
      console.error('Users error:', usersError)
    }
  }, [usersData, users, usersError])

  // Users are now pre-filtered by API, but we keep a simple local filter for additional client-side filtering if needed
  const filteredUsers = users

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: any }) => {
      const headers = await authHeaders()
      return apiPut(`/api/admin/users/${userId}`, data, { headers })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      toast({
        title: "Success",
        description: "User updated successfully.",
      })
      setIsUserDialogOpen(false)
      setSelectedUser(null)
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user.",
      })
    },
  })

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const headers = await authHeaders()
      return apiDelete(`/api/admin/users/${userId}`, { headers })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      toast({
        title: "Success",
        description: "User deleted successfully.",
      })
      setIsDeleteDialogOpen(false)
      setDeleteUserId("")
      setSelectedUsers(selectedUsers.filter(id => id !== deleteUserId))
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete user.",
      })
    },
  })

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const headers = await authHeaders()
      return apiPost("/api/admin/users", userData, { headers })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      toast({
        title: "Success",
        description: "User created successfully.",
      })
      setIsCreateUserDialogOpen(false)
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create user.",
      })
    },
  })

  // Sync users from Supabase mutation
  const syncUsersMutation = useMutation({
    mutationFn: async () => {
      const headers = await authHeaders()
      return apiPost("/api/admin/users/sync", {}, { headers })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      toast({
        title: "Success",
        description: "User sync started. Data will be updated shortly.",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start user sync.",
      })
    },
  })

  // Bulk update users mutation
  const bulkUpdateUsersMutation = useMutation({
    mutationFn: async ({ userIds, updates }: { userIds: string[], updates: any }) => {
      const headers = await authHeaders()
      const promises = userIds.map(userId =>
        apiPut(`/api/admin/users/${userId}`, updates, { headers })
      )
      return Promise.all(promises)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      toast({
        title: "Success",
        description: `${selectedUsers.length} users updated successfully.`,
      })
      setSelectedUsers([])
      setIsBulkActionDialogOpen(false)
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update selected users.",
      })
    },
  })

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setIsUserDialogOpen(true)
  }

  const handleDeleteUser = (userId: string) => {
    setDeleteUserId(userId)
    setIsDeleteDialogOpen(true)
  }

  const handleUpdateUser = (userData: any) => {
    if (selectedUser) {
      updateUserMutation.mutate({ userId: selectedUser.id, data: userData })
    }
  }

  const confirmDelete = () => {
    deleteUserMutation.mutate(deleteUserId)
  }

  const handleCreateUser = (userData: any) => {
    createUserMutation.mutate(userData)
  }

  const handleSyncUsers = () => {
    syncUsersMutation.mutate()
  }

  const handleBulkAction = (action: string, value?: any) => {
    if (selectedUsers.length === 0) return

    const updates: any = {}
    switch (action) {
      case 'activate':
        updates.is_active = true
        break
      case 'deactivate':
        updates.is_active = false
        break
      case 'verify':
        updates.is_verified = true
        break
      case 'unverify':
        updates.is_verified = false
        break
      case 'make_premium':
        updates.is_premium = true
        break
      case 'remove_premium':
        updates.is_premium = false
        break
      case 'change_type':
        updates.user_type = value
        break
      default:
        return
    }

    bulkUpdateUsersMutation.mutate({ userIds: selectedUsers, updates })
  }

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId])
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map(user => user.id))
    } else {
      setSelectedUsers([])
    }
  }

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'admin':
        return <Crown className="h-4 w-4 text-red-500" />
      case 'moderator':
        return <Shield className="h-4 w-4 text-blue-500" />
      case 'creator':
        return <User className="h-4 w-4 text-green-500" />
      default:
        return <Eye className="h-4 w-4 text-gray-500" />
    }
  }

  const getUserTypeBadge = (userType: string) => {
    const variants = {
      admin: "destructive",
      moderator: "default",
      creator: "secondary",
      viewer: "outline"
    } as const

    return (
      <Badge variant={variants[userType as keyof typeof variants] || "outline"}>
        {userType.charAt(0).toUpperCase() + userType.slice(1)}
      </Badge>
    )
  }

  const getUserStats = () => {
    const total = users.length
    const active = users.filter((u: User) => u.is_active).length
    const verified = users.filter((u: User) => u.is_verified).length
    const premium = users.filter((u: User) => u.is_premium).length
    const admins = users.filter((u: User) => u.user_type === 'admin').length
    const creators = users.filter((u: User) => u.user_type === 'creator').length

    return { total, active, verified, premium, admins, creators }
  }

  const stats = getUserStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and platform access permissions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleSyncUsers}
            disabled={syncUsersMutation.isPending}
          >
            {syncUsersMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Users
          </Button>
          <Button
            variant="outline"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsCreateUserDialogOpen(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Create User
          </Button>
          {selectedUsers.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setIsBulkActionDialogOpen(true)}
            >
              <Users className="h-4 w-4 mr-2" />
              Bulk Actions ({selectedUsers.length})
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.verified}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Premium</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.premium}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.admins}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Creators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.creators}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="User Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="creator">Creator</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="free">Free</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* User List */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users ({filteredUsers.length})
          </CardTitle>
          <CardDescription>
            Manage user accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading users...
            </div>
          ) : (
            <div className="overflow-x-auto">
              {users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users found. {usersData ? 'API returned data but no users.' : 'No data received from API.'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className="border-border">
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback>
                                {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.full_name || "No name"}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getUserTypeIcon(user.user_type)}
                            {getUserTypeBadge(user.user_type)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {user.is_active ? (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-600 border-red-600">
                                <XCircle className="h-3 w-3 mr-1" />
                                Inactive
                              </Badge>
                            )}
                            {user.is_verified && (
                              <Badge variant="outline" className="text-blue-600 border-blue-600">
                                <Shield className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                            {user.is_premium && (
                              <Badge variant="outline" className="text-purple-600 border-purple-600">
                                <Crown className="h-3 w-3 mr-1" />
                                Premium
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : "Never"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <UserDialog
        user={selectedUser}
        isOpen={isUserDialogOpen}
        onClose={() => {
          setIsUserDialogOpen(false)
          setSelectedUser(null)
        }}
        onSave={handleUpdateUser}
        isPending={updateUserMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone and will permanently remove their account and all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <CreateUserDialog
        isOpen={isCreateUserDialogOpen}
        onClose={() => setIsCreateUserDialogOpen(false)}
        onSave={handleCreateUser}
        isPending={createUserMutation.isPending}
      />

      {/* Bulk Actions Dialog */}
      <BulkActionsDialog
        isOpen={isBulkActionDialogOpen}
        onClose={() => setIsBulkActionDialogOpen(false)}
        onAction={handleBulkAction}
        selectedCount={selectedUsers.length}
        isPending={bulkUpdateUsersMutation.isPending}
      />
    </div>
  )
}

// User Edit Dialog Component
function UserDialog({
  user,
  isOpen,
  onClose,
  onSave,
  isPending
}: {
  user: User | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  isPending: boolean
}) {
  const [formData, setFormData] = useState({
    full_name: "",
    user_type: "viewer" as User['user_type'],
    is_active: true,
    is_verified: false,
    is_premium: false,
  })

  // Update form when user changes
  React.useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        user_type: user.user_type,
        is_active: user.is_active,
        is_verified: user.is_verified,
        is_premium: user.is_premium,
      })
    } else {
      setFormData({
        full_name: "",
        user_type: "viewer",
        is_active: true,
        is_verified: false,
        is_premium: false,
      })
    }
  }, [user])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information and permissions
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user.email} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user_type">User Type</Label>
            <Select
              value={formData.user_type}
              onValueChange={(value: User['user_type']) => setFormData({ ...formData, user_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="creator">Creator</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
              />
              <Label htmlFor="is_active" className="text-sm">Active Account</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_verified"
                checked={formData.is_verified}
                onCheckedChange={(checked) => setFormData({ ...formData, is_verified: checked as boolean })}
              />
              <Label htmlFor="is_verified" className="text-sm">Verified Account</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_premium"
                checked={formData.is_premium}
                onCheckedChange={(checked) => setFormData({ ...formData, is_premium: checked as boolean })}
              />
              <Label htmlFor="is_premium" className="text-sm">Premium Account</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Create User Dialog Component
function CreateUserDialog({
  isOpen,
  onClose,
  onSave,
  isPending
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  isPending: boolean
}) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    user_type: "viewer" as User['user_type'],
    is_premium: false,
    skip_email_confirmation: false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    if (!isPending) {
      setFormData({
        email: "",
        password: "",
        full_name: "",
        user_type: "viewer",
        is_premium: false,
        skip_email_confirmation: false,
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Create a new user account with Supabase Auth integration
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user_type">User Type</Label>
            <Select
              value={formData.user_type}
              onValueChange={(value: User['user_type']) => setFormData({ ...formData, user_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="creator">Creator</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_premium"
                checked={formData.is_premium}
                onCheckedChange={(checked) => setFormData({ ...formData, is_premium: checked as boolean })}
              />
              <Label htmlFor="is_premium" className="text-sm">Premium Account</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="skip_email_confirmation"
                checked={formData.skip_email_confirmation}
                onCheckedChange={(checked) => setFormData({ ...formData, skip_email_confirmation: checked as boolean })}
              />
              <Label htmlFor="skip_email_confirmation" className="text-sm">Skip Email Confirmation</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Bulk Actions Dialog Component
function BulkActionsDialog({
  isOpen,
  onClose,
  onAction,
  selectedCount,
  isPending
}: {
  isOpen: boolean
  onClose: () => void
  onAction: (action: string, value?: any) => void
  selectedCount: number
  isPending: boolean
}) {
  const [selectedAction, setSelectedAction] = useState("")
  const [selectedUserType, setSelectedUserType] = useState<User['user_type']>("viewer")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedAction === 'change_type') {
      onAction(selectedAction, selectedUserType)
    } else {
      onAction(selectedAction)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Actions</DialogTitle>
          <DialogDescription>
            Apply actions to {selectedCount} selected user{selectedCount !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="activate"
                name="action"
                value="activate"
                checked={selectedAction === 'activate'}
                onChange={(e) => setSelectedAction(e.target.value)}
              />
              <Label htmlFor="activate" className="text-sm">Activate selected users</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="deactivate"
                name="action"
                value="deactivate"
                checked={selectedAction === 'deactivate'}
                onChange={(e) => setSelectedAction(e.target.value)}
              />
              <Label htmlFor="deactivate" className="text-sm">Deactivate selected users</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="verify"
                name="action"
                value="verify"
                checked={selectedAction === 'verify'}
                onChange={(e) => setSelectedAction(e.target.value)}
              />
              <Label htmlFor="verify" className="text-sm">Mark as verified</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="unverify"
                name="action"
                value="unverify"
                checked={selectedAction === 'unverify'}
                onChange={(e) => setSelectedAction(e.target.value)}
              />
              <Label htmlFor="unverify" className="text-sm">Mark as unverified</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="make_premium"
                name="action"
                value="make_premium"
                checked={selectedAction === 'make_premium'}
                onChange={(e) => setSelectedAction(e.target.value)}
              />
              <Label htmlFor="make_premium" className="text-sm">Make premium</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="remove_premium"
                name="action"
                value="remove_premium"
                checked={selectedAction === 'remove_premium'}
                onChange={(e) => setSelectedAction(e.target.value)}
              />
              <Label htmlFor="remove_premium" className="text-sm">Remove premium</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="change_type"
                name="action"
                value="change_type"
                checked={selectedAction === 'change_type'}
                onChange={(e) => setSelectedAction(e.target.value)}
              />
              <Label htmlFor="change_type" className="text-sm">Change user type to:</Label>
            </div>

            {selectedAction === 'change_type' && (
              <div className="ml-6">
                <Select
                  value={selectedUserType}
                  onValueChange={(value: User['user_type']) => setSelectedUserType(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="creator">Creator</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !selectedAction}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Apply Action
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
