# План репозитория `autoshop-infrastructure`

## 1. Зачем нужен этот репозиторий

`autoshop-infrastructure` нужен не как еще один backend-сервис, а как **единый deployment/operations репозиторий**, который:

- поднимает весь контур проекта одной командой;
- хранит инфраструктурные конфиги для локалки, staging и production;
- знает, какие контейнеры, сети, тома, переменные окружения и reverse proxy нужны системе;
- автоматизирует первичную настройку сервера;
- служит единой точкой входа для запуска всей платформы.

Идея простая:

- бизнес-код живет в `autoshop-core`, `autoshop-auth`, `autoshop-notification`, `autoshop-files`;
- а все, что связано с запуском, деплоем, конфигурацией окружений, health-check, secrets wiring, backups и обновлением сервисов, живет в `autoshop-infrastructure`.

## 2. Главная цель репозитория

Репозиторий должен решить 5 задач:

1. Поднять всю систему локально для интеграционного тестирования.
2. Поднять всю систему на сервере без ручной сборки “по памяти”.
3. Разделить конфиги по окружениям: `local`, `staging`, `prod`.
4. Дать понятный и воспроизводимый deploy flow.
5. Дать операционные инструменты: init, migrate, backup, logs, health, restart, update.

## 3. Что именно он должен поднимать

На текущем этапе `autoshop-infrastructure` должен уметь поднимать:

### Бизнес-сервисы

- `autoshop-core`
- `autoshop-auth`
- `autoshop-notification`
- `autoshop-files`

### Инфраструктурные зависимости

- PostgreSQL
- Redis
- Kafka
- MinIO
- Mailhog для local/staging
- Nginx или Traefik как reverse proxy

### Опционально позже

- Prometheus
- Grafana
- Loki / Promtail
- Uptime Kuma
- Certbot / автоматический TLS

## 4. Что НЕ должен делать этот репозиторий

Важно сразу ограничить scope:

- не хранить бизнес-логику;
- не копировать код сервисов внутрь себя;
- не содержать еще один Spring Boot application;
- не становиться “пятым микросервисом”;
- не дублировать миграции сервисов;
- не держать реальные production secrets в Git.

## 5. Архитектурная модель работы

Правильная модель для этого репозитория:

```text
autoshop-infrastructure
    |
    +--> знает, как получить образы сервисов
    +--> знает, какие env нужны каждому сервису
    +--> знает, как связать их в одну сеть
    +--> знает, какие volumes persistent
    +--> знает, какие порты публикуются наружу
    +--> знает, как инициализировать окружение
    +--> знает, как сделать deploy/update/backup/rollback
```

То есть это **операционный orchestrator repo**.

## 6. Целевой состав репозитория

Ниже предлагаю практическую структуру для первого нормального варианта.

```text
autoshop-infrastructure/
├── README.md
├── .gitignore
├── .env.example
├── Makefile
├── compose/
│   ├── compose.base.yml
│   ├── compose.local.yml
│   ├── compose.staging.yml
│   ├── compose.prod.yml
│   ├── compose.monitoring.yml
│   └── compose.tools.yml
├── env/
│   ├── local/
│   │   ├── core.env.example
│   │   ├── auth.env.example
│   │   ├── notification.env.example
│   │   ├── files.env.example
│   │   └── infrastructure.env.example
│   ├── staging/
│   │   └── ...
│   └── prod/
│       └── ...
├── nginx/
│   ├── local/
│   │   └── autoshop.conf
│   ├── staging/
│   │   └── autoshop.conf
│   └── prod/
│       └── autoshop.conf
├── scripts/
│   ├── init/
│   │   ├── init-server.sh
│   │   ├── init-directories.sh
│   │   ├── init-env.sh
│   │   └── init-minio.sh
│   ├── deploy/
│   │   ├── deploy-local.sh
│   │   ├── deploy-staging.sh
│   │   ├── deploy-prod.sh
│   │   ├── pull-images.sh
│   │   └── restart-services.sh
│   ├── ops/
│   │   ├── logs.sh
│   │   ├── status.sh
│   │   ├── healthcheck.sh
│   │   ├── restart-one.sh
│   │   └── rollback.sh
│   ├── backup/
│   │   ├── backup-postgres.sh
│   │   ├── backup-minio.sh
│   │   └── restore-postgres.sh
│   └── smoke/
│       ├── smoke-auth.sh
│       ├── smoke-core.sh
│       ├── smoke-notification.sh
│       ├── smoke-files.sh
│       └── smoke-e2e.sh
├── data/
│   ├── local/
│   ├── staging/
│   └── prod/
├── docs/
│   ├── DEPLOYMENT.md
│   ├── ENVIRONMENT_VARIABLES.md
│   ├── SERVER_SETUP.md
│   ├── BACKUP_AND_RESTORE.md
│   ├── ROLLBACK.md
│   └── TROUBLESHOOTING.md
└── .github/
    └── workflows/
        ├── validate-compose.yml
        ├── deploy-staging.yml
        └── deploy-prod.yml
```

