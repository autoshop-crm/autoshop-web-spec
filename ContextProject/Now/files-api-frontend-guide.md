# Files API Frontend Guide

Этот документ описывает, как в текущей архитектуре работает файловый сервис `autoshop-files`, как фронтенду с ним взаимодействовать и как диагностировать ошибки вида:

- `http://localhost/api/files/`
- `network error`
- `404`
- `401`
- `413`
- `415`
- `5xx`

Документ основан на текущем состоянии репозитория `autoshop-core` и внутренней архитектурной документации проекта.

---

## Короткий вывод

### Главное

`/api/files` **не реализован в `autoshop-core`**.

В текущей архитектуре файлы — это **отдельный сервис**:
- `autoshop-files`
- отдельный HTTP API
- отдельная БД `files_db`
- отдельное хранение байтов в MinIO

Это значит:
- если фронт отправляет запрос на `http://localhost/api/files/...`, ошибка может быть вообще не в `core`
- надо понимать, куда именно проксируется `/api/files`
- если `autoshop-files` не запущен или nginx не знает маршрут, загрузка файлов работать не будет

---

## 1. Что такое `autoshop-files`

По архитектуре проекта `autoshop-files` — это отдельный file-storage сервис.

### Что он делает

- принимает upload файлов по HTTP
- валидирует метаданные файла
- сохраняет байты в MinIO
- сохраняет метаданные в PostgreSQL (`files_db`)
- отдаёт файл по download endpoint
- умеет генерировать presigned download URL
- поддерживает soft delete

### Что важно

`autoshop-core` **не хранит файлы напрямую**.

Идея архитектуры:
- `core` хранит только ссылку / `fileId`
- `files` хранит сами байты и метаданные
- MinIO скрыт за `files` API

---

## 2. Что найдено в этом репозитории

### Primary Locations

- `SYSTEM_EXCURSION.md:8` — `autoshop-files` описан как отдельный сервис хранения файлов поверх MinIO
- `SYSTEM_EXCURSION.md:63` — явно сказано, что `files` инкапсулирует MinIO, а остальные сервисы работают через его HTTP API
- `SYSTEM_EXCURSION.md:170` — прямо указано, что в `core` сейчас **нет живой интеграции** с `autoshop-files`
- `SYSTEM_EXCURSION.md:171` — в `core` есть MinIO-настройки, но нет кода, использующего MinIO или `files` API
- `SYSTEM_EXCURSION.md:1119` — перечислен endpoint `POST /api/files`
- `SYSTEM_EXCURSION.md:1142` — `GET /api/files/{fileId}`
- `SYSTEM_EXCURSION.md:1146` — `GET /api/files?ownerType=...&ownerId=...`
- `SYSTEM_EXCURSION.md:1150` — `GET /api/files/{fileId}/download`
- `SYSTEM_EXCURSION.md:1154` — `POST /api/files/{fileId}/presigned-download-url`
- `SYSTEM_EXCURSION.md:1166` — `DELETE /api/files/{fileId}`
- `docker-compose.yml:57` — в compose поднимается только MinIO, но не сам `autoshop-files`

### Key Insight

В этом репозитории **нет FileController / FileService / upload endpoint в `core`**.

То есть если `/api/files` у тебя не работает, это ожидаемо, если:
- `autoshop-files` не запущен
- nginx не проксирует `/api/files`
- фронт указывает не тот base URL

---

## 3. Почему `http://localhost/api/files/` может не работать

### Причина 1. `autoshop-files` не запущен

Судя по текущему `docker-compose.yml`, сервис `files` здесь не поднимается.

Поднимаются только:
- Postgres
- Redis
- Kafka
- MinIO
- Mailhog

Но не `autoshop-files`.

### Причина 2. Неверный base URL

Архитектурная документация говорит, что локально files service должен жить на отдельном порту, например:
- `http://localhost:8084`

Если фронт бьёт в:
- `http://localhost/api/files/...`

то это сработает **только если** nginx/router умеет проксировать `/api/files` в `autoshop-files`.

Если такого proxy-правила нет — будет ошибка.

### Причина 3. Nginx/proxy не знает маршрут `/api/files`

Если frontend работает через единый origin `http://localhost`, тогда `/api/files` должен быть явно проксирован на files-service.

