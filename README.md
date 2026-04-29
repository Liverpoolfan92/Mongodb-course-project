# QA Forum — Docker (Windows)

## Изисквания
- Docker Desktop за Windows (https://www.docker.com/products/docker-desktop/)
- Включи "Use WSL 2 based engine" в Docker Desktop Settings

## Стартиране (само 1 команда)

```bash
docker compose up --build
```

Отвори браузър → **http://localhost:5173**

---

## Спиране

```bash
# Спри контейнерите (данните се запазват)
docker compose down

# Спри + изтрий данните от MongoDB
docker compose down -v
```

---

## Архитектура

```
                    Windows хост
         ┌──────────────────────────────┐
         │        bridge: qa_net        │
         │                              │
         │  [frontend]     [backend]    │
         │   Vite:5173  →  Express:5000 │
         │       ↑              ↓       │
         │  localhost:5173  [mongo]     │
         │                  27017       │
         └──────────────────────────────┘
```

**Защо не host network?**
Windows Docker не поддържа `network_mode: host`.
Вместо това използваме `bridge` мрежа с имена на сервизи.
Vite проксира `/api` заявките към `http://backend:5000` (Docker DNS).

---

## Дебъг команди

```bash
# Логове в реално време
docker compose logs -f

# Само backend логове
docker compose logs -f backend

# Влез в MongoDB
docker exec -it qa_mongo mongosh
use qa_forum
db.questions.find().pretty()
db.questions.aggregate([{ $addFields: { voteCount: { $size: "$votes" } } }])

# Провери мрежата
docker network inspect qa-docker_qa_net
```

---

## Ключови файлове

| Файл | Защо е важен |
|------|-------------|
| `docker-compose.yml` | Дефинира 3 сервиза + bridge мрежа + healthcheck за mongo |
| `frontend/vite.config.js` | `host: "0.0.0.0"` + proxy към `http://backend:5000` |
| `frontend/package.json` | `vite --host 0.0.0.0` в dev скрипта |
| `backend/server.js` | Слуша на `0.0.0.0`, MONGO_URI идва от env |
