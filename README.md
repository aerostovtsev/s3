# S3 File Manager

Веб-приложение для управления файлами в Amazon S3 с современным пользовательским интерфейсом и системой авторизации.

## Основные возможности

- 📁 Управление файлами (загрузка, скачивание, удаление)
- 👥 Система авторизации с поддержкой корпоративных email-доменов
- 🔐 Ролевой доступ (ADMIN/USER)
- 📱 Адаптивный интерфейс
- 🔍 Поиск и сортировка файлов
- 📊 История загрузок и скачиваний
- 🎨 Современный UI с использованием Tailwind CSS

## Технологии

- **Frontend:**
  - Next.js 15
  - React 19
  - Tailwind CSS
  - Shadcn/ui
  - NextAuth.js

- **Backend:**
  - Next.js API Routes
  - Prisma ORM
  - PostgreSQL
  - AWS SDK для S3

## Требования

- Node.js 18+
- PostgreSQL
- AWS S3 бакет или аналог
- Доступ к SMTP серверу для отправки email

## Переменные окружения

Создайте файл `.env` в корне проекта со следующими переменными:

```env
# База данных
DATABASE_URL="postgresql://user:password@localhost:5432/s3_file_manager"

# AWS
AWS_ACCESS_KEY_ID="your_access_key"
AWS_SECRET_ACCESS_KEY="your_secret_key"
AWS_REGION="your_region"
AWS_BUCKET_NAME="your_bucket_name"

# NextAuth
NEXTAUTH_SECRET="your_nextauth_secret"
NEXTAUTH_URL="http://localhost:3000"

# JWT
JWT_SECRET="your_jwt_secret"

# SMTP (для отправки email)
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="your_smtp_user"
SMTP_PASSWORD="your_smtp_password"
```

## Установка и запуск

1. Клонируйте репозиторий:
```bash
git clone https://github.com/your-username/s3-file-manager.git
cd s3-file-manager
```

2. Установите зависимости (выберите один из вариантов):

Через npm:
```bash
npm install
```

Через yarn:
```bash
yarn install
```

3. Примените миграции базы данных:
```bash
npx prisma migrate dev
```

4. Создайте первого пользователя с ролью ADMIN:
```bash
npx prisma db seed
```

Или вручную через Prisma Studio:
```bash
npx prisma studio
```
И создайте пользователя со следующими данными:
- email: admin@1cbit.ru
- role: ADMIN
- name: Admin

5. Запустите приложение в режиме разработки:

Через npm:
```bash
npm run dev
```

Через yarn:
```bash
yarn dev
```

Приложение будет доступно по адресу: http://localhost:3000

## Развертывание на Vercel

1. Создайте аккаунт на [Vercel](https://vercel.com) и установите Vercel CLI:
```bash
npm install -g vercel
```

2. Подключите ваш GitHub репозиторий к Vercel:
   - Перейдите на [Vercel Dashboard](https://vercel.com/dashboard)
   - Нажмите "New Project"
   - Выберите ваш репозиторий
   - Настройте переменные окружения в настройках проекта

3. Настройте переменные окружения в Vercel:
   - Перейдите в настройки проекта
   - Выберите вкладку "Environment Variables"
   - Добавьте все необходимые переменные из `.env` файла
   - Обновите `NEXTAUTH_URL` на URL вашего проекта на Vercel

4. Настройте базу данных:
   - Создайте базу данных PostgreSQL (можно использовать Vercel Postgres или другие провайдеры)
   - Добавьте URL базы данных в переменные окружения
   - Примените миграции:
   ```bash
   npx prisma migrate deploy
   ```

5. Создайте первого администратора:
   - Используйте Prisma Studio или напрямую через базу данных
   - Создайте пользователя с ролью ADMIN

6. Деплой:
   - Vercel автоматически деплоит приложение при каждом пуше в main ветку
   - Для ручного деплоя используйте:
   ```bash
   vercel
   ```

## Структура проекта

```
s3-file-manager/
├── app/                    # Next.js App Router
│   ├── api/               # API маршруты
│   ├── admin/            # Административная панель
│   ├── dashboard/        # Панель управления файлами
│   └── login/            # Страница авторизации
├── components/           # React компоненты
├── hooks/               # Пользовательские хуки
├── lib/                 # Утилиты и конфигурации
├── prisma/             # Схема базы данных
└── public/             # Статические файлы
```

## Авторизация

- Поддерживаются только корпоративные email-домены (@1cbit.ru, @abt.ru)
- Двухэтапная авторизация с подтверждением по email
- Срок действия кода подтверждения: 15 минут
- Срок действия сессии: 30 дней

## Разработка

### Команды

npm:
- `npm run dev` - запуск в режиме разработки
- `npm run build` - сборка проекта
- `npm run start` - запуск собранного проекта
- `npm run lint` - проверка кода линтером

yarn:
- `yarn dev` - запуск в режиме разработки
- `yarn build` - сборка проекта
- `yarn start` - запуск собранного проекта
- `yarn lint` - проверка кода линтером

### Стиль кода

Проект использует:
- ESLint для проверки кода
- Prettier для форматирования
- TypeScript для типизации

## Лицензия

MIT 