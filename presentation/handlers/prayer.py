"""Prayer Times handler — complete implementation with FSM state."""

from aiogram import Router, F, types
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    KeyboardButton,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
)

from domain.prayer.service import (
    prayer_service,
    ALL_PRAYER_BUTTON_TEXTS,
    ASK_LOCATION_TEXT,
    CALCULATING_TEXT,
    ERROR_TEXT,
    REFRESH_TEXTS,
    CHANGE_LOC_TEXTS,
    MAIN_MENU_TEXTS,
)
from presentation.keyboards.main_menu import main_keyboard

# ── Import DB language lookup (with fallback) ─────────────────────────────────
try:
    from infrastructure.database.repositories import get_language as _db_get_lang
    _DB_AVAILABLE = True
except Exception:
    _DB_AVAILABLE = False


async def _get_lang(user_id: int, fallback: str = "uz") -> str:
    if not _DB_AVAILABLE:
        return fallback
    try:
        return await _db_get_lang(user_id) or fallback
    except Exception:
        return fallback


# ── Router ────────────────────────────────────────────────────────────────────
router = Router()


# ── FSM states ────────────────────────────────────────────────────────────────
class PrayerFSM(StatesGroup):
    waiting_location = State()


# ── Keyboard builders ─────────────────────────────────────────────────────────

_LOCATION_BTN: dict[str, str] = {
    "uz":     "📍 Lokatsiya yuborish",
    "uz_cyr": "📍 Локация юбориш",
    "en":     "📍 Send location",
    "ru":     "📍 Отправить локацию",
    "tr":     "📍 Konum gönder",
    "ar":     "📍 أرسل الموقع",
    "kk":     "📍 Орынды жіберу",
    "tg":     "📍 Мавқеатро фиристодан",
    "pl":     "📍 Wyślij lokalizację",
    "de":     "📍 Standort senden",
    "fr":     "📍 Envoyer la position",
    "id":     "📍 Kirim lokasi",
    "hi":     "📍 लोकेशन भेजें",
    "ur":     "📍 لوکیشن بھیجیں",
}

_MENU_BTN: dict[str, str] = {
    "uz":     "🏠 Asosiy menyu",
    "uz_cyr": "🏠 Асосий меню",
    "en":     "🏠 Main menu",
    "ru":     "🏠 Главное меню",
    "tr":     "🏠 Ana menü",
    "ar":     "🏠 القائمة الرئيسية",
    "kk":     "🏠 Басты мәзір",
    "tg":     "🏠 Менюи асосӣ",
    "pl":     "🏠 Menu główne",
    "de":     "🏠 Hauptmenü",
    "fr":     "🏠 Menu principal",
    "id":     "🏠 Menu utama",
    "hi":     "🏠 मुख्य मेनू",
    "ur":     "🏠 مین مینو",
}

_REFRESH_BTN: dict[str, str] = {
    "uz":     "🔄 Yangilash",
    "uz_cyr": "🔄 Янгилаш",
    "en":     "🔄 Refresh",
    "ru":     "🔄 Обновить",
    "tr":     "🔄 Yenile",
    "ar":     "🔄 تحديث",
    "kk":     "🔄 Жаңарту",
    "tg":     "🔄 Навсоз кардан",
    "pl":     "🔄 Odśwież",
    "de":     "🔄 Aktualisieren",
    "fr":     "🔄 Actualiser",
    "id":     "🔄 Perbarui",
    "hi":     "🔄 रिफ्रेश",
    "ur":     "🔄 تازہ کریں",
}

_CHANGE_LOC_BTN: dict[str, str] = {
    "uz":     "📍 Lokatsiyani o'zgartirish",
    "uz_cyr": "📍 Локацияни ўзгартириш",
    "en":     "📍 Change location",
    "ru":     "📍 Изменить локацию",
    "tr":     "📍 Konumu değiştir",
    "ar":     "📍 تغيير الموقع",
    "kk":     "📍 Орынды өзгерту",
    "tg":     "📍 Мавқеатро иваз кунед",
    "pl":     "📍 Zmień lokalizację",
    "de":     "📍 Standort ändern",
    "fr":     "📍 Changer d'emplacement",
    "id":     "📍 Ubah lokasi",
    "hi":     "📍 स्थान बदलें",
    "ur":     "📍 مقام تبدیل کریں",
}


