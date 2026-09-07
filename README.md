# Telegram Provider Payment API & Monitoring System

Full-stack Provider Payment API and Automated Monitoring System for Telegram payments (`@humocardbot`).

## Features
- **FastAPI Backend**: Async Python REST API (`/create`, `/status/{id}`, `/api/sessions`, `/api/cards`).
- **Telethon Telegram Client**: Dynamic Telegram session connector (SMS Code + 2FA), automatic humocardbot payment message parser.
- **MySQL / SQLite Database**: SQLAlchemy ORM with automatic fallbacks.
- **ReactJS Frontend Dashboard**: Vite + Tailwind CSS Dark UI for managing sessions, cards, real-time transaction monitoring, and API simulator.
- **Auto-Deploy Webhook**: Automated GitHub push integration.

## License
MIT