## 7. Что должно быть в `README.md`

`README.md` в этом репозитории должен отвечать на 7 вопросов:

1. Что поднимает этот репозиторий.
2. Какие есть окружения.
3. Как запустить локально.
4. Как задеплоить на staging.
5. Как задеплоить на prod.
6. Где лежат env-файлы и как их готовить.
7. Какие команды использовать для диагностики.

Минимальные разделы:

- Overview
- Services
- Requirements
- Local Setup
- Staging Deploy
- Production Deploy
- Operations
- Backups
- Troubleshooting

## 8. Слой compose-файлов

Я бы не делал один гигантский `docker-compose.yml`. Лучше разложить так:

### `compose.base.yml`

Общее описание:

- общая сеть;
- volumes;
- базовые service definitions;
- healthchecks;
- restart policies;
- общие labels;
- зависимости.

### `compose.local.yml`

Переопределения для локалки:

- проброс портов наружу;
- Mailhog;
- возможно bind-mount для локальной разработки;
- local database names и local credentials;
- удобные порты `8080`, `8082`, `8083`, `8084`.

### `compose.staging.yml`

Переопределения для staging:

- staging domain names;
- staging env;
- staging secrets через env-файлы;
- доступ наружу только через reverse proxy;
- Mailhog или sandbox Mailjet.

### `compose.prod.yml`

Переопределения для production:

- production image tags;
- production env;
- Nginx / reverse proxy;
- TLS;
- persistent volumes;
- backup mounts;
- без лишнего проброса внутренних портов.

### `compose.monitoring.yml`

Подключаемые сервисы:

- Prometheus
- Grafana
- Loki

Чтобы мониторинг можно было поднимать отдельно, а не всегда.

## 9. Какие сервисы и порты лучше зафиксировать

### Внутри docker network

- `core:8080`
- `auth:8082`
- `notification:8083`
- `files:8084`
- `postgres:5432`
- `redis:6379`
- `kafka:9092`
- `minio:9000`
- `minio-console:9001`
- `mailhog:1025`
- `mailhog-ui:8025`

### Снаружи в production

Лучше наружу публиковать не все подряд, а только через reverse proxy:

- `https://api.example.com/core/...`
- `https://api.example.com/auth/...`
- `https://api.example.com/files/...`

`notification` наружу лучше не публиковать как публичный API, кроме внутренних health/check endpoints через private access.

## 10. Как получать образы сервисов

Есть два пути. Лучше выбрать один и не смешивать хаотично.

### Вариант A. Build on server

Server сам делает:

- `git clone` каждого сервиса;
- `./gradlew bootJar`;
- `docker build`.

Минусы:

- медленно;
- сервер превращается в build-машину;
- хуже воспроизводимость.

### Вариант B. Pull prebuilt images

Каждый сервисный repo публикует Docker image в registry:

- GitHub Container Registry
- Docker Hub
- private registry

А `autoshop-infrastructure` только делает:

- `docker compose pull`
- `docker compose up -d`

Это лучший путь для staging/prod.

### Рекомендация

Для вас:

- **локально** можно позволить `build` из исходников;
- **на staging/prod** лучше перейти на pull готовых образов.

## 11. Как должны выглядеть service definitions

Каждый сервис в compose должен иметь:

- image/tag или build context;
- `env_file`;
- `depends_on` с health conditions там, где это критично;
- `restart: unless-stopped`;
- healthcheck;
- внутреннее имя сервиса;
- volume только если реально нужен;
- подключение к общей сети.

### Для `core`

Нужно пробросить:

- БД;
- Redis;
- Kafka;
- `APP_AUTH_BASE_URL`;
- UMAPI/Carreta credentials;
- возможно `APP_FILES_BASE_URL`, если вы добавите полноценную интеграцию с file-service.

