#!/usr/bin/env python3
"""Собирает финальный routines.json на русском.

- Переводит название рутины (Wake Up -> Пробуждение).
- Переводит названия упражнений по словарю.
- Присваивает категорию (утро, офис, поясница и т.п.).
- Пишет web/src/data/routines.json.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IN_JSON = ROOT / "web" / "src" / "data" / "routines.raw.json"
OUT_JSONS = [
    ROOT / "web" / "src" / "data" / "routines.json",
    ROOT / "miniapp" / "src" / "data" / "routines.json",
]

# name_en -> описание техники. Заполняется постепенно; для упражнений без
# описания приложение показывает плейсхолдер.
EXERCISE_DESCRIPTIONS: dict[str, str] = {
    "Bird Dog": (
        "Встань на четвереньки: ладони под плечами, колени под тазом. "
        "Одновременно вытяни правую руку вперёд и левую ногу назад до одной "
        "линии с корпусом. Держи спину ровной, не прогибайся в пояснице. "
        "На второй стороне поменяй руку и ногу."
    ),
    "Superman": (
        "Ляг на живот, руки вытяни вперёд. На выдохе одновременно оторви от "
        "пола руки, грудь и ноги, взгляд вниз, шея — продолжение позвоночника. "
        "Удерживай положение, дыши ровно, не задерживай дыхание."
    ),
    "Downward Dog": (
        "Из упора на четвереньках подними таз вверх, выпрямляя руки и ноги, "
        "чтобы тело образовало треугольник. Тянись пятками к полу, а грудью — "
        "к бёдрам. Колени можно слегка согнуть, спина остаётся длинной."
    ),
}

# slug -> (русское имя, короткое описание, категория)
ROUTINES_RU: dict[str, tuple[str, str, str]] = {
    "wake-up": ("Пробуждение", "Мягкая утренняя разминка, чтобы разбудить тело.", "morning"),
    "warm-up": ("Разогрев", "Быстро прогреть суставы перед активностью.", "morning"),
    "cool-down": ("Заминка", "Успокоить тело после нагрузки.", "recovery"),
    "sleep": ("Перед сном", "Расслабляющая практика перед сном.", "recovery"),
    "deep-relax": ("Глубокое расслабление", "Долгая мягкая практика на восстановление.", "recovery"),
    "quick-stretch": ("Быстрая растяжка", "Короткий блок общей растяжки.", "quick"),
    "lengthen": ("Удлинение", "Тянемся мягко и глубоко по всему телу.", "quick"),
    "detox": ("Разгрузка", "Скручивания и раскрытие для лёгкости.", "recovery"),
    "full-body": ("Всё тело", "Комплексная практика на всё тело.", "full-body"),
    "full-body-2": ("Всё тело · 2", "Ещё один комплекс на всё тело.", "full-body"),
    "expert": ("Продвинутый", "Длинная практика для опытных.", "full-body"),
    "expert-2": ("Продвинутый · 2", "Ещё один опытный комплекс.", "full-body"),
    "posture-reset": ("Осанка · сброс", "Быстро вернуть телу правильное положение.", "posture"),
    "posture-power": ("Осанка · сила", "Укрепление мышц осанки.", "posture"),
    "posture-stabilizer": ("Осанка · стабилизация", "Стабилизировать корпус и плечи.", "posture"),
    "tech-neck": ("Шея после ноутбука", "Разгрузить шею после экрана.", "office"),
    "desk-stretch": ("Растяжка за столом", "Короткая практика прямо на рабочем месте.", "office"),
    "standing-desk": ("Стоячий стол", "Разминка для тех, кто работает стоя.", "office"),
    "pelvic-tilt": ("Наклон таза", "Работа с положением таза и поясницей.", "back"),
    "lower-back": ("Поясница", "Снять напряжение с поясницы.", "back"),
    "lower-back-1": ("Поясница · 1", "Мягкий блок для поясницы.", "back"),
    "lower-back-2": ("Поясница · 2", "Средний блок для поясницы.", "back"),
    "lower-back-3": ("Поясница · 3", "Долгий блок для поясницы.", "back"),
    "lower-back-hybrid-1": ("Поясница · гибрид 1", "Растяжка + укрепление поясницы.", "back"),
    "lower-back-hybrid-2": ("Поясница · гибрид 2", "Растяжка + укрепление, дольше.", "back"),
    "back": ("Спина", "Мобильность и раскрытие спины.", "back"),
    "shoulders": ("Плечи", "Раскрытие плечевого пояса.", "upper"),
    "neck-1": ("Шея · 1", "Короткий блок для шеи.", "upper"),
    "neck-2": ("Шея · 2", "Средний блок для шеи.", "upper"),
    "neck-3": ("Шея · 3", "Долгий блок для шеи.", "upper"),
    "twists-wrists": ("Скручивания и запястья", "Мобильность корпуса и запястий.", "upper"),
    "arms": ("Руки", "Укрепление рук и плеч.", "upper"),
    "hips": ("Бёдра", "Раскрытие тазобедренных суставов.", "hips"),
    "hips-1": ("Бёдра · 1", "Мягкий блок на бёдра.", "hips"),
    "hips-2": ("Бёдра · 2", "Средний блок на бёдра.", "hips"),
    "hips-3": ("Бёдра · 3", "Долгий блок на бёдра.", "hips"),
    "long-hips-1": ("Бёдра · долгий 1", "Долгие удержания для бёдер.", "hips"),
    "long-hips-2": ("Бёдра · долгий 2", "Долгие удержания, глубже.", "hips"),
    "long-hips-3": ("Бёдра · долгий 3", "Долгие удержания, максимум.", "hips"),
    "hamstrings": ("Задняя поверхность", "Растяжка задней поверхности ног.", "legs"),
    "quads-1": ("Квадрицепсы", "Растяжка передней поверхности бедра.", "legs"),
    "splits": ("Шпагат", "Практика на шпагат.", "legs"),
    "squats": ("Приседания", "Сила и подвижность ног.", "legs"),
    "post-run-2": ("После бега", "Растяжка после пробежки.", "recovery"),
    "core": ("Кор", "Укрепление глубоких мышц корпуса.", "core"),
    "abs": ("Пресс", "Короткий блок на пресс.", "core"),
    "planks-1": ("Планки · 1", "Начальный блок планок.", "core"),
    "planks-2": ("Планки · 2", "Средний блок планок.", "core"),
    "planks-3": ("Планки · 3", "Продвинутый блок планок.", "core"),
    "planks-4": ("Планки · 4", "Максимальный блок планок.", "core"),
}

# Собственные программы поверх исходных данных Bend.
# (slug, имя, описание, категория, минуты, [name_en, ...])
EXTRA_ROUTINES: list[tuple[str, str, str, str, int, list[str]]] = [
    (
        "morning-five", "Утро за 5 минут",
        "Пять минут, чтобы проснуться и размяться.", "morning", 5,
        ["Cat Cow", "Downward Dog", "Upward Salute", "Forward Fold", "Side Bend", "Neck Roll"],
    ),
    (
        "morning-energy", "Энергия",
        "Бодрая разминка: разогнать кровь и суставы.", "morning", 6,
        ["Jumping Jacks", "Arm Circles", "Leg Swings", "Air Squats", "Lunge", "Downward Dog", "Upward Salute"],
    ),
    (
        "evening-unwind", "Вечерняя разгрузка",
        "Мягко снять напряжение дня перед отдыхом.", "recovery", 8,
        ["Child's Pose", "Knees Hugs", "Spinal Twist", "Reclined Butterfly", "Happy Baby", "Legs-up-wall"],
    ),
    (
        "neck-shoulders-sos", "SOS: шея и плечи",
        "Быстрая помощь зажатым шее и плечам.", "office", 5,
        ["Chin Retractions", "Ear-to-Shoulder", "Neck Rotation", "Shoulder Rolls", "Scalene Stretch", "Bear Hug"],
    ),
    (
        "wrists-forearms", "Запястья и предплечья",
        "Разгрузка рук после клавиатуры и телефона.", "office", 4,
        ["Wrist Extension", "Wrist Flexion", "Forearm Stretch", "Cactus Arms", "Overhead Reach"],
    ),
    (
        "chest-open", "Раскрытие груди",
        "Раскрыть грудной отдел и вернуть плечи назад.", "posture", 6,
        ["Doorway Pecs", "Chest Opener", "Cactus Arms", "Puppy Pose", "Cat Cow", "Twisted Sphinx"],
    ),
    (
        "hips-after-sitting", "Бёдра после сидения",
        "Раскрыть таз после долгого дня на стуле.", "hips", 7,
        ["Kneeling Psoas", "Lizard Pose", "Pigeon", "90/90", "Butterfly", "Happy Baby"],
    ),
    (
        "splits-prep", "Подготовка к шпагату",
        "Постепенная дорога к продольному шпагату.", "legs", 10,
        ["Lunge", "Kneeling Psoas", "Lying Hamstring", "Hurdler", "Seated Straddle", "Front Split"],
    ),
    (
        "runners-legs", "Ноги бегуна",
        "Икры, квадрицепсы и задняя поверхность после нагрузки.", "legs", 7,
        ["Standing Quad", "Leaning Calf", "Seated Hamstring", "Lunge", "Lying Figure Four", "Toe Touch"],
    ),
    (
        "feet-ankles", "Стопы и голеностопы",
        "Подвижность стоп, икр и голеностопов.", "legs", 5,
        ["Toe Squat", "Thunderbolt", "Leaning Calf", "Knee Circles", "Squat Stretch"],
    ),
    (
        "balance-core", "Баланс и кор",
        "Устойчивость, равновесие и глубокие мышцы корпуса.", "core", 7,
        ["Bird Dog", "Dead Bug", "Hollow Body", "Single Arm Plank", "V-Sit", "Bridge"],
    ),
]

CATEGORIES: dict[str, str] = {
    "morning": "Утро",
    "recovery": "Восстановление",
    "quick": "Быстрые",
    "full-body": "Всё тело",
    "posture": "Осанка",
    "office": "Офис",
    "back": "Спина и поясница",
    "upper": "Верх тела",
    "hips": "Бёдра",
    "legs": "Ноги",
    "core": "Кор и пресс",
}

EXERCISES_RU: dict[str, str] = {
    "90/90": "90/90",
    "Air Squats": "Приседания без веса",
    "Airplane": "Самолётик",
    "Aquaman": "Аквамен",
    "Arm Circles": "Круги руками",
    "Arm Swings": "Махи руками",
    "Bear Hug": "Медвежьи объятия",
    "Bent Arm Pike": "Складка с согнутыми руками",
    "Bicycle Crunch Hold": "Удержание велосипеда",
    "Bird Dog": "Птица-собака",
    "Bird Dog Plank": "Планка «птица-собака»",
    "Bridge": "Мост",
    "Bridge Leg Lift": "Мост с подъёмом ноги",
    "Bulldog": "Бульдог",
    "Butterfly": "Бабочка",
    "Cactus Arms": "Руки-кактус",
    "Cat Cow": "Кошка-корова",
    "Chest Opener": "Раскрытие груди",
    "Child's Pose": "Поза ребёнка",
    "Chin Retractions": "Втягивание подбородка",
    "Crunch Hold": "Удержание скручивания",
    "Curtsy Lunge Hold": "Реверанс-выпад",
    "Dead Bug": "Мёртвый жук",
    "Dip Hold": "Удержание отжимания на трицепс",
    "Diver": "Ныряльщик",
    "Doorway Pecs": "Грудные в дверном проёме",
    "Double Pigeon": "Двойной голубь",
    "Downward Dog": "Собака мордой вниз",
    "Ear-to-Shoulder": "Ухо к плечу",
    "Elbow Pike": "Складка на локтях",
    "Elbow Plank": "Планка на локтях",
    "Elbow Plank Leg Lift": "Планка на локтях с подъёмом ноги",
    "Elbow Side Plank": "Боковая планка на локте",
    "Elbow Side Plank Leg Lift": "Боковая планка на локте с подъёмом ноги",
    "Folded Butterfly": "Сложенная бабочка",
    "Forearm Stretch": "Растяжка предплечья",
    "Forward Fold": "Наклон вперёд",
    "Frog Pose": "Поза лягушки",
    "Front Split": "Продольный шпагат",
    "Hamstring Pulls": "Подтягивание задней поверхности",
    "Hand Plank": "Планка на прямых руках",
    "Hand Plank Leg Lift": "Планка с подъёмом ноги",
    "Hand Side Plank": "Боковая планка на руке",
    "Hand Side Plank Leg Lift": "Боковая планка с подъёмом ноги",
    "Happy Baby": "Счастливый ребёнок",
    "Hollow Body": "Лодочка",
    "Hurdler": "Барьерист",
    "Jumping Jacks": "Прыжки «звёздочка»",
    "Knee Circles": "Круги коленями",
    "Kneeling Psoas": "Растяжка подвздошной на колене",
    "Kneeling Quad": "Квадрицепс на колене",
    "Knees Hugs": "Обнимание коленей",
    "Knees-to-chest": "Колени к груди",
    "Lateral Lunge": "Боковой выпад",
    "Leaning 90/90": "Наклонное 90/90",
    "Leaning Calf": "Растяжка икры с наклоном",
    "Leg Lift": "Подъём ноги",
    "Leg Swings": "Махи ногой",
    "Legs-up-wall": "Ноги к стене",
    "Lizard Pose": "Поза ящерицы",
    "Locust Pose": "Поза саранчи",
    "Lunge": "Выпад",
    "Lying Figure Four": "«Четвёрка» лёжа",
    "Lying Hamstring": "Растяжка задней лёжа",
    "Lying Quad Stretch": "Растяжка квадрицепса лёжа",
    "Lying Side Leg Raise": "Подъём ноги на боку",
    "Narrow Push Up Hold": "Удержание узкого отжимания",
    "Narrow Squat Hold": "Удержание узкого приседа",
    "Neck Extension": "Разгибание шеи",
    "Neck Flex": "Сгибание шеи",
    "Neck Flexion": "Сгибание шеи",
    "Neck Laterals": "Наклоны шеи в стороны",
    "Neck Roll": "Круги шеей",
    "Neck Rotation": "Повороты шеи",
    "One Arm Hug": "Обнимание одной рукой",
    "Overhead Reach": "Вытягивание вверх",
    "Overhead Tricep": "Трицепс через голову",
    "Pelvic Tilt Press": "Наклон таза с прижатием",
    "Pigeon": "Поза голубя",
    "Pike": "Складка",
    "Pistol Squat Hold": "Удержание «пистолета»",
    "Plow": "Плуг",
    "Puppy Pose": "Поза щенка",
    "Push Up Hold": "Удержание отжимания",
    "Quad Stretch": "Растяжка квадрицепса",
    "Rag Doll": "Тряпичная кукла",
    "Reclined Butterfly": "Бабочка лёжа",
    "Reverse Butterfly": "Обратная бабочка",
    "Reverse Lunge": "Обратный выпад",
    "Reverse Plank": "Обратная планка",
    "Reverse Plank Leg Lift": "Обратная планка с подъёмом ноги",
    "Reverse Shoulder": "Обратная растяжка плеча",
    "Saddle Pose": "Поза седла",
    "Scalene Stretch": "Растяжка лестничных мышц",
    "Scapula Stretch": "Растяжка лопаток",
    "Seated Figure Four": "«Четвёрка» сидя",
    "Seated Fold": "Наклон сидя",
    "Seated Hamstring": "Растяжка задней сидя",
    "Seated Straddle": "Складка ноги в стороны",
    "Seated Twist": "Скручивание сидя",
    "Shoulder Cross": "Плечо через грудь",
    "Shoulder Opener": "Раскрытие плеч",
    "Shoulder Rolls": "Круги плечами",
    "Shoulder Stand": "Стойка на плечах",
    "Side Bend": "Наклон в сторону",
    "Side Lunge": "Боковой выпад",
    "Side Lunge Hold": "Удержание бокового выпада",
    "Single Arm Plank": "Планка на одной руке",
    "Single Knee-to-Chest": "Одно колено к груди",
    "Spiderman Push Up Hold": "Удержание отжимания «человек-паук»",
    "Spinal Twist": "Скручивание позвоночника",
    "Split Lunge Hold": "Удержание сплит-выпада",
    "Squat Hold": "Удержание приседа",
    "Squat Stretch": "Растяжка в приседе",
    "Standing Frog": "Лягушка стоя",
    "Standing Lunge Twist": "Выпад стоя со скручиванием",
    "Standing Quad": "Квадрицепс стоя",
    "Sumo Squat Hold": "Удержание сумо-приседа",
    "Superman": "Супермен",
    "Thunderbolt": "Ваджрасана",
    "Toe Squat": "Присед на носках",
    "Toe Touch": "Касание пальцев ног",
    "Toe Touch Hold": "Удержание касания пальцев",
    "Toe Touch Twist": "Касание пальцев со скручиванием",
    "Trunk Rotation": "Вращение корпусом",
    "Trunk Twist": "Скручивание корпуса",
    "Twisted Sphinx": "Скрученный сфинкс",
    "Upward Dog": "Собака мордой вверх",
    "Upward Salute": "Приветствие вверх",
    "V-Sit": "V-сидя",
    "Wall Arms": "Руки у стены",
    "Wall Dog": "Собака у стены",
    "Wall Handstand": "Стойка на руках у стены",
    "Wall Pecs": "Грудные у стены",
    "Wall Pike": "Складка у стены",
    "Wall Plank": "Планка у стены",
    "Wall Sit": "Стульчик у стены",
    "Wide Leg Bend": "Наклон с широкими ногами",
    "Wrist Extension": "Разгибание запястий",
    "Wrist Flexion": "Сгибание запястий",
}


def main() -> None:
    raw = json.loads(IN_JSON.read_text(encoding="utf-8"))
    out = []
    missing_ex = set()
    for r in raw:
        slug = r["slug"]
        title_ru, desc_ru, category = ROUTINES_RU.get(
            slug, (r["title"], r["description"], "quick")
        )
        exercises = []
        for e in r["exercises"]:
            ru = EXERCISES_RU.get(e["name"])
            if ru is None:
                missing_ex.add(e["name"])
                ru = e["name"]
            ex = {
                "name": ru,
                "name_en": e["name"],
                "image": e["image"],
            }
            desc = EXERCISE_DESCRIPTIONS.get(e["name"])
            if desc:
                ex["description"] = desc
            exercises.append(ex)
        cover = exercises[0]["image"] if exercises else None
        out.append(
            {
                "slug": slug,
                "title": title_ru,
                "description": desc_ru,
                "category": category,
                "duration_min": r["duration_min"],
                "cover": cover,
                "exercises": exercises,
            }
        )
    # Собственные программы: картинки берём из индекса упражнений исходных данных
    image_by_name: dict[str, str] = {}
    for r in raw:
        for e in r["exercises"]:
            image_by_name.setdefault(e["name"], e["image"])
    for slug, title_ru, desc_ru, category, minutes, names in EXTRA_ROUTINES:
        exercises = []
        for name in names:
            if name not in image_by_name:
                raise SystemExit(f"{slug}: неизвестное упражнение {name!r}")
            ru = EXERCISES_RU.get(name)
            if ru is None:
                missing_ex.add(name)
                ru = name
            ex = {"name": ru, "name_en": name, "image": image_by_name[name]}
            desc = EXERCISE_DESCRIPTIONS.get(name)
            if desc:
                ex["description"] = desc
            exercises.append(ex)
        out.append(
            {
                "slug": slug,
                "title": title_ru,
                "description": desc_ru,
                "category": category,
                "duration_min": minutes,
                "cover": exercises[0]["image"],
                "exercises": exercises,
            }
        )

    result = {"categories": CATEGORIES, "routines": out}
    for out_json in OUT_JSONS:
        out_json.write_text(
            json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"Wrote {out_json}")
    print(f"Routines: {len(out)}")
    if missing_ex:
        print("Missing translations:", sorted(missing_ex))


if __name__ == "__main__":
    main()