Если маршрута нет, будут:
- `404`
- `502`
- `503`
- или сетевые ошибки

### Причина 4. Files service не настроен на MinIO / files_db

Даже если `autoshop-files` запущен, он не взлетит корректно без:
- `FILES_DB_URL`
- `FILES_DB_USERNAME`
- `FILES_DB_PASSWORD`
- `MINIO_ENDPOINT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`

---

## 4. Как это должно работать концептуально

### Upload flow

Текущий задуманный поток:

1. фронт отправляет multipart upload в `autoshop-files`
2. files-service валидирует:
   - category
   - ownerType
   - ownerId
   - contentType
   - extension
   - size
   - filename
3. files-service создаёт запись метаданных в PostgreSQL
4. files-service загружает байты в MinIO
5. если загрузка успешна — статус файла `AVAILABLE`
6. если нет — `UPLOAD_FAILED`

### Download flow

1. фронт получает `fileId`
2. дальше может:
   - качать файл через `GET /api/files/{fileId}/download`
   - или запрашивать presigned URL через `POST /api/files/{fileId}/presigned-download-url`

### Delete flow

1. фронт вызывает `DELETE /api/files/{fileId}`
2. сервис делает soft delete метаданных
3. если файл был `AVAILABLE`, объект удаляется и из MinIO

---

## 5. Files API endpoints

Ниже — endpoints, которые описаны в архитектурной документации проекта.

## 5.1 Upload file

### Endpoint

`POST /api/files`

### Content type

`multipart/form-data`

### Multipart fields

- `file` — обязательный файл
- `category` — обязательное поле
- `ownerType` — обязательное поле
- `ownerId` — обязательное поле
- `uploadedBy` — необязательное поле

### Example cURL

```bash
curl -X POST http://localhost:8084/api/files \
  -F 'category=ORDER_DOCUMENT' \
  -F 'ownerType=ORDER' \
  -F 'ownerId=42' \
  -F 'uploadedBy=employee-1' \
  -F 'file=@/tmp/order.pdf;type=application/pdf'
```

### Frontend example

```ts
const formData = new FormData()
formData.append('category', 'ORDER_DOCUMENT')
formData.append('ownerType', 'ORDER')
formData.append('ownerId', '42')
formData.append('uploadedBy', 'employee-1')
formData.append('file', file)

await fetch('http://localhost:8084/api/files', {
  method: 'POST',
  body: formData,
})
```

### Important

Для `multipart/form-data` **не надо вручную ставить `Content-Type`** в `fetch`, браузер сам добавит boundary.

---

## 5.2 Get file metadata

### Endpoint

`GET /api/files/{fileId}`

### What it gives

- метаданные файла
- статус
- owner info
- category
- storage info / internal references, если сервис это отдаёт

---

## 5.3 List files by owner

### Endpoint

`GET /api/files?ownerType=ORDER&ownerId=42&includeDeleted=false&page=0&size=20`

### Use case

Это основной endpoint для фронта, если нужно показать:
- все файлы заказа
- все документы клиента
- все файлы машины

### Query params

- `ownerType`
- `ownerId`
- `includeDeleted`
- `page`
- `size`

---

## 5.4 Download file directly

### Endpoint

`GET /api/files/{fileId}/download`

### Use case

Подходит, если фронт хочет скачать файл напрямую через files-service.

### Typical frontend usage

- открыть ссылку в новой вкладке
- либо сделать `window.location.href = ...`
- либо запросить blob и сохранить вручную

---

## 5.5 Get presigned download URL

### Endpoint

`POST /api/files/{fileId}/presigned-download-url`

### Request body

```json
{
  "ttlSeconds": 900
}
```

### Limits

Согласно документации:
- минимум: `60`
- default: `900`
- максимум: `3600`

### Use case

Это лучший путь, если фронт хочет:
- скачать файл напрямую из object storage
- отдать браузеру short-lived URL
- не тянуть байты через сам files-service

---

## 5.6 Delete file

### Endpoint

`DELETE /api/files/{fileId}`

### What it does

- мягко удаляет метаданные
- если файл был `AVAILABLE`, удаляет объект из MinIO

---

## 6. Category / Bucket mapping

По текущей документации category определяет bucket.