### Для `auth`

Нужно пробросить:

- БД;
- Redis;
- `JWT_SECRET`;
- bootstrap settings только при необходимости.

### Для `notification`

Нужно пробросить:

- БД;
- Kafka;
- SMTP или Mailjet;
- topic names;
- retry settings.

### Для `files`

Нужно пробросить:

- БД;
- MinIO endpoint и credentials;
- server port;
- presign TTL settings.

## 12. Слой env-конфигов

Очень важно не свалить все переменные в один `.env`.

Я бы делал 2 уровня:

### Общий infra env

Например:

- домены;
- image tags;
- директории volumes;
- общие имена сетей;
- внешние порты.

### Отдельный env на каждый сервис

Например:

- `core.env`
- `auth.env`
- `notification.env`
- `files.env`

Так проще:

- читать;
- ротировать;
- дебажить;
- менять только один сервис без каскада ошибок.

## 13. Что автоматизировать в `Makefile`

`Makefile` должен быть “человеческим фасадом” поверх compose и scripts.

Минимальный набор команд:

```make
make init-local
make up-local
make down-local
make logs
make ps
make restart
make pull
make up-staging
make up-prod
make health
make smoke
make backup
make rollback
```

### Что они должны делать

- `init-local` — копировать `.env.example`, готовить директории, поднимать базовый контур;
- `up-local` — запускать local stack;
- `up-staging` / `up-prod` — запускать нужные compose overlays;
- `health` — проверять health endpoints;
- `smoke` — запускать базовые smoke tests;
- `backup` — триггерить backup scripts.

## 14. Scripts: обязательный состав

## 14.1. Инициализация сервера

### `init-server.sh`

Должен:

- проверить Docker и Docker Compose;
- создать базовые директории;
- создать сети и volumes при необходимости;
- проверить права на каталоги;
- подготовить Nginx конфиги;
- проверить наличие env-файлов.

### `init-directories.sh`

Создает:

- `/opt/autoshop`
- `/opt/autoshop/env`
- `/opt/autoshop/data/postgres`
- `/opt/autoshop/data/redis`
- `/opt/autoshop/data/kafka`
- `/opt/autoshop/data/minio`
- `/opt/autoshop/backups`

## 14.2. Deploy

### `deploy-prod.sh`

Ожидаемый flow:

1. Проверить env-файлы.
2. Проверить registry login.
3. Забрать свежие образы.
4. Прогнать `docker compose config`.
5. Поднять/обновить сервисы.
6. Дождаться health.
7. Прогнать smoke tests.
8. При провале — сообщить и по возможности откатить.

## 14.3. Ops

### `healthcheck.sh`

Проверяет:

- `auth` health;
- `core` health;
- `notification` health;
- `files` health;
- доступность Redis;
- доступность Kafka;
- доступность MinIO.

### `logs.sh`

Позволяет быстро смотреть логи:

```bash
./scripts/ops/logs.sh core
./scripts/ops/logs.sh auth
./scripts/ops/logs.sh notification
./scripts/ops/logs.sh files
```

## 14.4. Backup

### Что нужно бэкапить обязательно

- PostgreSQL data / dumps
- MinIO data
- env-файлы вне Git
- nginx конфиги

### `backup-postgres.sh`

Должен делать:

- `pg_dump` по нужным БД;
- timestamped archive;
- retention policy.

### `backup-minio.sh`

На первом этапе можно делать файловый backup данных MinIO volume.

Позже лучше перейти на:

- lifecycle policies;
- versioning;
- offsite backup.

## 15. Reverse proxy слой

Репозиторий должен содержать reverse proxy конфиги.

На MVP уровне лучше Nginx.

### Что он должен уметь

- route `/auth/*` -> `auth`
- route `/api/*` или `/core/*` -> `core`
- route `/files/*` -> `files`
- health-check endpoints
- CORS headers если нужно
- TLS termination
- gzip
- basic rate limiting для auth endpoints

## 16. SSL / HTTPS

Для production репозиторий должен предусматривать:

- либо Nginx + Certbot;
- либо внешний ingress/proxy с already terminated TLS.

Если вы поднимаете на своем сервере вручную, то в репозитории должны быть:

- шаблоны Nginx site configs;
- инструкция выпуска сертификатов;
- cron/systemd renew сценарий.

## 17. Базы данных и инициализация

Сейчас у сервисов свои БД:

- `core` DB
- `auth_db`
- `notifications_db`
- `files_db`

`autoshop-infrastructure` должен уметь гарантировать:

- что PostgreSQL поднялся;
- что нужные БД созданы;
- что сервисы могут стартовать и сами прогонят Liquibase.

### Что лучше не делать

Не надо копировать миграции в infra repo.

### Что надо сделать

Добавить init script для PostgreSQL, который создаст нужные database names при первом старте контейнера.

Например:

```text
postgres/init/01-create-databases.sql
```

Он должен создать:

- `core_db` или текущую БД `postgres` для core
- `auth_db`
- `notifications_db`
- `files_db`

## 18. Kafka слой

Репозиторий должен поднимать Kafka как часть общего контура.

### Что важно предусмотреть

- один broker для local/staging MVP;
- стабильный `KAFKA_ADVERTISED_LISTENERS`;
- health/readiness проверки;
- удобные команды просмотра topic’ов;
- возможность включать Kafka только там, где нужен messaging profile.

### Полезные extras

Можно добавить `scripts/ops/kafka-topics.sh`:

- посмотреть topics;
- почитать `autoshop.order-events`;
- почитать DLT.

## 19. Redis слой

Redis должен быть общим, но с четким пониманием use cases:

- `auth` — blacklist access token;
- `core` — cache UMAPI/Carreta.

В infra repo полезно сразу описать:

- persistence policy;
- memory limit;
- restart behavior;
- backup policy, если blacklist/cache для вас важны.

Для MVP можно без сложной HA.

## 20. MinIO слой

`autoshop-files` зависит от MinIO, поэтому infra repo должен:

- поднимать MinIO;
- создавать persistent volume;
- держать credentials через env;
- по возможности инициализировать bucket policy/структуру.

### Что можно автоматизировать сразу

Через init script или `mc` client:

- проверить доступность MinIO;
- создать buckets, если сервис `files` еще не успел;
- опционально создать service user.

## 21. Набор smoke tests

Это одна из самых полезных вещей.

После deploy репозиторий должен уметь проверить не только “контейнер жив”, но и “контур работает”.

### Минимальные smoke tests

#### `smoke-auth.sh`

- login тестовым пользователем;
- проверить, что пришли access/refresh token.

#### `smoke-core.sh`

- вызвать `GET /actuator/health`;
- сделать protected request через auth token.

#### `smoke-files.sh`

- загрузить тестовый файл;
- получить metadata;
- скачать файл;
- удалить файл.

#### `smoke-e2e.sh`

Полный сценарий:

1. login;
2. create customer;
3. create vehicle;
4. create order;
5. change order status;
6. проверить, что notification-service жив;
7. проверить, что письмо ушло в Mailhog на non-prod.

## 22. CI/CD для этого репозитория

Репозиторий должен иметь хотя бы базовые workflows.

### `validate-compose.yml`

Проверяет:

- синтаксис compose;
- наличие обязательных env variables;
- что `docker compose config` собирается.

### `deploy-staging.yml`

Делает:

- pull repo;
- подстановку staging env;
- `docker compose pull`;
- `docker compose up -d`;
- smoke tests.

### `deploy-prod.yml`

То же самое, но:

- только на tagged release / manual approval;
- с rollback шагом;
- с более строгими проверками.

## 23. Версионирование deploy

Очень советую сделать versioning не только сервисов, но и deployment state.

Например:

- `CORE_IMAGE_TAG=2026.04.24-1`
- `AUTH_IMAGE_TAG=2026.04.24-1`
- `NOTIFICATION_IMAGE_TAG=2026.04.24-1`
- `FILES_IMAGE_TAG=2026.04.24-1`

Тогда rollback проще:

- достаточно вернуть прошлые теги и поднять stack снова.

## 24. План внедрения по этапам

Ниже не просто список “что надо”, а реальный порядок внедрения.

## Этап 1. MVP infrastructure repo

Цель: поднять все локально и на одном сервере без боли.

Сделать:

- создать `autoshop-infrastructure` repo;
- добавить `compose.base.yml`;
- добавить `compose.local.yml`;
- добавить `compose.prod.yml`;
- добавить `.env.example`;
- добавить `Makefile`;
- добавить `README.md`;
- добавить `deploy-prod.sh`;
- добавить `healthcheck.sh`;
- добавить `smoke-e2e.sh`;
- добавить postgres init script для создания БД;
- добавить nginx config;
- зафиксировать порты и service names.

