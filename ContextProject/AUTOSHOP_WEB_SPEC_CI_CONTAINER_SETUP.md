# `autoshop-web-spec` — CI and Container Setup Guide

## Goal

Подготовить репозиторий `autoshop-web-spec` к production-style доставке через Docker image и GitHub Actions reusable workflow из репозитория организации `autoshop-crm/.github`.

После выполнения всех шагов этот репозиторий должен:

- собираться в production Docker image;
- публиковать image в GHCR;
- не требовать сборки на сервере;
- использовать centralized reusable workflow из `autoshop-crm/.github`.

Итоговый image должен публиковаться как:

- `ghcr.io/autoshop-crm/autoshop-web-spec`

---

## What This Repo Should Do After Setup

После настройки pipeline поведение должно быть таким:

1. Разработчик пушит изменения в `main` или `staging`.
2. GitHub Actions запускает caller workflow внутри `autoshop-web-spec`.
3. Caller workflow вызывает reusable workflow из `autoshop-crm/.github`.
4. Reusable workflow:
   - checkout-ит код;
   - логинится в GHCR;
   - собирает Docker image;
   - пушит его в GHCR.
5. `autoshop-infrastructure` может потом использовать image в `staging/prod` через:
   - `WEB_SPEC_IMAGE=ghcr.io/autoshop-crm/autoshop-web-spec`

---

## Files To Add

В репозиторий `autoshop-web-spec` нужно добавить следующие файлы:

```text
.github/workflows/deploy.yml
Dockerfile
.dockerignore
nginx.conf
```

Если текущая структура проекта нестандартная, пути можно скорректировать, но логика должна остаться именно такой.

---

## 1. Add Caller Workflow

### File

```text
.github/workflows/deploy.yml
```

### Purpose

Этот файл не должен содержать всю логику сборки. Его задача — **вызвать центральный reusable workflow**.

### Recommended Content

```yaml
name: Build and Push

on:
  push:
    branches:
      - main
      - staging
  workflow_dispatch:

jobs:
  call-shared-workflow:
    uses: autoshop-crm/.github/.github/workflows/shared-build.yml@main
    with:
      image_name: autoshop-crm/autoshop-web-spec
      dockerfile: Dockerfile
      context: .
      push_latest: true
```

### Notes

- `workflow_dispatch` полезен для ручного запуска из GitHub UI;
- `main` и `staging` достаточно для первой версии;
- если позже добавится release strategy, можно будет расширить trigger-ы.

---

## 2. Add Production Dockerfile

### File

```text
Dockerfile
```

### Goal

Собрать production-ready SPA image в два этапа:

- builder stage на `node`;
- runtime stage на `nginx`.

### Recommended Content

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
```

### Why This Is Correct

Этот подход:

- не тащит Node.js runtime в production image;
- делает image маленьким и быстрым;
- отделяет build phase от runtime phase;
- хорошо подходит для Vite/React SPA.

---

## 3. Add SPA Nginx Config

### File

```text
nginx.conf
```

### Goal

Контейнер должен корректно:

- раздавать собранную статику;
- поддерживать SPA routing;
- отдавать `index.html` для неизвестных путей;
- при желании включить кеширование статики.

### Recommended Content

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
}
```

### Why `try_files` Is Mandatory

Без `try_files $uri $uri/ /index.html;` React/Vite SPA будет ломаться при прямом открытии URL вроде:

- `/orders/123`
- `/clients/42`
- `/admin/users`

Сервер должен отдавать `index.html`, а уже frontend router разрулит маршрут.

---

## 4. Add `.dockerignore`

### File

```text
.dockerignore
```

### Goal

Уменьшить Docker build context и не включать мусор в image build.

### Recommended Content

```text
node_modules
dist
.git
.github
.idea
.vscode
*.log
npm-debug.log*
.DS_Store
```

### Why It Matters

Без `.dockerignore` Docker build будет дольше, а контекст может стать сильно тяжелее.

