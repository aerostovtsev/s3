import * as z from "zod"

export const createUserSchema = z.object({
  name: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  email: z.string().email("Некорректный email адрес"),
  role: z.enum(["USER", "ADMIN"], {
    required_error: "Роль пользователя обязательна",
  }),
})

export type CreateUserInput = z.infer<typeof createUserSchema> 