def _loc_keyboard(lang: str) -> ReplyKeyboardMarkup:
    loc = _LOCATION_BTN.get(lang, _LOCATION_BTN["uz"])
    menu = _MENU_BTN.get(lang, _MENU_BTN["uz"])
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=loc, request_location=True)],
            [KeyboardButton(text=menu)],
        ],
        resize_keyboard=True,
        one_time_keyboard=True,
    )


def _result_keyboard(lang: str) -> ReplyKeyboardMarkup:
    refresh    = _REFRESH_BTN.get(lang, _REFRESH_BTN["uz"])
    change_loc = _CHANGE_LOC_BTN.get(lang, _CHANGE_LOC_BTN["uz"])
    menu       = _MENU_BTN.get(lang, _MENU_BTN["uz"])
    return ReplyKeyboardMarkup(
        keyboard=[
            [
                KeyboardButton(text=refresh),
                KeyboardButton(text=change_loc),
            ],
            [KeyboardButton(text=menu)],
        ],
        resize_keyboard=True,
    )


# ── Handlers ──────────────────────────────────────────────────────────────────

@router.message(F.text.in_(ALL_PRAYER_BUTTON_TEXTS))
async def prayer_button_handler(message: types.Message, state: FSMContext):
    """User pressed the Prayer Times menu button."""
    lang = await _get_lang(message.from_user.id)
    await state.set_state(PrayerFSM.waiting_location)
    await message.answer(
        ASK_LOCATION_TEXT.get(lang, ASK_LOCATION_TEXT["en"]),
        parse_mode="HTML",
        reply_markup=_loc_keyboard(lang),
    )


@router.message(F.location)
async def location_handler(message: types.Message, state: FSMContext):
    """User sent a GPS location — fetch and display prayer times."""
    lat    = message.location.latitude
    lon    = message.location.longitude
    uid    = message.from_user.id
    lang   = await _get_lang(uid)

    # Cache location for later refresh
    await state.update_data(lat=lat, lon=lon, lang=lang)
    await state.clear()   # exit FSM state, keep data

    thinking = await message.answer(
        CALCULATING_TEXT.get(lang, CALCULATING_TEXT["en"]),
        reply_markup=ReplyKeyboardRemove(),
    )

    data = await prayer_service.get_prayer_data(lat, lon, lang)
    await thinking.delete()

    if not data:
        await message.answer(
            ERROR_TEXT.get(lang, ERROR_TEXT["en"]),
            reply_markup=_loc_keyboard(lang),
        )
        return

    text = prayer_service.format_bot_message(data, lang)
    await message.answer(
        text,
        parse_mode="HTML",
        reply_markup=_result_keyboard(lang),
    )


@router.message(F.text.in_(REFRESH_TEXTS))
async def refresh_handler(message: types.Message, state: FSMContext):
    """User pressed Refresh — reuse cached location."""
    uid  = message.from_user.id
    lang = await _get_lang(uid)
    cached = await state.get_data()
    lat  = cached.get("lat")
    lon  = cached.get("lon")

    if lat is None or lon is None:
        # No cached location — ask again
        await state.set_state(PrayerFSM.waiting_location)
        await message.answer(
            ASK_LOCATION_TEXT.get(lang, ASK_LOCATION_TEXT["en"]),
            parse_mode="HTML",
            reply_markup=_loc_keyboard(lang),
        )
        return

    thinking = await message.answer(
        CALCULATING_TEXT.get(lang, CALCULATING_TEXT["en"]),
        reply_markup=ReplyKeyboardRemove(),
    )
    data = await prayer_service.get_prayer_data(lat, lon, lang)
    await thinking.delete()

    if not data:
        await message.answer(ERROR_TEXT.get(lang, ERROR_TEXT["en"]))
        return

    text = prayer_service.format_bot_message(data, lang)
    await message.answer(text, parse_mode="HTML", reply_markup=_result_keyboard(lang))


@router.message(F.text.in_(CHANGE_LOC_TEXTS))
async def change_location_handler(message: types.Message, state: FSMContext):
    """User wants to change location — ask for new one."""
    lang = await _get_lang(message.from_user.id)
    await state.set_state(PrayerFSM.waiting_location)
    await message.answer(
        ASK_LOCATION_TEXT.get(lang, ASK_LOCATION_TEXT["en"]),
        parse_mode="HTML",
        reply_markup=_loc_keyboard(lang),
    )


@router.message(F.text.in_(MAIN_MENU_TEXTS))
async def back_to_menu_handler(message: types.Message, state: FSMContext):
    """Return to main menu."""
    lang = await _get_lang(message.from_user.id)
    await state.clear()
    await message.answer(
        "🏠",
        reply_markup=main_keyboard(lang),
    )
