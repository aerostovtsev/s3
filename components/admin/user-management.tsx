"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import type { User } from "@/types/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Search, UserPlus, Trash2 } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { createUserSchema, type CreateUserInput } from "@/lib/validations/user"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

interface UserManagementProps {
  initialUsers: User[]
}

export function UserManagement({ initialUsers }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const itemsPerPage = 24
  const [hasMore, setHasMore] = useState(initialUsers.length === itemsPerPage)
  const { toast } = useToast()
  const lastFetchParamsRef = useRef<string>("")
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "USER",
    },
  })

  const fetchUsers = async (offset: number = 0, search: string = searchQuery) => {
    try {
      if (isLoading) return;

      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: itemsPerPage.toString(),
        search,
      })

      const paramsString = params.toString()
      if (paramsString === lastFetchParamsRef.current) {
        return
      }

      setIsLoading(true)
      lastFetchParamsRef.current = paramsString

      const response = await fetch(`/api/admin/users?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch users")
      }
      
      if (offset === 0) {
        setUsers(data.users || [])
      } else {
        setUsers(prev => [...prev, ...(data.users || [])])
      }
      
      setHasMore((data.users || []).length === itemsPerPage)
    } catch (error) {
      console.error("Error fetching users:", error)
      if (offset === 0) {
        setUsers([])
      }
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0]
    if (target.isIntersecting && hasMore && !isLoading && users.length > 0) {
      fetchUsers(users.length)
    }
  }, [hasMore, isLoading, users.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const option = {
      root: null,
      rootMargin: "200px",
      threshold: 0
    }

    const observer = new IntersectionObserver(handleObserver, option)
    const currentElement = loadMoreRef.current

    if (currentElement) observer.observe(currentElement)

    return () => {
      if (currentElement) observer.unobserve(currentElement)
    }
  }, [handleObserver])

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchUsers(0, searchQuery)
      }, 300)
    } else {
      setUsers(initialUsers)
      setHasMore(initialUsers.length === itemsPerPage)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, initialUsers])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
  }

  const handleAddUser = async (data: CreateUserInput) => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create user")
      }

      const createdUser = await response.json()

      setUsers([createdUser, ...users])
      form.reset()
      setIsAddUserDialogOpen(false)

      toast({
        title: "Пользователь создан",
        description: "Пользователь успешно создан",
      })
    } catch (error: unknown) {
      console.error("Error creating user:", error)
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось создать пользователя",
      })
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid user selected for deletion",
      })
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete user")
      }

      setUsers(users.filter((user) => user.id !== userToDelete.id))
      setUserToDelete(null)
      setIsDeleteUserDialogOpen(false)

      toast({
        title: "User deleted",
        description: "The user has been successfully deleted",
      })
    } catch (error: unknown) {
      console.error("Error deleting user:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
      })
    }
  }

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update user role")
      }

      setUsers(users.map((user) => (user.id === userId ? { ...user, role } : user)))

      toast({
        title: "Role updated",
        description: "The user's role has been successfully updated",
      })
    } catch (error: unknown) {
      console.error("Error updating user role:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user role",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Найти пользователей..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsAddUserDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="min-h-[300px]">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Имя</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Дата создания</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name || "N/A"}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Select value={user.role} onValueChange={(value) => handleRoleChange(user.id, value)}>
                          <SelectTrigger className="w-24">
                            <SelectValue placeholder="Role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USER">User</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setUserToDelete(user)
                            setIsDeleteUserDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </div>
        <div ref={loadMoreRef} className="h-4" />
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить нового пользователя</DialogTitle>
            <DialogDescription>
              Создайте нового пользователя. Пользователь сможет войти с этими учетными данными.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddUser)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Имя</FormLabel>
                    <FormControl>
                      <Input placeholder="Введите имя" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Введите email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Роль</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите роль" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USER">User</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit">Добавить пользователя</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить пользователя</DialogTitle>
            <DialogDescription>
            Вы уверены, что хотите удалить пользователя "{userToDelete?.name || userToDelete?.email}"? Это действие нельзя отменить..
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

