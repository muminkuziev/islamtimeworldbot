"""
IslamTimeWorldBot — Entry point

Usage:
  python main.py          → runs Telegram bot
  python server.py        → runs WebApp server (separate terminal)

For production:
  Set WEBAPP_URL in .env to your HTTPS domain (e.g. ngrok or Railway URL).
"""

import asyncio
from bot import main

if __name__ == "__main__":
    asyncio.run(main())
