"use client"

import { useState, useEffect, useRef } from "react"
import type { User } from "@/types/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Search,
  UserPlus,
  Trash2,
  Edit,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  X,
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import { createUserSchema, type CreateUserInput } from "@/lib/validations/user"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { z } from "zod"

interface UserManagementProps {
  initialUsers: User[]
}

export function UserManagement({ initialUsers }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false)
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false)
  const [userToEdit, setUserToEdit] = useState<User | null>(null)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const itemsPerPage = 20
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(
    Math.ceil(initialUsers.length / itemsPerPage) || 1
  )
  const lastFetchParamsRef = useRef<string>("")
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMounted = useRef(false)

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "USER",
    },
  })

  const editForm = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "USER",
    },
  })

  useEffect(() => {
    if (userToEdit) {
      editForm.reset({
        name: userToEdit.name,
        email: userToEdit.email,
        role: userToEdit.role as "ADMIN" | "USER",
      })
    }
  }, [userToEdit, editForm])

  const fetchUsers = async (
    page: number = currentPage,
    search: string = searchQuery
  ) => {
    try {
      if (isLoading) return

      const offset = (page - 1) * itemsPerPage
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

      console.log("Users data:", {
        users: data.users.length,
        total: data.total,
        pages: Math.ceil((data.total || 0) / itemsPerPage),
      })

      setUsers(data.users || [])
      setTotalPages(Math.ceil((data.total || 0) / itemsPerPage))
    } catch (error) {
      console.error("Error fetching users:", error)
      setUsers([])
      setTotalPages(1)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      // При первом рендере делаем запрос на сервер для получения актуальных данных
      fetchUsers(1, "")
      return
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery) {
      searchTimeoutRef.current = setTimeout(() => {
        setCurrentPage(1)
        fetchUsers(1, searchQuery)
      }, 300)
    } else {
      // Для пустого поиска тоже делаем запрос
      setCurrentPage(1)
      fetchUsers(1, "")
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery]) // Убрали initialUsers, чтобы не вызывать лишние запросы

  useEffect(() => {
    if (currentPage > 1 || searchQuery) {
      fetchUsers(currentPage, searchQuery)
    }
  }, [currentPage])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    setCurrentPage(newPage)
  }

  const showPagination = () => {
    return users.length > 0
  }

  const handleAddUser = async (data: z.infer<typeof createUserSchema>) => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const responseData = await response.json()

      if (!response.ok) {
        form.setError("email", {
          type: "manual",
          message: responseData.error || "Не удалось создать пользователя",
        })
        toast.error("Не удалось создать пользователя")
        return
      }

      setUsers((prev) => [...prev, responseData])
      form.reset()
      setIsAddUserDialogOpen(false)
      toast.success("Пользователь создан")
    } catch (error) {
      console.error("[USER_CREATE]", error)
      form.setError("email", {
        type: "manual",
        message: "Произошла ошибка при создании пользователя",
      })
      toast.error("Произошла ошибка при создании пользователя")
    }
  }

  const handleEditUser = async (data: CreateUserInput) => {
    if (!userToEdit) return

    try {
      const response = await fetch(`/api/admin/users/${userToEdit.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update user")
      }

      const updatedUser = (await response.json()) as User

      setUsers(
        users.map((user) => (user.id === updatedUser.id ? updatedUser : user))
      )

      setIsEditUserDialogOpen(false)
      setUserToEdit(null)

      toast.success("Пользователь обновлен")
    } catch (error: unknown) {
      console.error("Error updating user:", error)
      toast.error("Не удалось обновить пользователя")
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete?.id) {
      toast.error("Не выбран пользователь для удаления")
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

      toast.success("Пользователь успешно удален")
    } catch (error: unknown) {
      console.error("Error deleting user:", error)
      toast.error(
        "Не удалось удалить пользователя, попробуйте повторить позже"
      )
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

      setUsers(
        users.map((user) =>
          user.id === userId
            ? { ...user, role: role as "ADMIN" | "USER" }
            : user
        )
      )

      toast.success("Роль пользователя успешно обновлена")
    } catch (error: unknown) {
      console.error("Error updating user role:", error)
      toast.error("Не удалось обновить роль пользователя")
    }
  }

  const handleSearchReset = () => {
    setSearchQuery("")
    setCurrentPage(1)
    fetchUsers(1, "")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        Loading...
      </div>
    )
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
          {searchQuery && (
            <X
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer"
              onClick={handleSearchReset}
            />
          )}
        </div>
        <Button onClick={() => setIsAddUserDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Добавить
        </Button>
      </div>

      <div className="min-h-[300px]">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-medium">Имя</TableHead>
                <TableHead className="font-medium">Email</TableHead>
                <TableHead className="font-medium">Роль</TableHead>
                <TableHead className="font-medium">Дата создания</TableHead>
                <TableHead className="font-medium">Дата изменения</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center h-24 text-muted-foreground"
                  >
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
                        <Select
                          value={user.role}
                          onValueChange={(value) =>
                            handleRoleChange(user.id, value)
                          }
                        >
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
                      <TableCell>{formatDate(user.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setUserToEdit(user)
                              setIsEditUserDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setUserToDelete(user)
                              setIsDeleteUserDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </div>

        {showPagination() && (
          <div className="flex items-center justify-end mt-4">
            <div className="flex items-center gap-2">
              <div className="flex w-fit items-center justify-center text-sm font-medium mr-2">
                Page {currentPage} of {totalPages || 1}
              </div>
              <Button
                variant="outline"
                className="hidden size-8 p-0 lg:flex"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1 || isLoading}
              >
                <span className="sr-only">Перейти на первую страницу</span>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
              >
                <span className="sr-only">Перейти на предыдущую страницу</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
              >
                <span className="sr-only">Перейти на следующую страницу</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages || isLoading}
              >
                <span className="sr-only">Перейти на последнюю страницу</span>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add User Dialog */}
      <Dialog
        open={isAddUserDialogOpen}
        onOpenChange={(open) => {
          setIsAddUserDialogOpen(open)
          if (!open) {
            form.reset()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить нового пользователя</DialogTitle>
            <DialogDescription>
              Создайте нового пользователя. Пользователь сможет войти с этими
              учетными данными.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleAddUser)}
              className="space-y-4"
            >
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
                      <Input
                        type="email"
                        placeholder="Введите email"
                        {...field}
                        className={
                          form.formState.errors.email ? "border-red-500" : ""
                        }
                      />
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger
                          className={
                            form.formState.errors.role ? "border-red-500" : ""
                          }
                        >
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
                <Button
                  variant="outline"
                  onClick={() => setIsAddUserDialogOpen(false)}
                >
                  Отмена
                </Button>
                <Button type="submit">Добавить</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={isEditUserDialogOpen}
        onOpenChange={setIsEditUserDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать пользователя</DialogTitle>
            <DialogDescription>
              Редактируйте информацию о пользователе. Нажмите "Сохранить" когда
              закончите.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(handleEditUser)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Имя</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Роль</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
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
                <Button
                  variant="outline"
                  onClick={() => setIsEditUserDialogOpen(false)}
                  type="button"
                >
                  Отмена
                </Button>
                <Button type="submit">Сохранить</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog
        open={isDeleteUserDialogOpen}
        onOpenChange={setIsDeleteUserDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить пользователя</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить пользователя "
              {userToDelete?.name || userToDelete?.email}"? Это действие нельзя
              отменить..
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteUserDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