| Category | Bucket |
|---|---|
| `ORDER_DOCUMENT` | `documents` |
| `ORDER_ESTIMATE` | `estimates` |
| `ORDER_INSPECTION_PHOTO` | `car-inspections` |
| `VEHICLE_PHOTO` | `car-inspections` |
| `VEHICLE_DOCUMENT` | `documents` |
| `CUSTOMER_DOCUMENT` | `documents` |
| `CUSTOMER_AVATAR` | `avatars` |
| `EMPLOYEE_AVATAR` | `avatars` |
| `INVOICE` | `estimates` |
| `REPORT` | `estimates` |

### Что это даёт фронту

Фронт не должен знать про buckets.

Фронт работает только с:
- `category`
- `ownerType`
- `ownerId`

А files-service сам выбирает bucket и object key.

---

## 7. OwnerType values

Допустимые owner types по документации:

- `VEHICLE`
- `ORDER`
- `CUSTOMER`
- `CLIENT`
- `EMPLOYEE`
- `PART`
- `PURCHASE_ORDER`
- `SYSTEM`

### Recommendation

Для нового фронта лучше использовать консистентные owner types:
- `ORDER`
- `VEHICLE`
- `CUSTOMER`
- `EMPLOYEE`

`CLIENT` — legacy-совместимость.

---

## 8. File lifecycle states

Сервис использует жизненный цикл файла:

- `PENDING`
- `AVAILABLE`
- `UPLOAD_FAILED`
- `DELETED`

### Что это даёт фронту

Фронт может:
- показывать, что файл еще обрабатывается
- скрывать/помечать битые upload’ы
- не считать `DELETED` активным файлом

---

## 9. Как понять, в чём ошибка

Ниже — практическая диагностика.

## 9.1 Если ошибка уже на `http://localhost/api/files/...`

Проверяй по порядку:

### Шаг 1. Существует ли files-service вообще

В этом репозитории его кода нет.

То есть надо проверить отдельный репозиторий:
- `autoshop-files`

### Шаг 2. Запущен ли сервис

Согласно документации, локально он должен запускаться отдельно, например на `8084`.

Проверь:

```bash
curl -i http://localhost:8084/api/files
```

Если нет ответа — files-service не запущен.

### Шаг 3. Есть ли proxy маршрут `/api/files`

Если фронт вызывает:
- `http://localhost/api/files/...`

то nginx/dev proxy должен уметь проксировать это на:
- `http://localhost:8084/api/files/...`

Если прокси нет — ошибка в routing / frontend env.

### Шаг 4. Проверить MinIO и БД files-service

Даже если API поднят, upload не заработает без:
- PostgreSQL database `files_db`
- MinIO на `9000`
- валидных credentials

---

## 9.2 Как интерпретировать типовые ошибки

### `404 Not Found`

Обычно значит одно из:
- фронт бьёт не в тот сервис
- nginx не знает `/api/files`
- files-service не поднят

### `401 Unauthorized`

Зависит от реализации самого `autoshop-files`.

По архитектурной документации есть важная ремарка:
- `files` пока без настоящей авторизации

Это значит, что текущая auth-модель files-service может быть:
- отсутствующей
- неполной
- отличной от `core`

Нужно проверить реальный код `autoshop-files`.

### `400 Bad Request`

Частые причины:
- нет `file`
- нет `category`
- нет `ownerType`
- нет `ownerId`
- неверное значение category / ownerType
- неправильный multipart body

### `413 Payload Too Large`

Файл превышает лимит upload size.

### `415 Unsupported Media Type`

Фронт отправил не `multipart/form-data`.

### `500` / `503`

Чаще всего:
- files-service не может достучаться до MinIO
- files-service не может достучаться до files_db
- bucket не создан
- storage/upload exception

---

## 10. Что именно это даст фронтенду

Если сервис файлов будет подключён правильно, фронтенд получит:

### Для заказа
- прикладывать документы к заказу
- хранить фото осмотра
- хранить сметы
- скачивать вложения

### Для клиента
- хранить документы клиента
- хранить аватар

### Для машины
- хранить фото авто
- хранить документы авто

### Для закупки и отчётов
- прикладывать инвойсы
- хранить отчётные файлы

### Технически
- фронт не зависит напрямую от MinIO/S3
- фронт работает только через HTTP API
- проще сменить storage backend без переписывания UI

