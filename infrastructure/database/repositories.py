from sqlalchemy import select

from infrastructure.database.models import User
from infrastructure.database.connection import AsyncSessionLocal


async def create_user(
    telegram_id: int,
    username: str = None,
    first_name: str = None,
    last_name: str = None,
):
    async with AsyncSessionLocal() as session:

        user = User(
            telegram_id=telegram_id,
            username=username,
            first_name=first_name,
            last_name=last_name
        )

        session.add(user)

        await session.commit()

        return user


async def get_user(telegram_id: int):

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            select(User).where(
                User.telegram_id == telegram_id
            )
        )

        return result.scalar_one_or_none()


async def update_language(
    telegram_id: int,
    language_code: str
):

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            select(User).where(
                User.telegram_id == telegram_id
            )
        )

        user = result.scalar_one_or_none()

        if user:
            user.language_code = language_code

            await session.commit()

        return user


async def get_language(
    telegram_id: int
):

    user = await get_user(telegram_id)

    if user:
        return user.language_code

    return "uz"