Definition of Done:

- одна команда поднимает полный локальный контур;
- одна команда поднимает серверный контур;
- не нужно руками вспоминать env и порты.

## Этап 2. Operational maturity

Цель: сделать репозиторий пригодным не только для запуска, но и для сопровождения.

Сделать:

- backup scripts;
- logs/status helpers;
- restart-one helper;
- rollback script;
- staging overlay;
- smoke tests per service;
- мониторинговый overlay.

Definition of Done:

- можно безопасно обновлять систему;
- можно быстро диагностировать падение;
- можно делать backup/restore.

## Этап 3. Production hardening

Цель: привести репозиторий к устойчивому прод-уровню.

Сделать:

- registry-based deploy;
- secret management strategy;
- TLS automation;
- basic monitoring stack;
- resource limits;
- alerting;
- retention policies;
- documented rollback procedure.

Definition of Done:

- прод запускается воспроизводимо;
- обновления делаются без ручной магии;
- есть операционная документация.

## 25. Реальный MVP scope именно для вас

Чтобы не перегрузить себя, я бы предложил такой практический MVP для `autoshop-infrastructure`.

### Обязательно сделать сразу

- отдельный repo;
- `compose.base.yml`;
- `compose.local.yml`;
- `compose.prod.yml`;
- `.env.example`;
- env templates на 4 сервиса;
- postgres init script;
- nginx config;
- `Makefile`;
- `deploy-prod.sh`;
- `healthcheck.sh`;
- `smoke-e2e.sh`;
- документацию запуска.

### Можно отложить

- мониторинг;
- централизованные логи;
- полноценный rollback automation;
- blue-green deploy;
- zero-downtime schema orchestration;
- HA для Kafka/Redis/Postgres/MinIO.

## 26. Какие решения лучше принять заранее

Есть несколько вещей, которые лучше решить сразу до создания repo.

### 1. Registry strategy

Где будут лежать образы:

- GitHub Container Registry
- Docker Hub
- private registry

### 2. Domain routing

Как будут выглядеть внешние URL:

- один домен + path prefixes
- или разные subdomains

### 3. Secrets strategy

Где будут лежать production secrets:

- `.env` вне Git на сервере
- GitHub Actions secrets
- 1Password / Vault / другой secret store

### 4. Port policy

Закрепить окончательно:

- `core=8080`
- `auth=8082`
- `notification=8083`
- `files=8084`

### 5. DB naming policy

Закрепить единообразно:

- `core_db`
- `auth_db`
- `notifications_db`
- `files_db`

Сейчас это местами еще не до конца унифицировано.

## 27. Самая правильная формулировка роли этого репозитория

Если одной фразой:

> `autoshop-infrastructure` — это не микросервис, а репозиторий окружения, который описывает, конфигурирует, запускает и сопровождает всю платформу AutoShop как единую систему.

## 28. Итоговая рекомендация

Для вашей текущей стадии проекта я бы делал `autoshop-infrastructure` как **deployment repo MVP+, а не enterprise DevOps platform**.

То есть:

- сначала сделать его простым, понятным и воспроизводимым;
- довести до состояния “поднял все одной командой”;
- только потом наращивать мониторинг, rollback automation и продвинутые ops-вещи.

Если сделать слишком “идеально” сразу, вы утонете в DevOps раньше, чем закончите основной продукт.

## 29. Предлагаемый первый backlog для создания repo

### Sprint 1

- создать repo `autoshop-infrastructure`
- перенести и нормализовать текущий compose
- разрулить конфликты портов
- добавить env templates
- добавить postgres init script
- добавить nginx config
- добавить README

### Sprint 2

- добавить deploy scripts
- добавить smoke tests
- добавить health checks
- добавить backup scripts
- добавить staging overlay

### Sprint 3

- перейти на image-based deploy
- добавить CI validation
- добавить rollback script
- добавить monitoring overlay

## 30. Definition of Done для самого репозитория

`autoshop-infrastructure` можно считать готовым на вашем текущем этапе, если:

- новый сервер можно подготовить по `docs/SERVER_SETUP.md`;
- после подготовки окружения `make up-prod` реально поднимает систему;
- все 4 backend-сервиса проходят health-check;
- полный smoke e2e сценарий проходит;
- документация позволяет это повторить без воспоминаний “что я тогда руками подкручивал”.