---

## 11. Recommended frontend integration strategy

## Option A. Direct files-service base URL

Использовать явный base URL:
- `http://localhost:8084/api/files`

Плюсы:
- проще дебажить
- сразу видно, жив ли files-service

Минусы:
- нужен отдельный env var для фронта

Пример:

```ts
const FILES_API_BASE_URL = import.meta.env.VITE_FILES_API_BASE_URL
```

## Option B. Reverse proxy through same origin

Использовать:
- `/api/files`

Но тогда обязательно нужен proxy:
- frontend/nginx/dev-server → `http://localhost:8084`

Плюсы:
- единый origin
- меньше CORS-проблем

Минусы:
- если proxy настроен неверно, ошибка выглядит как “файлы сломаны”, хотя сломан routing

### Recommendation

На локалке для отладки лучше сначала проверить прямой URL:
- `http://localhost:8084/api/files`

А уже потом прятать это за `/api/files`.

---

## 12. Practical frontend recipes

## Upload file to order

```ts
async function uploadOrderFile(orderId: number, file: File) {
  const formData = new FormData()
  formData.append('category', 'ORDER_DOCUMENT')
  formData.append('ownerType', 'ORDER')
  formData.append('ownerId', String(orderId))
  formData.append('file', file)

  const response = await fetch('http://localhost:8084/api/files', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`)
  }

  return response.json()
}
```

## List order files

```ts
async function listOrderFiles(orderId: number) {
  const response = await fetch(
    `http://localhost:8084/api/files?ownerType=ORDER&ownerId=${orderId}&includeDeleted=false&page=0&size=20`
  )

  if (!response.ok) {
    throw new Error(`List failed: ${response.status}`)
  }

  return response.json()
}
```

## Get presigned URL

```ts
async function getPresignedDownloadUrl(fileId: string) {
  const response = await fetch(`http://localhost:8084/api/files/${fileId}/presigned-download-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ttlSeconds: 900 }),
  })

  if (!response.ok) {
    throw new Error(`Presign failed: ${response.status}`)
  }

  return response.json()
}
```

---

## 13. Local launch checklist

Чтобы files API заработал локально, нужно:

1. Поднять Postgres и MinIO
2. Создать БД `files_db`
3. Запустить `autoshop-files`
4. Проверить, что он слушает отдельный порт, например `8084`
5. Настроить фронтовый env или proxy

Согласно документации:

```bash
cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-files
export FILES_DB_URL=jdbc:postgresql://localhost:5433/files_db
export FILES_DB_USERNAME=autoshop-admin
export FILES_DB_PASSWORD=pass
export MINIO_ENDPOINT=http://localhost:9000
export MINIO_ACCESS_KEY=minioadmin
export MINIO_SECRET_KEY=minioadmin
export SERVER_PORT=8084
./gradlew bootRun
```

---

## 14. Most likely diagnosis for your current error

Если фронт сейчас бьёт в:
- `http://localhost/api/files/`

то наиболее вероятно одно из двух:

### Case 1
`autoshop-files` вообще не запущен

### Case 2
`autoshop-files` запущен, но `/api/files` не проксируется на него

То есть в большинстве случаев ошибка сейчас будет не в самом upload payload, а в том, что фронт обращается не в тот runtime path.

---

## 15. What to check first

Минимальный чек-лист:

- открывается ли `http://localhost:8084/api/files`
- запущен ли `autoshop-files`
- настроен ли proxy `/api/files -> :8084`
- существует ли `files_db`
- доступен ли MinIO на `9000`
- не отправляет ли фронт JSON вместо `multipart/form-data`

---

## 16. Final recommendation

Для фронтенда сейчас лучший путь такой:

1. считать `files` отдельным backend service
2. не ожидать, что `autoshop-core` умеет `/api/files`
3. сначала подключиться напрямую к `autoshop-files`
4. только потом, если нужно, спрятать его за reverse proxy `/api/files`

Если нужно, следующим шагом стоит отдельно проверить:
- запущен ли `autoshop-files`
- какой у него реальный base URL
- какие реальные response DTO он возвращает

Потому что в текущем репозитории `autoshop-core` есть только архитектурные ссылки на files-service, но не сам рабочий код этого API.
