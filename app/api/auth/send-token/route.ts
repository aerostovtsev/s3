import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sign } from "jsonwebtoken";
import { sendEmail } from "@/lib/email";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Объявляем типы для глобального хранилища токенов
declare global {
  var verificationTokens: Map<string, string> | undefined;
}

// Функция для генерации 6-значного кода
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Функция проверки разрешенного домена
function isAllowedDomain(email: string): boolean {
  const allowedDomains = ["1cbit.ru", "abt.ru"];
  const domain = email.split("@")[1]?.toLowerCase();
  return allowedDomains.includes(domain);
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Проверяем домен
    if (!isAllowedDomain(email)) {
      return NextResponse.json(
        {
          error:
            "Access denied. Only company FirstBIT email domains are allowed.",
        },
        { status: 403 }
      );
    }

    // Ищем пользователя
    let user = await prisma.user.findUnique({
      where: { email },
    });

    // Если пользователя нет, создаем нового с ролью USER
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email as string,
          role: "USER",
          // Добавляем имя пользователя из email (часть до @)
          name: email.split("@")[0],
        },
      });
    }

    // Генерируем 6-значный код
    const verificationCode = generateVerificationCode();

    // Генерируем JWT с кодом верификации
    const token = sign(
      {
        userId: user.id,
        email: user.email,
        code: verificationCode,
      },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Сохраняем токен в памяти
    globalThis.verificationTokens =
      globalThis.verificationTokens || new Map<string, string>();
    globalThis.verificationTokens.set(email, token);

    // Отправляем код на email
    const emailSent = await sendEmail(
      email,
      "Ваш код верификации S3",
      `Ваш код верификации: ${verificationCode}\n\nЭтот код будет действителен в течение 15 минут.`
    );

    if (!emailSent) {
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    // Для тестирования выводим код в консоль
    console.log("Verification code:", verificationCode);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending verification code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
