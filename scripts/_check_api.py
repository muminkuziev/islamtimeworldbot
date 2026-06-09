import asyncio, aiohttp, sys
sys.stdout.reconfigure(encoding="utf-8")

async def check():
    async with aiohttp.ClientSession() as s:
        for col in ["bukhari", "muslim"]:
            url = "https://api.hadith.gading.dev/books/" + col + "/1"
            async with s.get(url, timeout=aiohttp.ClientTimeout(total=15)) as r:
                d = await r.json(content_type=None)
                info = d.get("data", {})
                avail = info.get("available", "?")
                c = info.get("contents", {})
                print(col + ": available=" + str(avail) + ", keys=" + str(list(c.keys())))
                print("  id[:150]: " + str(c.get("id", ""))[:150])
                print()

asyncio.run(check())