---

## 5. Validate Package Scripts

### What To Check in `package.json`

Нужно проверить, что в `package.json` есть корректный production build script.

Минимально должен быть:

```json
{
  "scripts": {
    "build": "tsc -b && vite build"
  }
}
```

### What To Confirm

- `npm ci` проходит на чистой машине;
- `npm run build` создаёт папку `dist`;
- build не требует локального dev proxy;
- build не зависит от `localhost:5173` или `localhost:8088` в runtime.

---

## 6. Review Runtime Env Strategy

### Important Context

Сейчас repo использует Vite dev proxy для локальной разработки.

Но production image не должен зависеть от dev proxy. Он должен работать через `nginx` инфраструктурного уровня.

### What To Check

Проверь, что production build:

- не требует `VITE_GATEWAY_PROXY_TARGET`;
- использует `VITE_GATEWAY_BASE_URL` только если это действительно нужно;
- корректно работает с same-origin API calls через внешний infra nginx.

### Recommended Runtime Model

На production/staging лучше, чтобы frontend обращался к API так:

- `/api/...`
- `/api/admin/...`

а внешний инфраструктурный `nginx` уже проксировал их в backend.

Это уменьшает привязку frontend image к environment-specific hostnames.

---

## 7. Local Validation Before Push

Перед первым пушем workflow нужно локально проверить:

### Commands

```bash
npm ci
npm run build
docker build -t autoshop-web-spec:test .
docker run --rm -p 8080:80 autoshop-web-spec:test
```

### Manual Browser Check

Открыть:

- `http://localhost:8080`

И проверить:

- UI загружается;
- прямой переход на глубокий route не даёт 404;
- статика грузится корректно.

---

## 8. GitHub Repository Settings To Check

В репозитории `autoshop-web-spec` проверь:

- `Settings` → `Actions` → `General`
- workflows разрешены;
- разрешён вызов reusable workflows;
- нет ограничений, блокирующих organization workflows.

Если репозиторий public, обычно встроенного `GITHUB_TOKEN` достаточно.

---

## 9. Expected Image Tags

После push в `main` или `staging` у image обычно появятся теги:

- `main`
- `staging`
- `sha-<short-commit>`
- `latest` для `main`

Это зависит от логики reusable workflow в `autoshop-crm/.github`.

---

## 10. How Infra Will Use It

После публикации image инфраструктура должна использовать:

```env
WEB_SPEC_IMAGE=ghcr.io/autoshop-crm/autoshop-web-spec
WEB_SPEC_IMAGE_TAG=latest
```

или конкретный tag, например:

```env
WEB_SPEC_IMAGE_TAG=sha-1a2b3c4
```

Это даст возможность фиксировать деплой на конкретную сборку.

---

## 11. Recommended Commit Sequence

### Step 1
Добавить:

- `Dockerfile`
- `nginx.conf`
- `.dockerignore`
- `.github/workflows/deploy.yml`

### Step 2
Сделать локальную проверку build.

### Step 3
Сделать commit:

```bash
git add .
git commit -m "ci: add reusable build and docker publish workflow"
```

### Step 4
Запушить в `main` или `staging`.

### Step 5
Проверить GitHub Actions run и наличие package в GHCR.

---

## Definition of Done

Считать задачу завершенной, когда:

- в repo есть `Dockerfile`;
- в repo есть `nginx.conf` с SPA fallback;
- в repo есть `.dockerignore`;
- в repo есть `.github/workflows/deploy.yml`;
- GitHub Actions успешно собирает image;
- image появляется в `ghcr.io/autoshop-crm/autoshop-web-spec`;
- image можно локально запустить через `docker run`;
- `autoshop-infrastructure` может использовать этот image в `staging/prod`.

---

## Practical Recommendation

Для `autoshop-web-spec` это нужно сделать обязательно.

Именно этот репозиторий должен первым перейти с модели:

- build on server

на модель:

- build in CI
- push to GHCR
- pull on server

