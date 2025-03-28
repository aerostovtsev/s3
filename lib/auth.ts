import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"
import { verify } from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 дней
    updateAge: 24 * 60 * 60, // 24 часа
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Verification Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) {
          return null
        }

        try {
          // Получаем сохраненный токен
          const token = global.verificationTokens?.get(credentials.email)
          
          if (!token) {
            console.error("No token found for email:", credentials.email)
            return null
          }

          // Проверяем токен
          const decoded = verify(token, JWT_SECRET) as {
            userId: string
            email: string
            code: string
          }

          // Проверяем, что код совпадает
          if (decoded.code !== credentials.code) {
            console.error("Invalid verification code")
            return null
          }

          // Проверяем, что email совпадает
          if (decoded.email !== credentials.email) {
            console.error("Email mismatch")
            return null
          }

          // Удаляем использованный токен
          global.verificationTokens?.delete(credentials.email)

          const user = await prisma.user.findUnique({
            where: {
              id: decoded.userId,
            },
          })

          if (!user) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name || "",
            role: user.role,
          }
        } catch (error) {
          console.error("Token verification failed:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.name = token.name as string
        session.user.email = token.email as string
        session.user.role = token.role as string
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
  },
}

