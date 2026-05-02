# Day 14 implementation notes

## Services and ports

```text
Core:                http://localhost:8080
AuthService:         http://localhost:8082
NotificationService: http://localhost:8083
PostgreSQL:          localhost:5433
Redis:               localhost:6379
Kafka:               localhost:9092
Mailhog SMTP:        localhost:1025
Mailhog UI:          http://localhost:8025
```

## Kafka contract

Core publishes JSON strings to:

```text
topic: autoshop.order-events
key:   eventId
```

Envelope:

```json
{
  "eventId": "UUID",
  "eventType": "ORDER_CREATED | ORDER_STATUS_CHANGED | ORDER_COMPLETED",
  "occurredAt": "ISO-8601 instant",
  "source": "autoshop-core",
  "version": 1,
  "correlationId": "order-42-created",
  "payload": {}
}
```

Core builds immutable notification payload snapshots inside the order transaction and publishes Spring domain events.
The Kafka send runs from `@TransactionalEventListener(phase = AFTER_COMMIT)`.

## Local run

Infrastructure:

```bash
cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-core
docker compose --profile messaging up -d postgres redis kafka mailhog
```

Create missing service databases:

```sql
CREATE DATABASE auth_db;
CREATE DATABASE notifications_db;
```

AuthService:

```bash
cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-auth
DB_URL=jdbc:postgresql://localhost:5433/auth_db \
DB_USERNAME=autoshop-admin \
DB_PASSWORD=pass \
SPRING_PROFILES_ACTIVE=dev \
./gradlew bootRun
```

NotificationService:

```bash
cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-notification
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5433/notifications_db \
SPRING_DATASOURCE_USERNAME=autoshop-admin \
SPRING_DATASOURCE_PASSWORD=pass \
SPRING_PROFILES_ACTIVE=local \
./gradlew bootRun
```

Core:

```bash
cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-core
APP_AUTH_BASE_URL=http://localhost:8082 \
SPRING_PROFILES_ACTIVE=local \
./gradlew bootRun
```

Auth dev users are created by the `dev` profile:

```text
admin@autoshop.local / Admin123!
manager@autoshop.local / Manager123!
reception@autoshop.local / Reception123!
mechanic@autoshop.local / Mechanic123!
```

## MVP limitation

Day 14 uses AFTER_COMMIT publishing, not a transactional outbox. This prevents events for rolled back order
transactions, but it does not guarantee replay if Core crashes after the DB commit and before Kafka send completes.
Add a Core outbox table and relay as a production follow-up.
