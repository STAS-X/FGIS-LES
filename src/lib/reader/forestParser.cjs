const anyReader = require('any-text');
const { DBFFile } = require('dbffile');

//const e = require('express');

const fs = require('fs');
const path = require('path');
const { isStringEqual } = require('../helpers/helpers.cjs');

const searchStep = {
    stepTitul: 'TITUL',
    stepKvartal: 'KVARTAL',
    stepFeature: 'FEATURE',
    steSummary: 'SUMMARY',
};

const featureType = {
    main: 'MAIN_FEATURE',
    addition: 'ADDITION_FEATURE',
    summary: 'SUMMARY',
    final: 'FINAL',
    header: 'HEADER',
    kvartal: 'KVARTAL',
};

const composeType = {
    culture: 'CULTURE',
    activity: 'ACTIVITY',
    object: 'OBJECT',
};

const forestCauseCrop = [
    { mask: 'низ.*пожар.*', code: 1 },
    { mask: 'верх.*пожар.*', code: 2 },
    { mask: 'подзем.*пожар.*', code: 3 },
    { mask: 'ветролом.*', code: 4 },
    { mask: 'бурелом.*', code: 5 },
    { mask: 'снеголом.*', code: 6 },
    { mask: 'заболачив.*', code: 7 },
    { mask: 'высых.*', code: 8 },
    { mask: 'вымок.*', code: 9 },
    { mask: 'вымерз.*', code: 10 },
    { mask: 'фитовред.*', code: 11, type: 'disease' },
    { mask: 'эндовред.*', code: 12, type: 'endo' },
    { mask: 'поврежд.*лос.*', code: 13, type: 'pets' },
    { mask: 'домаш.*живот.*', code: 14, type: 'pets' },
    { mask: 'механич.*повреж.*', code: 15 },
    { mask: 'промыш.*выброс.*', code: 16 },
    { mask: 'рекреац.*нагруз.*', code: 17 },
    { mask: 'наруш.*режим.*', code: 18 },
    { mask: 'экол.*фактор.*', code: 19 },
    { mask: 'наруш.*агротех.*', code: 20 },
    { mask: 'наруш.*технол.*', code: 21 },
    { mask: 'заниж.*числ.*', code: 22 },
    { mask: 'несоот,*тлу.*', code: 23 },
    { mask: 'отсутст.*уход.*', code: 24 },
    { mask: 'некач.*уход.*', code: 25 },
    { mask: 'заглуш.*лист.*пород.*', code: 26 },
    { mask: 'потрав.*животн.*', code: 27 },
    { mask: 'поврежд.*пожар.*', code: 28 },
    { mask: 'неблаг.*климат.*', code: 29 },
    { mask: 'недостат.*интенсив.*', code: 30 },
];

const forestPets = {
    disease: [
        { mask: 'корнев.*губк.*', code: 1 },
        { mask: 'сосн.*губк.*', code: 2 },
        { mask: 'сосн.*верт.*', code: 3 },
        { mask: 'настоящ.*трут.*', code: 4 },
        { mask: 'елов.*губк.*', code: 5 },
        { mask: 'рак.*серян*', code: 6 },
        { mask: 'ложн.*трут.*', code: 7 },
        { mask: 'шют*', code: 8 },
    ],
    endo: [
        { mask: 'листогрыз.*', code: 11 },
        { mask: 'короед.*', code: 21 },
        { mask: 'лубоед.*', code: 22 },
        { mask: 'усач*', code: 23 },
        { mask: 'златк*', code: 24 },
        { mask: 'хрущ.*май.*', code: 31 },
    ],
    pets: [
        { mask: 'обкус.*верш.*', code: 32 },
        { mask: 'обкус.*боков.*', code: 33 },
        { mask: 'погрыз.*коры.*', code: 34 },
    ],
};

const lotAdditionalData = [
    { value: 'Класс пожарной опасности ', isElement: true },
    { value: 'подлесок ', isElement: true },
    { value: 'Склон ', isElement: true },
    { value: 'подрост ', isElement: true },
    {
        value: 'повреждение |повреждения насаждения ',
        name: 'повреждение ',
        isElement: false,
    },
    {
        value: 'культуры-|культуры |год создания л/к ',
        name: 'культуры ',
        isElement: false,
    },
    { value: 'год вырубки ', isElement: true },
    { value: 'Рекреац.хар-ка ', isElement: true },
    { value: 'класс ', name: 'Рекреац.хар-ка ', isElement: false },
    { value: 'особенности ', isElement: true },
    { value: 'селекционная оценка ', isElement: true },
    { value: 'Ягодники ', isElement: true },
    { value: 'ОЗУ ', isElement: true },
    { value: 'ООПТ ', isElement: true },
    {
        value: 'СОСТАВ |ПОЛНОТА |ТЛУ ВАРЬИРУЕТ|ТИП ЛЕСА |ТРЕБУЕТСЯ ПРОВЕДЕНИЕ |НАСАЖДЕНИЕ |НА ПЛОЩАДИ |РАЗМЕЩЕНИЕ |ВЫСОТА |ДИАМЕТР |ТИП ЛЕСА |ПЛОЩАДЬ |БОНИТЕТ |РЕКОМЕНД.|УЧ-КИ ЛЕСА ВОКРУГ |УЧ-КИ ЛЕСА ДО |УЧ-КИ ЛЕСА ВОКР НАСЕЛ.|УЧ.ЛЕСА ВОКР.|ЧАСТИЧНО |РЕКОМ.К|РЕКОМЕНДАЦИИ|ПРОВЕДЕНО СОД|ПЛС.ВДОЛЬ |ПОЛОСЫ ВДОЛЬ РЕК|В ВЫДЕЛЕ |ЗАГРЯЗНЕНИЕ БЫТОВЫМИ ',
        name: 'особенности ',
        isElement: false,
    },
    { value: 'НЕ ПЛОД', name: 'сады ', isElement: false },
    { value: 'ЛЕСОХОЗЯЙСТВЕННАЯ', name: 'хар-ка ', isElement: false },
];

const lotActivities = [
    {
        mask: 'добр.*выб.*руб.*|двр',
        code: 1260,
        hasValue: true,
        hasRtk: true,
    },
    {
        mask: 'обновит.*руб.*',
        code: 1269,
        hasValue: true,
        hasRtk: true,
    },
    {
        mask: 'выб.*санруб.*|выб.*руб.*',
        code: 1605,
        hasValue: true,
        hasRtk: true,
    },
    { mask: 'руб.*ед.*дер.*', hasValue: true, hasRtk: true, code: 1301 },
    { mask: 'посл.*пр.*выб.*', code: 1223 },
    {
        mask: 'ус.*мест.*отд.*',
        code: 2341,
    },
    {
        mask: 'прох.*оч.*|проход.*',
        code: 1440,
        isCodeModify: true,
        hasValue: true,
        hasRtk: true,
    },
    {
        mask: 'прореж.*оч.*|прореживание.*',
        code: 1430,
        isCodeModify: true,
        hasValue: true,
        hasRtk: true,
    },
    {
        mask: 'проч.*оч.*|прочистк.*',
        code: 1420,
        isCodeModify: true,
        hasValue: true,
        hasRtk: true,
    },
    {
        mask: 'рубка.*перефор.*',
        code: 1445,
        hasValue: true,
        hasRtk: true,
    },
    {
        mask: 'расчистка',
        code: 4301,
        hasValue: true,
        hasRtk: true,
    },
    {
        mask: 'разрубка',
        code: 1845,
        hasValue: true,
        hasRtk: true,
    },
    {
        mask: 'спл.*сан.*',
        code: 1601,
        hasValue: true,
        hasRtk: true,
    },
    {
        mask: 'сплош.*руб.*|руб.*сплош.*',
        code: 1211,
        hasValue: true,
        hasRtk: true,
    },
    {
        mask: 'постеп.*руб.*',
        code: 1212,
        hasValue: true,
        hasRtk: true,
    },
    { mask: 'равн.*пост.*', code: 1222, hasValue: true, hasRtk: true },
    { mask: 'прф-ср.*двух.*', code: 1544, hasValue: true, hasRtk: true },
    {
        mask: 'ремонт.*дор.*|разр.*под.*дор.*',
        code: 7131,
    },
    {
        mask: 'ест.*лесов.*|естеств.*лесоз.*|.*теств.*вос.*|естеств.*воз.*|естеств.*.зар.*|сод.*ест.*возоб.*',
        code: 3285,
        hasValue: true,
        hasRtk: true,
    },
    { mask: 'уст.*корм.*|уст.*подк.*пл.*|соз.*корм.*пол.*', code: 2418 },
    {
        mask: 'иск.*лесов.*|иск.*вос.*',
        code: 3222,
    },
    {
        mask: 'допол.*культ.*|л.*культ.*|доп.н.*сомк.*',
        code: 3281,
    },
    {
        mask: 'доп.*л/к.*круп.*мер.*|доп.*н/с.*л/к.*|частич.*л.*к',
        code: 3211,
    },
    {
        mask: 'к.*р.*под.*пол.*',
        code: 3212,
    },
    {
        mask: 'сохр.*п.?др.*|рубка.*сохр.*п.*',
        code: 3272,
    },
    {
        mask: 'сод.*непокр.*|провед.*сод.*',
        code: 3275,
    },
    {
        mask: 'руб.*мол.*под.*',
        code: 1551,
    },
    {
        mask: 'подсочка',
        code: 2102,
    },
    {
        mask: 'ух.*за.*культ.*|уход.*за л.*к|лесов.*ух.*|ремонт.*культ.*',
        code: 3265,
        isCodeModify: true,
    },
    {
        mask: 'ух.*за.*цел.*мол.*|ух.*за.*мол.*|ух.*за.*плант.*',
        code: 3263,
        isCodeModify: true,
    },
    {
        mask: 'ух.*за.*подр.*|ух.*за.*п.?др.*яр.',
        code: 3273,
    },
    {
        mask: 'минерализ.*',
        code: 3271,
    },
    {
        mask: 'созд.*мин.*пол.*',
        code: 6233,
    },
    {
        mask: 'освет.*оч.*|осветление.*',
        hasValue: true,
        code: 1410,
        isCodeModify: true,
    },
    {
        mask: 'оч.*захл.*|уб.*захлам.*|уб.*зах.*',
        code: 1881,
    },
    { mask: 'комб.*лесов.*', code: 3221, hasValue: false, hasRtk: false },
    {
        mask: 'агротех.*уход.*',
        hasRtk: true,
        code: 3261,
    },
];

const lotProtectZoneOzu = [
    {
        name: 'Уч. л. вок. сан., дет. лаг., дом. отд., пан., тур. баз и др. леч. и озд. уч.|Уч.*лес.*вокр.*сан.*|Уч.*лес.*вокр.*лаг.*',
        code: 83,
    },
    {
        name: 'ВОДООХРАН.*ЗОН.*ПРИБРЕЖ.*ПОЛОС.*|Водоохран.*зон.*вод.*об.*',
        code: 123,
    },
    {
        name: 'Берегозащ.*почвозащ.*уч.*лес.*расп.*вд.*вод.*|Берегозащит.*уч.*лес.*',
        code: 63,
    },
    { name: 'ЛЕСОСЕМ.*ПЛАНТАЦ.*|ПОСТОЯН.*ЛЕСОСЕМ.*УЧ.*КИ', code: 323 },
    {
        name: 'Опушки.*грани.*с.*безлесн.*пространств.*|Опушки лес.*примыкающ.*к.*дорог.*|Опушки лес.*по границ.*безлесн.*пространств.*|Опушки лес.*гранич.*безлес.*простр.*',
        code: 13,
    },
    {
        name: 'Полосы.*лес.*по.*берег.*рек или иных водн.*объект.*заселен.*бобр.*|Полос.*лес.*по берег.*рек.*заселен.*бобр.*|ПОЛОСЫ.*ЛЕСОВ.*ПО.*БЕРЕГ.*РЕК.*ЗАСЕЛ.*БОБР.*',
        code: 253,
    },
    { name: 'На.*площ.*декорат.*пос', code: 483 },
    {
        name: 'Другие ОЗУ|ДРУГИЕ ВИД.*ОЗУ|ДРУГИЕ.*ОСОБО.*ЗАЩИТНЫЕ.*УЧ.*КИ.*ЛЕС.*|Другие особо.*защит.*',
        code: 7,
    },
    {
        name: 'Небольш.*уч.*к.*лес.*располож.*среди.*безлес.*прост.*|Уч.*ки.*лес.*расположен.*безлес.*простран.*',
        code: 23,
    },
    {
        name: 'Уч.*ки.*лес.*налич.*релик.*энд.?м.*раст.*',
        code: 144,
    },
    {
        name: 'ЛЕС.*В.*ОХР.*ЗОН.*ГОС.*ПР.*ЗАПОВ.*',
        code: 543,
    },
    { name: 'ПОЧВОЗАЩ.*УЧ.*КИ.*ЛЕС.*ВДОЛЬ.*СКЛ.*ОВР.*', code: 105 },
    { name: 'Уч.*ки.*лес.*с.*налич.*ценн.*древ.*пород.*', code: 143 },
    { name: 'Плюс.*насажд.*', code: 333 },
    { name: 'Медонос.*уч.*ки.*лес.*|Насажден.*медонос.*', code: 313 },
    { name: 'Лес.*памят.*природ.*|Памятник.*природ.*', code: 423 },
    { name: 'Особ.*охран.*част.*гос.*природ.*заказ.*', code: 133 },
    {
        name: 'Уч.*лес.*вокр.*нас.*пун.*|ВОКР.*СЕЛ.*НАС.*ПУНКТ.*САД.*ТОВ.*',
        code: 103,
    },
    {
        name: 'Уч.*лес.*вокруг.*глухар.*ток.*',
        code: 113,
    },
];

const lotAdditionalActivities = [
    { composition: 'Вырубка', additionalText: 'пней', name: 'год вырубки' },
    { composition: 'Прогалина', additionalText: 'пней', name: 'год вырубки' },
];

const lotExtraProtectZone = [
    {
        name: 'Зеленые зоны|зелёные зоны|Лесопарк.*част.*зелен.*зон|Лес.*распол.*зелен.*зонах|ЛЕСОХОЗЯЙСТ.*ЧАСТ.*ЗЕЛЕНЫХ.*ЗОН',
        code: 131802,
    },
    {
        name: 'Лесопарков.*зон.?|Лес.*распол.*лесопарк.*зонах|ЛЕСОПАРКОВАЯ ЧАСТЬ ЗЕЛЕНЫХ ЗОН',
        code: 131801,
    },
    { name: '1 И 2 пояс.*зон.*сан.*охр.*вод.*', code: 131900 },
    { name: '1 И 2 зон.*окр.*сан.*охр.*кур.*', code: 132000 },
    {
        name: 'Лес.*располож.*водоохр.*зонах|Водоохранные леса|Запретные полосы вдоль водных объектов|Запр.*пол.*лесов.*расп.*вд.*вод.*|Леса водоохранных зон|Леса.*располож.*водоох.*зон.*',
        code: 110201,
    },
    {
        name: 'ЗАПР.ПОЛ.ЛЕС.ВДОЛЬ ВОД.ОБЪЕКТ.|Запр.*пол.*лес.*вдоль.*вод.*|Запр.*пол.*вдол.*вод.*об.*',
        code: 110100,
    },
    {
        name: 'ЗАПРЕТ.*ПОЛОС.*ВДОЛЬ.*НЕРЕСТ.*РЕК.*',
        code: 110200,
    },

    {
        name: 'ЛЕСА,РАСПОЛ.В ЗАЩ.ПОЛОС.ЛЕСОВ|Лес.*располож.*защит.*полос.*|Защитные полосы вдоль дорог|ЗАЩИТ.ПОЛОСЫ ВДОЛЬ ДОРОГ|Защит.*придорож.*полос.*лес',
        code: 120800,
    },

    {
        name: 'Защ. пол. лесов, расп.вд жел. пут. общ. пол|Защитные полосы,лесов расп.вд а.?д и ж.?д|Защитн.полосы вдоль ж.?д и а.?д|защит.полосы лесов.*расп.*вд.*ж.?д и а.?д|Защитные полосы вдоль авт.*и жел.*дорог|Защитные полосы лесов.*расп.*вдоль.*ж.?д путей  и а.?д|Защит.*полос.*лес.*располож.*вдоль.*железнодор.*пут.*общ.*польз.*',
        code: 130800,
    },
    { name: 'Эксплуатационные леса', code: 204100 },
];

const lotExtraLandType = [
    {
        value: 'фонд.*руб.*',
        short: 'Фонд рубок',
        type: 'лесные земли',
        isPreview: true,
        code: '1509',
    },
    {
        value: 'груп.*выбор.*руб.*',
        short: 'выборочные рубки',
        type: 'лесные земли',
        isPreview: true,
        code: '1509',
    },

    {
        value: 'Земли рекульт.*',
        short: 'Земли рекультивации',
        type: 'нелесные земли',
        isPreview: true,
        code: '1512',
    },

    {
        value: 'Естест.*возобнов.*|Естест.*происхожд.*|Насажд.*естеств.*происх.*|Нас.*ест.*|возобновление',
        type: 'лесные земли',
        short: 'Естествен. происхожд.',
        isPreview: true,
        tier: 5,
        code: '1101',
    },

    {
        value: 'Пастбищ.*',
        short: 'Пастбище',
        type: 'нелесные земли',
        isPreview: true,
        code: '2103',
    },
    {
        value: 'Кордон.?|Кордон.*лесной',
        type: 'нелесные земли',
        isPreview: true,
        code: '2402',
    },
    { value: 'Ремизы', type: 'нелесные земли', code: '1520' },
    {
        value: 'Кордоны',
        type: 'нелесные земли',
        code: '2402',
    },
    {
        value: 'Лагеря отдыха',
        type: 'нелесные земли',
        code: '2412',
    },
    {
        value: 'Склад лесной',
        type: 'нелесные земли',
        code: '2404',
    },
    {
        value: 'Питомник лесной',
        type: 'нелесные земли',
        code: '1340',
    },
    {
        value: 'Усадьб.+|Усадьба ведомств.',
        short: 'Усадьба',
        type: 'нелесные земли',
        isPreview: true,
        code: '2401',
    },

    {
        value: 'Разрыв.*противопож.*|Противопож.*разрыв.*|Разрыв',
        short: 'Разрыв против.пожар.',
        type: 'нелесные земли',
        isPreview: true,
        code: '2320',
    },
    {
        value: 'Карьеры',
        type: 'нелесные земли',
        code: '2540',
    },
    {
        value: 'Стоянки транспорта',
        short: 'Стоянка транс.',
        type: 'нелесные земли',
        code: '2423',
    },
    {
        value: 'Трассы мелиоративные',
        short: 'Трасса мелиор.',
        type: 'нелесные земли',
        code: '2556',
    },
    {
        value: 'Дороги полев.*лес.*',
        short: 'Дорога лесная',
        type: 'нелесные земли',
        isPreview: true,
        code: '2307',
    },
    {
        value: 'Дорог.*авт.*грунт.*|Автомоб.*дорог.+',
        short: 'Дорога грунт.',
        type: 'нелесные земли',
        isPreview: true,
        code: '2303',
    },
    {
        value: 'Дорога автомоб.*иск.*покр.*|Автом.*иск.*покр.*',
        short: 'Дорога автом. иск.пок.',
        type: 'нелесные земли',
        isPreview: true,
        code: '2320',
    },
    {
        value: 'Дорога лесная|Дорога|Дороги',
        short: 'Дорога лесная',
        type: 'нелесные земли',
        code: '2308',
    },
    {
        value: 'Питомники лесные',
        type: 'нелесные земли',
        code: '1300',
    },
    {
        value: 'Сад.?|Коллектив.*сад.?',
        type: 'лесные земли',
        short: 'Сады',
        isPreview: true,
        tier: 3,
        code: '1343',
    },
    {
        value: 'старый сухостой',
        short: 'Сухостой',
        type: 'лесные земли',
        tier: 11,
        code: '1101',
    },
    { value: 'Линия связи', type: 'нелесные земли', code: '2549' },
    {
        value: 'Плантация|Питомник',
        type: 'лесные земли',
        code: '1341',
    },
    {
        value: 'Дендропарк',
        type: 'лесные земли',
        code: '1343',
    },
    {
        value: 'Культ.*лесн.|лесные.*культ.|Насажден.*с.*лес.*культ.|Нас.*ест.*с.*прим.*л.?к|Насажд.*с.*прим.*л.?к|Насажд.*с',
        short: 'Культуры лесные',
        type: 'лесные земли',
        tier: 5,
        isPreview: true,
        code: '1108',
    },
    {
        value: 'Культ.*с.*культ.*под.*пол.|культ.*под.*полог.',
        short: 'Насажд.с культ.п.п.',
        type: 'лесные земли',
        isPreview: true,
        tier: 2,
        code: '1114',
    },
    {
        value: 'Наc.*с.*культ.*под.*пол.|Нас.*с.*культ.*под.|Насажд.*с.*л/к.*под.*пол.',
        short: 'Насажд.с культ.п.п.',
        type: 'лесные земли',
        isPreview: true,
        tier: 2,
        code: '1107',
    },
    {
        value: 'Несомк.*к.*под.*пол.',
        short: 'Культуры н/с под п.',
        type: 'лесные земли',
        isPreview: true,
        tier: 6,
        code: '1201',
    },
    {
        value: 'Культур.*реконструк.*',
        short: 'Культуры созд.рек.',
        type: 'лесные земли',
        isPreview: true,
        code: '1109',
    },
    {
        value: 'Культуры н/с|Культуры несомк.|Несомк.*л/к|несомк.*культ.',
        short: 'Культуры н/с',
        type: 'лесные земли',
        isPreview: true,
        code: '1201',
    },
    {
        value: 'Насажд.*расстр.*руб.',
        short: 'Насажд. расст.руб.',
        type: 'лесные земли',
        isPreview: true,
        code: '1103',
    },
    {
        value: 'Насажд.*с.*пород.*иск.*пр.|Насажд.*с*пород.*иск.',
        short: 'Насажд. пор.иск.пр.',
        type: 'лесные земли',
        isPreview: true,
        code: '1106',
    },
    {
        value: 'Насажд.*из.*подр.',
        short: 'Насажд.из подр.',
        type: 'лесные земли',
        isPreview: true,
        code: '1102',
    },

    {
        value: 'Прогалина',
        type: 'лесные земли',
        hasMR: true,
        code: '1510',
    },
    {
        value: 'Несомк.*к.*рекон.',
        short: 'Насажд. н/с рек.',
        type: 'лесные земли',
        isPreview: true,
        tier: 7,
        code: '1202',
    },
    {
        value: 'Несомк.*к.*непок.*пл.',
        short: 'Насажд. л/к непок.пол.',
        type: 'лесные земли',
        isPreview: true,
        tier: 4,
        code: '1201',
    },

    {
        value: 'Насажд.*созд.*рек.',
        short: 'Насажд. соз.рек.',
        type: 'лесные земли',
        isPreview: true,
        code: '1105',
    },
    {
        value: 'Единичные деревья',
        type: 'лесные земли',
        tier: 9,
        code: '1101',
    },
    {
        value: 'Текущая лесосека|Лесосека',
        short: 'Лесосека',
        type: 'лесные земли',
        code: '1507',
    },
    {
        value: 'Вырубка|постепенные рубки|пройдено выборочной рубкой',
        short: 'Вырубка',
        type: 'лесные земли',
        isPreview: true,
        hasMR: true,
        code: '1509',
    },
    {
        value: 'Редина.*',
        short: 'Редина',
        type: 'лесные земли',
        isPreview: true,
        tier: 8,
        code: '1400',
    },
    {
        value: 'Сухостой свежий|Сухостой|Свежий сухостой',
        short: 'Сухостой',
        type: 'лесные земли',
        tier: 13,
        code: '1101',
    },
    {
        value: 'Насажд.*погиб.*|Погибшее.*ние|Погибш.?е',
        short: 'Насаждение погиб.',
        type: 'лесные земли',
        isPreview: true,
        tier: 30,
        hasMR: true,
        code: '1504',
    },
    {
        value: 'Гарь',
        type: 'лесные земли',
        hasMR: true,
        code: '1503',
    },
    {
        value: 'Поляна для отдыха',
        short: 'Поляна',
        type: 'нелесные земли',
        code: '1522',
    },
    {
        value: 'Канава мелиоратив.|Канав.?',
        short: 'Канава',
        type: 'нелесные земли',
        code: '2114',
    },

    {
        value: 'Границы окружные|Граница',
        short: 'Граница окруж.',
        type: 'нелесные земли',
        code: '2313',
    },

    {
        value: 'Прочие земли|Неиспользуемые|Др.неуд.д/исп.|Прочие',
        short: 'Прочие земли',
        type: 'нелесные земли',
        code: '2544',
    },
    {
        value: 'Прочие трассы',
        type: 'нелесные земли',
        code: '2553',
    },

    {
        value: 'Канал',
        type: 'нелесные земли',
        code: '2113',
    },
    {
        value: 'Склад',
        type: 'нелесные земли',
        code: '2404',
    },
    {
        value: 'Кладбище',
        type: 'нелесные земли',
        code: '2425',
    },
    {
        value: 'Газопровод',
        type: 'нелесные земли',
        code: '2550',
    },
    {
        value: 'Тропа',
        type: 'нелесные земли',
        code: '2308',
    },

    {
        value: 'Площадки с памятниками',
        short: 'Площадка с пам.',
        type: 'нелесные земли',
        code: '2418',
    },
    {
        value: 'Площадка спорт.*игров.*|Площадка',
        short: 'Площадка',
        type: 'нелесные земли',
        isPreview: true,
        code: '2417',
    },
    {
        value: 'Стоянка транc.*|Стоянка',
        short: 'Стоянка',
        type: 'нелесные земли',
        isPreview: true,
        code: '2423',
    },
    {
        value: 'Болото',
        type: 'нелесные земли',
        code: '2507',
    },
    {
        value: 'Река',
        type: 'нелесные земли',
        code: '2109',
    },
    {
        value: 'Ручей',
        type: 'нелесные земли',
        code: '2110',
    },
    {
        value: 'Пруд',
        type: 'нелесные земли',
        code: '2111',
    },
    {
        value: 'Просек.*квартал.*',
        short: 'Просека квартал.',
        type: 'нелесные земли',
        isPreview: true,
        code: '2310',
    },
    {
        value: 'Просек.*гранич.*|Просек.+',
        short: 'Просека граничн.',
        type: 'нелесные земли',
        isPreview: true,
        code: '2322',
    },
    {
        value: 'Лин.*электроп.*|ЛЭП',
        short: 'Линии э/п',
        type: 'нелесные земли',
        isPreview: true,
        code: '2548',
    },
    // Добавляем промежуточное описание культур для интерпретации первичных названий лесных земель, с целью дальнейшего уточнения
    {
        value: 'Насаждение$',
        type: 'лесные земли',
        isPreview: true,
        code: '1101',
    },
];

class ForestParser {
    #isParseHeader = false;
    #isParseTitul = false;

    #currentKvartal = null;
    #currentLot = null;
    #currentForestryTract = null;
    #currentLandName = null;
    #currentLandType = null;
    #currentLandCode = 1101;
    #currentComposition = null;
    #currentCompositionType = null;
    #currentDetailed = null;
    #currentProtectZone = null;

    #currentStep = searchStep.stepTitul;
    #currentFeatureType = featureType.kvartal;

    #forestryMain = null;
    #forestryDistrict = null;
    #forestryTract = null;
    #forestryAdm = null;
    #forestryRegion = null;

    #forestryCS = null;
    #forestryAllCodes = {};
    #actualYear = null;
    #taxerCompany = null;
    #taxerExpedition = null;

    #noLandType = null;
    #noAdditional = null;
    #noProtectZone = null;
    #noProtectZoneOzu = null;
    #noActivities = null;
    #forestErrorList = new Map();

    #countLots = 0;
    #countLotsByKvartal = 0;
    #countKvartals = 0;

    #forestryResult = {};

    #dbFields = [];

    #dbfFile = null;
    #mapFile = null;
    #messagerForestry = null;
    #tableHeaders = [];

    #forestryFile = null;

    #forestryContent = [];

    #toPath = 'src/assets';

    #charset = 'UTF-8';

    constructor(options = {}) {
        //super();
        //console.log(options.forestryFile, this.#forestryFile);
        this.#forestryFile = options.forestryFile
            ? path.parse(options.forestryFile).base
            : this.#forestryFile;

        this.#forestryMain = options.forestryMain;
        this.#forestryDistrict = options.forestryDistrict;
        this.#forestryTract = options.forestryTract || '';
        this.#forestryRegion = options.forestryRegion;

        this.#taxerCompany = options.taxerCompany;
        this.#taxerExpedition = options.taxerExpedition;
        this.#isParseHeader = !!options.isParseHeader;
        this.#isParseTitul = !!options.isParseTitul;

        this.#charset = options.charset || this.#charset;

        return async () => {
            // Запускаем функцию инициализации исходных данных для дальнейшего использовани при парсинге таксационной карты
            await this.#initParserData();
            return this; // Return the newly-created instance
        };
    }

    parseForestry = async () => {
        // Инициализируем словари для хранения отсутствующих сущностей таксационного описания выделов леса
        this.#initParserVariable();

        // console.log(
        //     this.#forestryAllCodes,
        //     this.#forestryContent.length,
        //     'Кода лесничества из map файла'
        // );

        try {
            // Читаем требуемый файл - таксационную карточку лесничества и выводим результат на экран
            this.#forestryContent =
                (
                    await this.#openFileForestry(
                        `${this.#forestryMain}/${this.#forestryFile}`,
                        false
                    )
                )?.split('\n') ?? [];

            if (this.#forestryContent.length > 0) {
                console.log(
                    //this.#forestryContent,
                    `Данные файла [${this.#forestryFile}] лесничества ${
                        this.#forestryMain
                    } прочитаны`
                );
            } else {
                console.log(
                    `Файл лесничества ${this.#forestryMain} - [${
                        this.#forestryFile
                    }] - пустой`
                    //this.#forestryContent.slice(0, 100)
                );
            }
            //let countItem = 0;
            if (!this.#checkCriticalError())
                // Начинаем парсить данные таксационной карточки
                for (let forestItem of this.#forestryContent) {
                    // ++countItem;
                    // if (countItem < 300)
                    //     console.log(
                    //         forestItem,
                    //         this.#currentKvartal,
                    //         this.#currentFeatureType,
                    //         this.#tableHeaders
                    //     );
                    // Подменяем иностранные символы в тексте - в некоторых книгах попадается транслитерация
                    forestItem = forestItem
                        .replaceAll('H', 'Н')
                        .replaceAll('E', 'Е')
                        .replaceAll('K', 'К')
                        .replaceAll('C', 'С');

                    //console.log(forestItem);
                    if (this.#currentFeatureType !== featureType.final) {
                        // Проверяем содержимое на данные титульного листа
                        await this.#checkForForestryTitul(forestItem);

                        // Проверяем каждую строку на наличие различных сущностей и подсказываем как необходимо парсить текущие данные
                        this.#checkForForestryFeature(forestItem);
                        //if (forestItem)
                        // Распарсиваем содержимое строки таксационной карточки по описаниям лесных пород для текущего выдела
                        this.#parseLotContent(forestItem);
                    }

                    //if (Number(this.#currentKvartal) > 1) break;
                }
            // Выводим сообщение о количестве выделов в квартале для последнего квартала (даже при наличии ошибок)
            if (
                this.#currentFeatureType == featureType.final ||
                (this.#countKvartals > 0 && this.#countLots > 0)
            ) {
                console.log(
                    `В квартале [${this.#currentKvartal}] найдено ${
                        this.#countLotsByKvartal
                    } выделов`
                );

                // Записываем полученный после парсинга объект в лог файл
                this.#messagerForestry.logMessages(this.#forestryResult);

                // Запускаем функцию преобразования объекта #forestryResult в базу данных лесничества DBF (кодировка UTF-8)
                await this.#addForesteryToDBF();
            }
            // Если обнаруживаем ошибку после прохождения работы парсера выводи сообщения в лог
            this.#checkCriticalError(true);
        } catch (err) {
            console.log(
                `Ошибка парсинга [${this.#forestErrorList.size}] в выделе [${
                    this.#currentLot
                }] квартала [${this.#currentKvartal}]`,
                `${err.message}\n${err.stack}`
            );
            // Если происходит ошибка в процессе парсинга добавляем ее в лог ошибок!
            this.#forestErrorList.set(
                `Ошибка парсинга [${this.#forestErrorList.size}]`,
                `${err.message}\n${err.stack}`
            );
        }
    };

    setForestryMain = async (forestryMain) => {
        this.#forestryMain = forestryMain;
        // После перехода на новое лесничество пересоздаем dbf базу для внесения данных таксационной карты
        this.#dbfFile = await this.#openOrCreateDbfFile();
    };

    setForestryFile = async (forestryFile) => {
        this.#forestryFile = path.parse(forestryFile).base;
    };

    #initParserData = async () => {
        try {
            // Создаем или открываем dbf базу для внесения данных таксационной карты
            this.#dbfFile = await this.#openOrCreateDbfFile();
            // Читаем map файл со всеми классификаторами и кодами сущностей для лесничества
            this.#mapFile = await this.#openFileForestry();
            // Если не нужно парсить заголовок таблицы - загружаем его из подготовленного файла
            if (!this.#isParseHeader) {
                this.#tableHeaders = this.#readForestryHeader();
                console.log('Заголовок таблицы считан из файла');
            }
        } catch (err) {
            console.log(`Error occured:\n ${err}`);
        }
    };

    #initParserVariable = async () => {
        this.#countLots = 0;
        this.#countKvartals = 0;

        this.#noLandType = new Set();
        this.#noAdditional = new Set();
        this.#noProtectZone = new Set();
        this.#noProtectZoneOzu = new Set();
        this.#noActivities = new Set();
        this.#forestErrorList = new Map();

        this.#forestryResult = {};
        this.#forestryAllCodes = {};

        this.#currentKvartal = null;
        this.#currentLot = null;
        this.#currentForestryTract = null;
        this.#currentLandName = null;
        this.#currentLandType = null;
        this.#currentLandCode = 1101;
        this.#currentComposition = null;
        this.#currentCompositionType = null;
        this.#currentDetailed = null;
        this.#currentProtectZone = null;

        this.#currentStep = this.#isParseTitul
            ? searchStep.stepTitul
            : searchStep.stepFeature;
        this.#currentFeatureType = featureType.kvartal;

        if (this.#isParseHeader) this.#tableHeaders = [];

        this.#forestryDistrict = '';
        this.#forestryTract = '';
        //this.#forestryAdm = null;

        this.#forestryCS = null;
        this.#actualYear = null;
        this.#taxerCompany = null;
        this.#taxerExpedition = null;
        // Создаем логгер парсинга
        this.#messagerForestry = this.#messageToLogForestry();
        this.#messageToLogForestry();
    };

    #checkCriticalError = (writeToLog = false) => {
        const hasError = this.#forestErrorList.size > 0;

        // Если в процессе работы парсера появились критические ошибки выходим из программы
        if (this.#forestErrorList.size > 0 && writeToLog) {
            for (const [key, value] of this.#forestErrorList.entries()) {
                const erroMessage = `Ошибка [${key}] - ${value}`;
                this.#messagerForestry.errorMessages(erroMessage);
            }
        }

        return hasError;
    };

    #addForesteryToDBF = async () => {
        // Вначале создаем полносписочный шаблон записи для добавления в БД
        const recordsToAppend = [];
        // const record = this.#dbFields.reduce((result, fieldItem) => {
        //     result[fieldItem.name] = this.#formatField(
        //         '',
        //         fieldItem.type,
        //         fieldItem.size,
        //         fieldItem.decimalPlaces ? fieldItem.decimalPlaces : 0,
        //         false
        //     );

        //     return result;
        // }, {});

        //console.log(record, 'Запись для добавления в БД');
        if (this.#countKvartals > 0) {
            // Если мы распарсили кварталы и выдела, то пытаемся прочитать информацию и вставиьт ее в базу
            for (const kvartal of Object.keys(this.#forestryResult)) {
                this.#currentKvartal = kvartal;
                this.#currentKvartal = kvartal;
                for (const lot of Object.keys(
                    this.#forestryResult[kvartal].lots
                )) {
                    this.#currentLot = lot;
                    this.#currentLot = lot;
                    const currentLot = this.#forestryResult[kvartal].lots[lot];
                    // if (!currentLot['compositions'][0]?.['LCODE'])
                    //     console.log(
                    //         kvartal,
                    //         lot,
                    //         currentLot['compositions'][0],
                    //         'Нет номера категории'
                    //     );
                    // console.log(
                    //     kvartal,
                    //     lot,
                    //     currentLot['compositions'][0]['LCODE']
                    // );
                    const GIR = this.#forestryAllCodes['F_TRACT']
                        ? this.#forestryAllCodes['F_TRACT']
                        : this.#forestryAllCodes['F_DIST'];

                    recordsToAppend.push({
                        //...record,
                        MUK:
                            this.#forestryAllCodes['F_REG'] * 10000 +
                            this.#forestryAllCodes['F_MAIN'] * 100 +
                            GIR,
                        SRI: this.#forestryAllCodes['F_REG'],
                        MU: this.#forestryAllCodes['F_MAIN'],
                        GIR,
                        ADMR: this.#forestryAllCodes['F_ADM'],
                        MK: currentLot['FP_CODE'],
                        UD: Number(
                            currentLot['FP_CODE'].toString().slice(0, 2)
                        ),
                        MR: this.#formatValueByField(
                            this.#getMrOrVmrComposition(
                                currentLot['compositions'],
                                'MR'
                            ),
                            'MR'
                        ),
                        VMR: this.#formatValueByField(
                            this.#getMrOrVmrComposition(
                                currentLot['compositions']
                            ),
                            'VMR'
                        ),
                        // Добавляем информаицию о годе актуализиции, предприятии таксаторе и номере экспедиции, если они есть
                        ...(this.#actualYear && Number(this.#actualYear) > 0
                            ? { AKTM: Number(this.#actualYear) }
                            : {}),
                        ...(this.#taxerCompany &&
                        Number(this.#taxerCompany) > 0 &&
                        Number(this.#taxerCompany) < 100
                            ? { MKIM: Number(this.#taxerCompany) }
                            : {}),
                        ...(this.#taxerExpedition &&
                        Number(this.#taxerExpedition) > 0 &&
                        Number(this.#taxerExpedition) < 100
                            ? { EKSP: Number(this.#taxerExpedition) }
                            : {}),
                        KV: Number(kvartal),
                        ZK: Number(
                            this.#getLandCodeByVMR(currentLot['compositions'])
                        ),
                        ZKG: Number(
                            this.#getLandCodeByVMR(currentLot['compositions'])
                                .toString()
                                .slice(0, 2)
                        ),
                        PL: this.#formatValueByField(
                            currentLot['kvArea'],
                            'PL'
                        ),

                        SKNR: Number(lot),
                        KL: `${this.#forestryAllCodes['F_REG']}${
                            this.#forestryAllCodes['F_MAIN'] < 10 ? '0' : ''
                        }${this.#forestryAllCodes['F_MAIN']}${
                            GIR.toString().length < 2
                                ? '0'.repeat(2 - GIR.toString().length)
                                : ''
                        }${GIR}${
                            kvartal.toString().length < 4
                                ? '0'.repeat(4 - kvartal.toString().length)
                                : ''
                        }${kvartal}${
                            lot.toString().length < 3
                                ? '0'.repeat(3 - lot.toString().length)
                                : ''
                        }${lot}`,
                        KZ_NAME: this.#getShortCategoryName(
                            currentLot['compositions'][0]?.['LN'] ||
                                'Естественное происхождение'
                        ).slice(0, 24),
                        // Добавляем информацию по составу пород выдела и каждой породе в отдельности
                        ...this.#parseCompositionToDBF(currentLot),
                        // Добавляем описание дополнений для каждого выдела
                        ...this.#parseCompositionAdditional(currentLot),
                        // Добавляем описание хозяйственных мероприятий
                        ...this.#parseCompositionActivities(currentLot),
                    });

                    // Проверяем корректность заполнения TLU
                    // for (const compose of currentLot['compositions']) {
                    //     if (
                    //         compose &&
                    //         compose['TLU'] &&
                    //         compose['TLU'].length !== 2
                    //     )
                    //         console.log(
                    //             `Ошибка заполнения TLU для выдела/квартала [${kvartal}/${lot}]`
                    //         );
                    // }
                }
            }
            // Загоняем шаблонную запись в DBF
            if (recordsToAppend.length > 0) {
                await this.#dbfFile.appendRecords(recordsToAppend);
                console.log(
                    `В БД ${this.#forestryMain}.dbf добавлено [${
                        recordsToAppend.length
                    }/${this.#dbfFile.recordCount}] записей для лесничества [${
                        this.#forestryMain
                    }/${this.#forestryDistrict}] в регионе '${
                        this.#forestryRegion
                    }'`
                );
            }
        } else {
            console.log(
                `В лесничестве '${this.#forestryMain}/${
                    this.#forestryDistrict
                }' файл [${
                    this.#forestryFile
                }] не найдено ни одного квартала(выдела)`
            );
        }
    };

    // Функция добавления в БД описания хозяйственных мероприятий
    #parseCompositionActivities = (
        currentLot,
        getResult = true,
        logMessage = true
    ) => {
        let newActivity = false;
        let hasValue = false;
        let hasRtk = false;
        let activityNum = 0;
        let activityCode = 0;
        const activities = currentLot['FA'] || [];
        const resultActivity = {};

        if (activities && activities.length > 0) {
            for (let activity of activities) {
                activity = activity.toLowerCase().trim();
                //console.log(resultActivity, 'Текущее мероприятие');
                if (newActivity) {
                    if (hasValue && activity.indexOf('%') > -1) {
                        resultActivity[`UP${activityNum}P`] = Number(
                            activity.match(/\d+/g)?.[0] || 0
                        );

                        hasValue = false;
                        continue;
                    }
                    if (hasRtk && activity.indexOf('ртк') > -1) {
                        resultActivity[`PTK${activityNum}`] = Number(
                            activity.match(/\d+/g)?.[0] || 1
                        );
                        hasRtk = false;
                        continue;
                    }
                    newActivity = hasValue = hasRtk = false;
                }

                if (!newActivity)
                    lotActivities.every((lotActivity) => {
                        newActivity =
                            isStringEqual(activity, lotActivity.mask, true) >
                            -1;

                        if (newActivity) {
                            ++activityNum;
                            // console.log(
                            //     activity,
                            //     lotActivity.mask,
                            //     activityNum,
                            //     'Новое мероприятие'
                            // );
                            hasValue = !!lotActivity.hasValue;
                            hasRtk = !!lotActivity.hasRtk;
                            activityCode = lotActivity.code;
                            if (
                                !!lotActivity.isCodeModify &&
                                activity.match(/\d+/g)
                            )
                                activityCode += Number(
                                    activity.match(/\d+/g)?.[0] || 1
                                );
                            resultActivity[`UP${activityNum}`] =
                                Number(activityCode);
                        }
                        return !newActivity;
                    });
                // Если не удалось распарсить хозяйственное мероприятие - добавляем его в warnings
                if (
                    logMessage &&
                    !newActivity &&
                    activity &&
                    activity.indexOf('%') < 0 &&
                    activity.indexOf('ртк') < 0 &&
                    !this.#noActivities.has(activity)
                ) {
                    this.#noActivities.add(activity);
                    this.#messagerForestry.warningMessages(
                        `Не удалось распарсить категорию хозяйственных мерприятий [${activity}] для выдела ${
                            this.#currentLot
                        } в квартале ${this.#currentKvartal}`
                    );
                }
            }
        }

        return getResult ? resultActivity : activityNum > 0;
    };

    // Формирует значения колонок по превалирующей породе, бонитете, сведения по выдеу в целом и по каждой пароде в частности
    #parseCompositionToDBF = (currentLot) => {
        const compositionResult = {};
        let hasTLU = false;
        // Вначале добавляем общие характеристики для описания пород в выделе
        //compositionResul.push({})
        let compositionNum = 1;
        for (const composition of currentLot['compositions']) {
            if (
                composition['detailes']?.length > 0 &&
                composition['TLU']?.length == 2 &&
                !hasTLU
            ) {
                hasTLU = true;

                // Вначале заполняем общие сведения по выделу
                if (Number(composition['FB']) > 0)
                    compositionResult['BON'] = this.#formatValueByField(
                        composition['FB'],
                        'BON'
                    );

                if (
                    this.#getUsekNumberByComposition(
                        composition['detailes'][0]['CN']
                    ) > 0
                )
                    compositionResult['USEK'] = this.#formatValueByField(
                        this.#getUsekNumberByComposition(
                            composition['detailes'][0]['CN']
                        ),
                        'USEK'
                    );

                compositionResult['MTIP'] = this.#formatValueByField(
                    composition['TLU'][0],
                    'MTIP'
                );
                compositionResult['DTG'] = this.#formatValueByField(
                    composition['TLU'][1],
                    'DTG'
                );
                if (Number(composition['FLC']) > 0)
                    compositionResult['SVTB'] = this.#formatValueByField(
                        composition['FLC'],
                        'SVTB'
                    );
                if (Number(composition['FLD']) > 0)
                    compositionResult['SVTL'] = this.#formatValueByField(
                        composition['FLD'],
                        'SVTL'
                    );
                if (Number(composition['FLS']) > 0)
                    compositionResult['SUX'] = this.#formatValueByField(
                        composition['FLS'],
                        'SUX'
                    );
                if (Number(composition['AG']) > 0)
                    compositionResult['AGR'] = this.#formatValueByField(
                        composition['AG'],
                        'AGR'
                    );
                if (Number(composition['FLR']) > 0)
                    compositionResult['STUR'] = this.#formatValueByField(
                        Number(composition['FLR']) * 10,
                        'STUR'
                    );
                if (Number(composition['AC']) > 0)
                    compositionResult['AKL'] = this.#formatValueByField(
                        composition['AC'],
                        'AKL'
                    );
            }
            // Далее переходим к наполнению колонок по каждой породе сквозной нумерацией, начиная с 1
            if (compositionNum < 11 && composition['detailes']) {
                let newTier = 0;
                let newKoeff = 0;
                let detailNum = 1;
                for (const detail of composition['detailes']) {
                    // Если обнаруживаем пустые деревья, переходим к следуюей породе
                    if (detail['CN'] == '-') continue;

                    newKoeff =
                        Number(detail['CK']) > 0
                            ? Number(detail['CK'])
                            : this.#checkForCompositition(
                                  composition['CN'],
                                  detailNum - 1
                              ).koeff;

                    // Поучаем новое значение яруса для породы следующим образом: смотрим на значение в колонке, далее смотрим на значение яруса для первой породы,
                    // далее смотрим на значение яруса для категории земель и далее берем значени по умолчанию - 1
                    newTier =
                        (Number(detail['CT']) > 0 && Number(detail['CT'])) ||
                        (Number(composition['detailes'][0]) > 0 &&
                            Number(composition['detailes'][0])) ||
                        (this.#checkForLandCategory(composition['LN'])
                            .landTier > 0 &&
                            this.#checkForLandCategory(composition['LN'])
                                .landTier) ||
                        1;

                    compositionResult[`ARD${compositionNum}`] =
                        this.#formatValueByField(
                            newTier,
                            `ARD${compositionNum}`
                        );

                    if (newKoeff > 0)
                        compositionResult[`KF${compositionNum}`] =
                            this.#formatValueByField(
                                newKoeff,
                                `KF${compositionNum}`
                            );

                    compositionResult[`MR${compositionNum}`] =
                        this.#formatValueByField(
                            detail['CN'],
                            `MR${compositionNum}`
                        );

                    if (detail['CA'] > 0)
                        compositionResult[`AMZ${compositionNum}`] =
                            this.#formatValueByField(
                                detail['CA'],
                                `AMZ${compositionNum}`
                            );

                    if (Number(detail['CH']) > 0)
                        compositionResult[`H${compositionNum}`] =
                            this.#formatValueByField(
                                detail['CH'],
                                `H${compositionNum}`
                            );

                    if (Number(detail['CD']) > 0)
                        compositionResult[`D${compositionNum}`] =
                            this.#formatValueByField(
                                detail['CD'],
                                `D${compositionNum}`
                            );
                    if (Number(detail['CC']) > 0)
                        compositionResult[`PSP${compositionNum}`] =
                            this.#formatValueByField(
                                detail['CC'],
                                `PSP${compositionNum}`
                            );
                    //compositionResult[`KIL${compositionNum}`] =
                    //    this.#formatValueByField(0, `KIL${compositionNum}`);
                    if (Number(detail['FFN'] > 0))
                        compositionResult[`SKAL${compositionNum}`] =
                            this.#formatValueByField(
                                detail['FFN'],
                                `SKAL${compositionNum}`
                            );
                    //compositionResult[`SPS${compositionNum}`] =
                    //    this.#formatValueByField(0, `SPS${compositionNum}`);
                    if (Number(detail['TS']) > 0)
                        compositionResult[`TUR1H${compositionNum}`] =
                            this.#formatValueByField(
                                //Number(detail['FR'] || '') * 10,
                                Number(detail['TS']) * 10,
                                `TUR1H${compositionNum}`
                            );
                    ++detailNum;
                    ++compositionNum;
                }
            }
        }

        return compositionResult;
    };

    // Функция парсинга дополнений для каждой композиции
    #parseCompositionAdditional = (currentLot) => {
        const additions = currentLot['additions'];
        let additionResult = {};
        const makets = [];

        if (additions && additions.length > 0) {
            for (const addition of additions) {
                let cPart = '';
                let cValue = '';
                let cType = '';
                let dNum = 1;
                let maketIndex = 1;
                let maket = [];
                //console.log(addition);
                // Проходимся по всем дополнениям и пытаемся записать сведения в соответствующие колонки БД
                switch (addition.name.toLowerCase()) {
                    case 'подлесок':
                        cValue = addition.value.toLowerCase();
                        additionResult['STG32'] =
                            cValue.toLowerCase().search('редкий') > -1
                                ? 1
                                : cValue
                                      .toLowerCase()
                                      .search('ср\\.|сред|густ') > -1
                                ? 2
                                : 3;
                        if (
                            cValue
                                .toLowerCase()
                                .search('редкий|ср\\.|густой') == 0
                        ) {
                            // Если попадаем на вариант Шуйского от "интересных подрядчиков"
                            while (cValue.indexOf('  ') > -1)
                                cValue = cValue.replaceAll('  ', ' ');
                            const composeName = cValue.split(' ').slice(1);

                            let isComposite = false;
                            let composeCode = '';
                            let singleCode = '';
                            let candidateToCompose = '';
                            let composeNum = 1;
                            composeName.forEach((composeItem, composeIndex) => {
                                if (composeNum > 3) return;

                                if (isComposite) {
                                    composeCode = this.#getComposeCodeByName(
                                        `${candidateToCompose}${composeItem}`
                                    );
                                }

                                singleCode = this.#getComposeCodeByName(
                                    `${composeItem}`
                                );

                                isComposite = false;
                                // Добавляем композитную породу
                                if (composeCode) {
                                    additionResult[`MR${composeNum}32`] =
                                        composeCode;
                                    composeCode = candidateToCompose = '';
                                    ++composeNum;
                                    // Добавляем одиночную породу
                                } else if (
                                    singleCode &&
                                    (candidateToCompose ||
                                        composeIndex == composeName.length - 1)
                                ) {
                                    additionResult[`MR${composeNum}32`] =
                                        singleCode;
                                    composeCode = candidateToCompose = '';
                                    ++composeNum;
                                } else {
                                    // Если начало композитной породы (по сути одиночная) образует породу, то добавляем ее и далее начинаем снова набирать композитную породу
                                    if (
                                        candidateToCompose &&
                                        this.#getComposeCodeByName(
                                            `${candidateToCompose}`
                                        )
                                    ) {
                                        additionResult[`MR${composeNum}32`] =
                                            this.#getComposeCodeByName(
                                                `${candidateToCompose}`
                                            );
                                        ++composeNum;
                                    }
                                    candidateToCompose = composeItem;
                                    isComposite = true;
                                }
                            });
                        } else {
                            cPart = addition.value.match(
                                /(?<=^| |,|\+)[А-Я]{1,4}(?= |,|\+)/g
                            );
                            if (cPart)
                                cPart.forEach((part, index) => {
                                    additionResult[`MR${index + 1}32`] = part;
                                    // if (
                                    //     this.#currentKvartal == 4 &&
                                    //     this.#currentLot == 32
                                    // )
                                    //     console.log(
                                    //         this.#currentLot,
                                    //         addition.value,
                                    //         part,
                                    //         'Макет подлеска для текущего выдела'
                                    //     );
                                });
                        }

                        break;
                    case 'подрост':
                        cPart = addition.value.match(/(\d+[А-Я]{1,4}){1,3}/g);
                        cValue = addition.value.toLowerCase();
                        if (cPart)
                            cPart.forEach((part, index) => {
                                additionResult[`KF${index + 1}31`] = Number(
                                    part.match(/\d+/g)[0]
                                );
                                additionResult[`MR${index + 1}31`] =
                                    part.match(/[А-Я]+/g)[0];
                            });
                        //console.log(cValue);
                        additionResult[`AMZ31`] = Number(
                            cValue.match(/\(\d+\)/g)
                                ? cValue.match(/\(\d+\)/g)[0].slice(1, -1)
                                : cValue.match(/ \d+ /g)?.[0] || 0
                        );
                        // if (!cValue.match(/(\d+[,\.]?\d?)(?= м)/g))
                        //     console.log(addition, 'Текущее дополнение');

                        additionResult['H31'] = Number(
                            this.#formatValueByField(
                                Number(
                                    cValue.match(/(\d+[,\.]?\d?)(?= м)/g)
                                        ? cValue
                                              .match(/(\d+[,\.]?\d?)(?= м)/g)[0]
                                              .replace(',', '.')
                                        : cValue
                                              .match(/ \d+[,\.]?\d /g)?.[1]
                                              ?.replace(',', '.') || 0
                                ),
                                'H31'
                            )
                        );

                        additionResult['KOL31'] = Number(
                            this.#formatValueByField(
                                Number(
                                    cValue
                                        .match(
                                            /(\d+[,\.]?\d?)(?= т.|тыс.)/g
                                        )?.[0]
                                        ?.replace(',', '.') || 0
                                ),
                                'KOL31'
                            )
                        );
                        break;

                    case 'селекционная оценка':
                        makets.push({});
                        maket = makets[makets.length - 1];
                        maket[`M${makets.length}`] = 26;
                        cValue = addition.value.toLowerCase();
                        if (cValue.indexOf('минус') > -1) {
                            maket[`DM${makets.length}1`] = '1';
                        } else if (cValue.indexOf('нормальные') > -1) {
                            maket[`DM${makets.length}1`] = '2';
                        } else if (cValue.indexOf('плюс') > -1)
                            maket[`DM${makets.length}1`] = '3';
                        else maket[`DM${makets.length}1`] = '4';

                        break;
                    case 'год вырубки':
                        //console.log(`${cValue}`, 'Парсим вырубку с пнями!');
                        cValue = addition.value.toLowerCase();
                        const fellingYear =
                            Number(
                                cValue.match(
                                    /(?:\b|-| )\d+ *(?=г|,|\b)/g
                                )?.[0] || 0
                            ) || 0;
                        // Год вырубки для пней
                        let addValue =
                            fellingYear < 100 && fellingYear > 0
                                ? fellingYear < new Date().getYear() - 100
                                    ? 2000 + fellingYear
                                    : 1900 + fellingYear
                                : fellingYear > 0
                                ? fellingYear
                                : 0;
                        if (addValue > 0)
                            additionResult['KMET'] = Number(
                                this.#formatValueByField(addValue, 'KMET')
                            );
                        // Количество пней
                        addValue = Number(
                            cValue
                                .match(
                                    /(?<=пней )\d+(?=шт| |\b)|(?:\b *)\d+(?=шт)/g
                                )?.[0]
                                ?.replace(',', '.') || 0
                        );
                        if (addValue > 0)
                            additionResult['KSK'] = Number(
                                this.#formatValueByField(addValue, 'KSK')
                            );

                        // Количество сосны
                        addValue = Number(
                            cValue
                                .match(/(?:сосны.*)\d+(?=шт| |,|\b)/g)?.[0]
                                ?.match(/\d+\.?\d+/g)?.[0] || 0
                        );
                        if (addValue > 0)
                            additionResult['PKSK'] = Number(
                                this.#formatValueByField(addValue, 'PKSK')
                            );

                        // Диаметр пней
                        addValue = Number(
                            cValue
                                .match(/(?:диаметр.*)\d+(?=см| |\b|\B)/g)?.[0]
                                ?.replace(',', '.')
                                ?.match(/\d+\.?\d+/g)?.[0] || 0
                        );
                        if (addValue > 0)
                            additionResult['DP'] = Number(
                                this.#formatValueByField(addValue, 'DP')
                            );
                        // // Задаем целевую попроду, если мы на вырубках пеньков
                        // const mainDetaile =
                        //     currentLot['compositions'][0]['detailes']?.[0];
                        // if (mainDetaile?.['CN'] !== '-')
                        //     additionResult['MR'] = this.#formatValueByField(
                        //         currentLot['compositions'][0]['detailes'][0][
                        //             'CN'
                        //         ],
                        //         'MR'
                        //     );
                        break;
                    case 'озу':
                        // Парсим ОЗУ-шки
                        cValue = addition.value;
                        additionResult['SKP'] = this.#formatValueByField(
                            this.#parseProtecteZoneOzu(cValue),
                            'SKP'
                        );
                        break;
                    case 'особенности':
                        // Макет Особенности - 23
                        maket = makets.find((maketItem, index) => {
                            maketIndex = index + 1;
                            dNum = Object.keys(maketItem).length;
                            return maketItem[`M${maketIndex}`] == 23;
                        });
                        if (!maket) {
                            makets.push({});
                            maket = makets[makets.length - 1];
                            maketIndex = makets.length;
                            maket[`M${maketIndex}`] = 23;
                            dNum = 1;
                        }

                        cValue = addition.value.toLowerCase();
                        if (cValue.search('состав +неоднород.*') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '1';
                            ++dNum;
                        }
                        if (cValue.search('полнота +неравномер.*') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '2';
                            ++dNum;
                        }
                        if (
                            cValue.indexOf('насажден') > -1 &&
                            cValue.indexOf('рубк') > -1
                        ) {
                            maket[`DM${maketIndex}${dNum}`] = '3';
                            ++dNum;
                        }
                        if (cValue.indexOf('размещение') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '4';
                            ++dNum;
                        }
                        if (cValue.indexOf('заболоч') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '5';
                            ++dNum;
                        }
                        if (cValue.indexOf('затоп') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '6';
                            ++dNum;
                        }
                        if (cValue.indexOf('осушен') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '7';
                            ++dNum;
                        }
                        if (cValue.indexOf('прокаш') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '8';
                            ++dNum;
                        }
                        if (cValue.indexOf('скот') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '9';
                            ++dNum;
                        }
                        if (cValue.indexOf('разновозраст') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '10';
                            ++dNum;
                        }
                        if (cValue.indexOf('куртинный') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '11';

                            ++dNum;
                        }
                        if (cValue.indexOf('высота') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '12';
                            ++dNum;
                        }
                        if (cValue.indexOf('диаметр') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '13';
                            ++dNum;
                        }
                        if (cValue.indexOf('куртинная') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '14';
                            ++dNum;
                        }
                        if (cValue.indexOf('семенн') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '15';
                            ++dNum;
                        }
                        if (cValue.indexOf('порослев') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '16';
                            ++dNum;
                        }
                        if (cValue.indexOf('склон') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '17';
                            ++dNum;
                        }
                        if (
                            cValue.indexOf('тип') > -1 &&
                            cValue.indexOf('леса') > -1
                        ) {
                            maket[`DM${maketIndex}${dNum}`] = '19';
                            ++dNum;
                        }
                        if (cValue.indexOf('хозвозд') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '20';
                            ++dNum;
                        }
                        if (cValue.indexOf('создания') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '21';
                            ++dNum;
                        }
                        if (cValue.search('бонитет +по.*') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '22';
                            ++dNum;
                        }
                        if (cValue.search('боните +вар.*') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '25';
                            ++dNum;
                        }
                        if (cValue.search('состав +и +полн.*') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '26';
                            ++dNum;
                        }
                        if (cValue.search('неоднороден +по.*') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '27';
                            ++dNum;
                        }
                        if (cValue.indexOf('водоохран') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '29';
                            ++dNum;
                        }
                        if (cValue.indexOf('березов') > -1) {
                            maket[`DM${maketIndex}${dNum}`] = '30';
                            ++dNum;
                        }

                        break;
                    case 'класс пожарной опасности':
                        // Дополнение в макет Особенности - 23
                        maket = makets.find((maketItem, index) => {
                            maketIndex = index + 1;
                            return maketItem[`M${maketIndex}`] == 23;
                        });
                        if (!maket) {
                            makets.push({});
                            maket = makets[makets.length - 1];
                            maketIndex = makets.length;
                            maket[`M${maketIndex}`] = 23;
                        }

                        cValue = Number(addition.value) + 170;
                        maket[`DM${maketIndex}${Object.keys(maket).length}`] =
                            this.#formatValueByField(
                                cValue,
                                `DM${maketIndex}${Object.keys(maket).length}`
                            );

                        break;
                    case 'повреждение':
                        // Макет Вредители - 12
                        makets.push({});
                        maket = makets[makets.length - 1];
                        maketIndex = makets.length;
                        maket[`M${maketIndex}`] = 12;
                        cValue = addition.value.toLowerCase();
                        let hasYear = false;
                        let cultureDeathYear = 0;
                        let composeId = 1;

                        // Удаляем пробелы перед запятой для поиска породы
                        while (cValue.indexOf(' ,') > -1)
                            cValue = cValue.replaceAll(' ,', ',');
                        // Ищем причину повреждения
                        const causeIndex = forestCauseCrop.findIndex(
                            (causeItem) => {
                                return (
                                    isStringEqual(
                                        cValue,
                                        causeItem.mask,
                                        true
                                    ) > -1
                                );
                            }
                        );
                        // Если нашли причину ищем вредителя или болезнь
                        if (causeIndex > -1) {
                            const causeItem = forestCauseCrop[causeIndex];
                            maket[`DM${maketIndex}1`] =
                                causeItem.code.toString();
                            if (causeItem.type) {
                                const petIndex = forestPets[
                                    causeItem.type
                                ].findIndex((petItem) => {
                                    return (
                                        isStringEqual(
                                            cValue,
                                            petItem.mask,
                                            true
                                        ) > -1
                                    );
                                });
                                if (petIndex > -1) {
                                    const petItem =
                                        forestPets[causeItem.type][petIndex];
                                    if (causeItem.type == 'disease') {
                                        // Это болезни для записи в колонку 4
                                        maket[`DM${maketIndex}4`] =
                                            petItem.code.toString();
                                    } else {
                                        // Это вредители для записи в колонку 6
                                        maket[`DM${maketIndex}6`] =
                                            petItem.code.toString();
                                    }
                                }
                            }
                            // Если не нашли причину повреждения пишем прочую причину - код 99
                        } else maket[`DM${maketIndex}1`] = '99';

                        // Пробуем найти год повреждения
                        if (cValue.match(/\d{2,4}/g)) {
                            cultureDeathYear = Number(
                                cValue.match(/\d{2,4}/g)[0].slice(-2)
                            );
                            cultureDeathYear =
                                cultureDeathYear < 100 && cultureDeathYear > 0
                                    ? cultureDeathYear <
                                      new Date().getYear() - 100
                                        ? 2000 + cultureDeathYear
                                        : 1900 + cultureDeathYear
                                    : cultureDeathYear > 0
                                    ? cultureDeathYear
                                    : 0;
                            if (cultureDeathYear > 0) {
                                maket[`DM${maketIndex}2`] =
                                    cultureDeathYear.toString();
                                hasYear = true;
                            }
                        }

                        // Ищем поврежденную породу
                        if (
                            cValue.match(/(?<=порода ) *\D+ *(?=,)/g) ||
                            cValue.split(',').length > 1
                        ) {
                            if (hasYear) composeId = 2;

                            let testCompose =
                                cValue.split(',').length >= composeId
                                    ? cValue.split(',')[composeId]
                                    : '';
                            if (testCompose.indexOf(' ') > -1)
                                testCompose = testCompose
                                    .slice(testCompose.lastIndexOf(' ') + 1)
                                    .trim();
                            const damageCompose =
                                cValue.match(
                                    /(?<=порода ) *\D+ *(?=,)/g
                                )?.[0] || testCompose;
                            if (damageCompose)
                                maket[`DM${maketIndex}3`] =
                                    this.#getComposeCodeByName(testCompose);
                        }

                        // Ищем степень повреждения породы
                        maket[`DM${maketIndex}5`] = cValue.match(
                            /(?!, *|степень *поврю.*)сильная(?= *поврежденность|\B)/g
                        )
                            ? '3'
                            : cValue.match(
                                  /(?!, *|степень *повр.*)средняя(?= *поврежденность|\B)/g
                              )
                            ? '2'
                            : '1';

                        break;

                    case 'культуры':
                        // Макет Культуры - 11
                        makets.push({});
                        maket = makets[makets.length - 1];
                        maketIndex = makets.length;

                        maket[`M${maketIndex}`] = 11;

                        cValue = addition.value.toLowerCase();
                        if (cValue.match(/(?=\b|-?) *\d+(?= *,| *г)/g)) {
                            const cultureCreationYear = Number(
                                cValue.match(/(?=\b|-?) *\d+(?= *,| *г)/g)[0]
                            );
                            maket[`DM${maketIndex}1`] =
                                this.#formatValueByField(
                                    cultureCreationYear < 100 &&
                                        cultureCreationYear > 0
                                        ? cultureCreationYear <
                                          new Date().getYear() - 100
                                            ? 2000 + cultureCreationYear
                                            : 1900 + cultureCreationYear
                                        : cultureCreationYear > 0
                                        ? cultureCreationYear
                                        : 0,
                                    `DM${maketIndex}1`
                                );
                        }
                        let value11_2 = 0;
                        if (cValue.indexOf('вспашка ') > -1) {
                            value11_2 =
                                cValue.indexOf('сплош') > -1
                                    ? 70
                                    : cValue.indexOf('полос') > -1
                                    ? 71
                                    : cValue.indexOf('борозд') > -1
                                    ? 72
                                    : cValue.indexOf('механизирован') > -1
                                    ? 73
                                    : cValue.indexOf('ручная') > -1
                                    ? 74
                                    : 0;
                        }
                        if (value11_2 > 0) {
                            maket[`DM${maketIndex}2`] =
                                this.#formatValueByField(
                                    value11_2,
                                    `DM${maketIndex}2`
                                );
                        }

                        if (cValue.match(/посадка|посев/g)) {
                            const value11_3 =
                                cValue.indexOf('посадка мех') > -1
                                    ? 1
                                    : cValue.indexOf('посадка руч') > -1
                                    ? 2
                                    : cValue.indexOf('посев руч') > -1
                                    ? 3
                                    : 4;
                            maket[`DM${maketIndex}3`] =
                                this.#formatValueByField(
                                    value11_3,
                                    `DM${maketIndex}3`
                                );
                        }

                        if (
                            cValue.match(
                                /(?<=рядами |ряду |ряд-) *\d+\.?\d+|\d+(?= +м)/g
                            )
                        ) {
                            const value11_41 =
                                cValue
                                    .match(
                                        /(?<=рядами |ряду |ряд-) *\d+\.?\d+|\d+(?= +м)/g
                                    )?.[0]
                                    ?.replace(',', '.') || 0;
                            const value11_42 =
                                cValue
                                    .match(
                                        /(?<=рядами |ряду |ряд-) *\d+\.?\d+|\d+(?= +м)/g
                                    )?.[1]
                                    ?.replace(',', '.') || 0;

                            if (value11_41) {
                                maket[`DM${maketIndex}4`] =
                                    this.#formatValueByField(
                                        value11_41,
                                        `DM${maketIndex}4`
                                    );
                            }
                            if (value11_42) {
                                maket[`DM${maketIndex}5`] =
                                    this.#formatValueByField(
                                        value11_42,
                                        `DM${maketIndex}5`
                                    );
                            }
                        }
                        if (
                            cValue.match(
                                /(?<=количество |количеств-) *\d+\.?\d+|\d+(?= *тыс)/g
                            )
                        ) {
                            const value11_51 = cValue
                                .match(
                                    /(?<=количество |количеств-) *\d+\.?\d+|\d+(?= *тыс)/g
                                )?.[0]
                                .replace(',', '.');
                            if (value11_51) {
                                maket[`DM${maketIndex}6`] =
                                    this.#formatValueByField(
                                        value11_51,
                                        `DM${maketIndex}6`
                                    );
                            }
                        }

                        if (
                            cValue.match(
                                /(?<=состояни\s|\S) *(удовлетворит|неудовлетворит|хорош|погибш)(?=,| |\B)/g
                            )
                        ) {
                            const value11_7 = cValue.match(
                                /(?<=состояни\s|\S) *хорош(?=,| |\B)/g
                            )
                                ? 4
                                : cValue.match(
                                      /(?<=состояни\s|\S) *удовлетворит(?=,| |\B)/g
                                  )
                                ? 3
                                : cValue.match(
                                      /(?<=состояни\s|\S) *неудовлетворит(?=,| |\B)/g
                                  )
                                ? 2
                                : 1;

                            maket[`DM${maketIndex}7`] =
                                this.#formatValueByField(
                                    value11_7,
                                    `DM${maketIndex}7`
                                );

                            if (value11_7 < 3) {
                                maket[`DM${maketIndex}8`] =
                                    this.#formatValueByField(
                                        cValue.indexOf('наруш') > -1
                                            ? 21
                                            : cValue.indexOf('заниж') > -1
                                            ? 22
                                            : cValue.indexOf('несоот') > -1
                                            ? 23
                                            : cValue.indexOf('отсутств') > -1
                                            ? 24
                                            : cValue.indexOf('некач') > -1
                                            ? 25
                                            : cValue.indexOf('заглуш') > -1
                                            ? 26
                                            : cValue.indexOf('потрав') > -1
                                            ? 27
                                            : cValue.indexOf('повреж') > -1
                                            ? 28
                                            : cValue.indexOf('неблаг') > -1
                                            ? 29
                                            : 20,
                                        `DM${maketIndex}8`
                                    );
                            }
                        }

                        break;
                }
            }
            if (makets.length > 0)
                makets.forEach(
                    (maket) =>
                        (additionResult = { ...additionResult, ...maket })
                );
            return additionResult;
        }
    };

    // Функци считывает из классификатора (map)коды лесничества, уч. лесничества, урочища, района и т.п.
    #parseForestryCodesAndContent = async () => {
        try {
            const tractCode =
                path.parse(this.#forestryFile).name.indexOf('-') > -1
                    ? !isNaN(path.parse(this.#forestryFile).name.split('-')[0])
                        ? Number(
                              path.parse(this.#forestryFile).name.split('-')[0]
                          )
                        : 0
                    : !isNaN(path.parse(this.#forestryFile).name)
                    ? Number(path.parse(this.#forestryFile).name)
                    : 0;

            const admCode = 0;
            // path.parse(this.#forestryFile).name.indexOf('-') &&
            // !isNaN(path.parse(this.#forestryFile).name.split('-')[1])
            //     ? Number(path.parse(this.#forestryFile).name.split('-')[1])
            //     : 0;

            if (this.#mapFile['districtForestries']) {
                const forestryIndex = this.#mapFile[
                    'districtForestries'
                ].findIndex((districtItem) => {
                    return (
                        isStringEqual(districtItem[1], this.#forestryMain) ==
                            0 &&
                        isStringEqual(districtItem[2], this.#forestryRegion) ==
                            0 &&
                        (!this.#forestryDistrict ||
                            isStringEqual(
                                districtItem[0],
                                this.#forestryDistrict
                            ) == 0) &&
                        (tractCode == 0 || districtItem[5] == tractCode) &&
                        (!this.#forestryTract ||
                            isStringEqual(
                                districtItem[3],
                                this.#forestryTract
                            ) == 0) &&
                        (admCode == 0 || districtItem[6] == admCode)
                    );
                });
                // console.log(
                //     this.#forestryDistrict,
                //     this.#forestryTract,
                //     this.#forestryMain,
                //     this.#forestryRegion,

                //     tractCode,
                //     admCode,
                //     forestryIndex
                // );
                //console.log(this.#forestryAllCodes, 'ALL_CODES');
                if (forestryIndex > -1) {
                    //this.#forestryMain =
                    //    this.#mapFile['districtForestries'][forestryIndex][1];

                    this.#forestryDistrict =
                        this.#mapFile['districtForestries'][forestryIndex][0];
                    this.#forestryTract =
                        this.#mapFile['districtForestries'][forestryIndex][3];
                    const regionCode =
                        this.#mapFile['districtForestries'][forestryIndex][4];

                    // console.log(
                    //     this.#forestryTract,
                    //     this.#forestryMain,
                    //     this.#forestryRegion,
                    //     regionCode,
                    //     tractCode,
                    //     admCode,

                    //     'Заголовок таблицы лесничеств'
                    // );

                    this.#forestryAllCodes['F_REG'] = Number(
                        regionCode.split(':')[0]
                    );
                    this.#forestryAllCodes['F_MAIN'] = Number(
                        regionCode.split(':')[1]
                    );
                    this.#forestryAllCodes['F_DIST'] = Number(
                        regionCode.split(':')[2]
                    );
                    this.#forestryAllCodes['F_TRACT'] = Number(
                        this.#mapFile['districtForestries'][forestryIndex][5]
                    );
                    this.#forestryAllCodes['F_ADM'] = Number(
                        this.#mapFile['districtForestries'][forestryIndex][6]
                    );
                }
            }

            if (
                isNaN(this.#forestryAllCodes['F_REG']) ||
                Number(this.#forestryAllCodes['F_REG']) < 1
            )
                this.#forestErrorList.set(
                    'F_CODE_REG_ERROR',
                    `Не удалось найти код региона ${
                        this.#forestryRegion
                    } в map файле`
                );
            if (
                isNaN(this.#forestryAllCodes['F_MAIN']) ||
                Number(this.#forestryAllCodes['F_MAIN']) < 1
            )
                this.#forestErrorList.set(
                    'F_CODE_MAIN_ERROR',
                    `Не удалось найти код лесничества ${
                        this.#forestryMain
                    } в map файле`
                );
            if (
                isNaN(this.#forestryAllCodes['F_DIST']) ||
                Number(this.#forestryAllCodes['F_DIST']) < 1
            )
                this.#forestErrorList.set(
                    'F_CODE_DIST_ERROR',
                    `Не удалось найти код участкового лесничества ${
                        this.#forestryMain
                    } в map файле`
                );
            if (
                isNaN(this.#forestryAllCodes['F_TRACT']) ||
                Number(this.#forestryAllCodes['F_TRACT']) < 1
            )
                this.#forestErrorList.set(
                    'F_CODE_TRACT_ERROR',
                    `Не удалось найти код урочища ${
                        this.#forestryTract
                    } в map файле`
                );

            // Если обнаружены критические ошибки выходим из функции инициализации парсера
            if (this.#forestErrorList.size > 0) return;
        } catch (err) {
            this.#forestErrorList.set(
                'INIT_PARAMS',
                `Во время инициализации исходных данных произошла ошибка - [${err}]`
            );
        }
    };

    // Получаем код породы по ее наименованию
    #getComposeCodeByName = (composeName) => {
        let resultCode = '';
        //console.log(composeName, 'Проверка текущей породы');
        if (composeName) {
            const treeIndex = this.#mapFile['treeNew'].findIndex((treeItem) => {
                return isStringEqual(composeName, treeItem[0]) == 0;
            });
            if (treeIndex > -1) {
                resultCode = this.#mapFile['treeNew'][treeIndex][1] || '';
            }
        }

        return resultCode;
    };

    // Получаем сокращенное наименование культуры для записи в колонку KZ_NAME
    #getShortCategoryName = (landCategory) => {
        let shortCategoryName = landCategory;

        // Пробуем найти короткое имя для текущей категории земель для записи информации в DBF
        lotExtraLandType.every((item) => {
            return (
                item.value.split('|').findIndex((landTypeItem, index) => {
                    if (
                        isStringEqual(landTypeItem, landCategory) == 0 ||
                        isStringEqual(landCategory, landTypeItem, true) == 0
                    ) {
                        //console.log(landTypeItem, landCategory, item.short);
                        if (item.short) shortCategoryName = item.short;
                        return true;
                    }
                }) == -1
            );
        });
        return shortCategoryName;
    };

    // Вовращаем код категории земель по описанию основной породы для записи в колонки ZK и ZKG
    #getLandCodeByVMR = (compositions) => {
        for (const composition of compositions) {
            if (
                composition['LN'] &&
                !this.#checkForLandCategory(composition['LN']).hasMR
            ) {
                return composition['LCODE'];
            }
        }
        // Если основная порода не найдена, то добавляем код по коренной
        return compositions[0]['LCODE'];
    };

    // Возвращаем основную или коренную породу для текущего описания пород для записи в колонки VMR и MR
    #getMrOrVmrComposition = (compositions, mrType = 'VMR') => {
        // Вначале ищем главную породу среди описания пород лесных земель
        if (mrType == 'VMR') {
            for (const composition of compositions) {
                if (
                    composition['CN'] &&
                    composition['LN'] &&
                    this.#checkForCompositition(composition['CN'])
                        .isComposition &&
                    !this.#checkForLandCategory(composition['LN']).hasMR
                ) {
                    return this.#checkForCompositition(composition['CN'], 0)
                        .name;
                }
            }
        }
        // Если не находим главную породу в описании пород лесных земель берем ее из коренной породы
        for (const composition of compositions) {
            if (
                composition['LN'] &&
                composition['detailes'] &&
                this.#checkForLandCategory(composition['LN']).hasMR
            ) {
                return composition['detailes'].length > 0
                    ? this.#checkForCompositition(
                          `0${composition['detailes'][0]['CN']}`
                      ).name || ''
                    : '';
            }
        }
        // Иначе возвращаем пустотую породу
        return '';
    };

    // Возвращаем код породы по ее описанию
    #getUsekNumberByComposition = (composition) => {
        const treeIndex = this.#mapFile['treeNew'].findIndex(
            (treeItem, index) => {
                return (
                    index > 0 && isStringEqual(composition, treeItem[1]) == 0
                );
            }
        );
        return Number(
            treeIndex > -1 ? this.#mapFile['treeNew'][treeIndex][4] : 0
        );
    };

    // Форматирование значения по типу колонки БД
    #formatValueByField = (value, fieldName) => {
        const dbField = this.#dbFields.find((field) => field.name == fieldName);
        return this.#formatField(
            value,
            dbField.type,
            dbField.size,
            dbField.decimalPlaces ? dbField.decimalPlaces : 0,
            false
        );
    };

    // Функция для парсинга наличия текущего хозяйственного мероприятия
    #checkForCurrentActivity = (activity) => {
        return (
            lotActivities.findIndex((activityItem) => {
                return isStringEqual(activity, activityItem.mask, true) > -1;
            }) > -1
        );
    };

    // Функция пытается парсить титульный лист таксационной карты
    #checkForForestryTitul = async (textContent) => {
        if (this.#currentStep == searchStep.stepTitul) {
            //console.log('Parse forestry');
            // const mainMask = [
            //     'Лесничество: ',
            //     'Лес-во: ',
            //     'Лесничество ',
            //     'Лес-во ',
            // ];
            // const districtMask = [
            //     'Уч.л-во: ',
            //     'Уч.л-во ',
            //     'Участковое лес-во: ',
            //     'Участковое лес-во ',
            //     'Участковое лесничество: ',
            //     'Участковое лесничество ',
            // ];
            // const tractMask = ['Урочище: ', 'Урочище '];

            // mainMask.forEach((item) => {
            //     if (textContent.trim().search(item) == 0 && !this.#forestryMain)
            //         this.#forestryMain = textContent.replace(item, '').trim();
            // });
            // districtMask.forEach((item) => {
            //     if (
            //         textContent.trim().search(item) == 0 &&
            //         !this.#forestryDistrict
            //     ) {
            //         this.#forestryDistrict = textContent
            //             .replace(item, '')
            //             .trim();
            //     }
            // });
            // tractMask.forEach((item) => {
            //     if (
            //         textContent.trim().search(item) == 0 &&
            //         !this.#forestryTract
            //     )
            //         this.#forestryTract = textContent.replace(item, '').trim();
            // });

            if (textContent.search('по состоянию ') >= 0) {
                // Нашли год обследования
                if (textContent.match(/\d+\.?/g)) {
                    const currentYear = Number(
                        textContent.match(/\d+\.?/g)[
                            textContent.match(/\d+\.?/g).length - 1
                        ]
                    );
                    this.#actualYear =
                        currentYear < 100 && currentYear > 0
                            ? currentYear < new Date().getYear() - 100
                                ? 2000 + currentYear
                                : 1900 + currentYear
                            : currentYear > 0
                            ? currentYear
                            : 0;
                }
            }
        }
        // Если мы находим категорию защитности или начало повление кварталов, то переключаемся на следующий шаг парсинга
        if (
            textContent.search(/Квартал /i) > -1 ||
            textContent.search(/Квартал: /i) > -1 ||
            textContent.search(this.#forestryMain) > 0 ||
            textContent.search(this.#forestryDistrict) > 0 ||
            textContent.search(/Категория защ/i) > 0 ||
            textContent.search(/Категория лесов/i) > 0 ||
            textContent.search(/Целевое назн/i) > 0
        ) {
            //console.log('Начинаем парсинг параметров лесничества');
            // Ищем и присваиваем требуемые кода для заполнения DBF файла (регион, лесничество, урочище, GIR, административный район) и считываем данные таксационного описания лесничества
            await this.#parseForestryCodesAndContent();
            // Далее  переходим на шаг поиска кварталов
            this.#currentStep = searchStep.stepKvartal;
        }
    };

    // Функция проверяет тип объекта текущей строки: квартал, выдел, порода, дополнение или статистика
    #checkForForestryFeature = (textContent) => {
        // Проверяем на наличие данных по кварталу
        if (this.#checkForKvartal(textContent)) {
            // Распарсиваем данные урочища, защитной категории леса и новый номер квартала
            this.#parseKvartalContent(textContent);

            // Проверяем на завершение таксационной карты
            if (this.#checkForForesterySummary(textContent)) {
                this.#currentFeatureType = featureType.final;
            }

            return;
            //this.#currentFeatureType = featureType.kvartal;
            // Если обнаруживаем данные для пропуска проверки на элементы леса, то выходим из функции
        } else if (this.#checkForTableHeader(textContent)) {
            return;
        } // Проверяем на наличие статистики по кварталу
        else if (this.#checkForKvartalSummary(textContent)) {
            this.#currentFeatureType = featureType.summary;
            // Проверяем начало нового выдела и при его наличии переходим на шаг MAIN_FEATURE
            // Чтобы отделить номер выдела от статистики по площади квартала считываем первые две колонки и ищем обязательный пробел между номером и площадью выдела,
            // если находим, то это именно номер выдела, а не общая площадь по кварталу
        } else if (
            this.#checkForNewLotArea(
                this.#getColumnHeaderValue(textContent, ['0-1'], '')
            ).isNewLot
        ) {
            // Если нашли начало нового выдела присваиваем необходимые сущности
            this.#currentStep = searchStep.stepFeature;
            this.#currentFeatureType = featureType.main;
            this.#currentLot = this.#checkForNewLotArea(
                this.#getColumnHeaderValue(textContent, ['0-1'], '')
            ).lotId;
            this.#countLots++;
            this.#countLotsByKvartal++;
            this.#forestryResult[this.#currentKvartal].lots[this.#currentLot] =
                {
                    compositions: [],
                    additions: [],
                    // Площадь выдела
                    kvArea: this.#checkForNewLotArea(
                        this.#getColumnHeaderValue(textContent, ['0-1'], '')
                    ).lotArea,
                    // Записываем код категории защитности леса
                    FP_CODE: this.#checkForProtectedForest(
                        this.#currentProtectZone
                    ).pzCode,
                };
            this.#currentComposition =
                this.#currentLandType =
                this.#currentLandName =
                this.#currentLandCode =
                    null;
            // console.log(
            //     `Нашли новый выдел ${this.#currentLot} в кварталк ${
            //         this.#currentKvartal
            //     }`
            // );
        }
        // Проверяем на наличии дополнений для описания выдела при условии, что отсутствуют лесные культуры в колонке 3 таблицы (описание и состав)
        else if (
            this.#currentFeatureType == featureType.main &&
            this.#checkForLandCategory(
                this.#getColumnHeaderValue(textContent, ['2-22'], '')
            ).landCode == -1 &&
            this.#checkForLotAdditional(
                this.#getColumnHeaderValue(textContent, ['2-22'], ''),
                true
            ).isAdditional
        ) {
            this.#currentFeatureType = featureType.addition;
        }

        // Проверем наличие новой категории и/или описания пород леса
        if (
            this.#currentStep == searchStep.stepFeature &&
            this.#currentFeatureType == featureType.main
        ) {
            // Если это не состав пород, тогда это текущая категория леса
            // Если текущая категория леса Единичные деревья, то добавляем 0,так как коэффициент породы может отсутствовать!
            const compositionText = `${
                // this.#checkForLandInTier(this.#currentLandName) &&
                !this.#checkForCompositition(
                    this.#getColumnHeaderValue(textContent, [2], '')
                ).isComposition &&
                (this.#getColumnHeaderValue(textContent, [2], '') ==
                    this.#getColumnHeaderValue(textContent, [5], '') ||
                    (this.#getColumnHeaderValue(textContent, [5], '') &&
                        this.#checkForCompositition(
                            `0${this.#getColumnHeaderValue(
                                textContent,
                                [5],
                                ''
                            )}`
                        ).isComposition))
                    ? '0'
                    : ''
            }${this.#getColumnHeaderValue(textContent, [2], '')}`;

            const { isComposition, fullName: compositionFullName } =
                this.#checkForCompositition(compositionText);
            // if (this.#currentKvartal == 27 && this.#currentLot == 18)
            //     console.log(
            //         compositionText,
            //         this.#getColumnHeaderValue(textContent, [2], ''),
            //         compositionFullName
            //     );

            const { compositions, hasCompositions } =
                this.#checkForCompositionsAndAdditions();
            // Если это породный состав, а также присутствуют ярус и высота яруса, то добавляем его в описание выдела
            if (!hasCompositions) compositions.push({});
            let lastComposition = compositions[compositions.length - 1];

            if (isComposition) {
                this.#currentCompositionType = composeType.culture;

                if (
                    Number(this.#getColumnHeaderValue(textContent, [3], '')) >
                        0 ||
                    Number(this.#getColumnHeaderValue(textContent, [4], '')) >
                        0 ||
                    this.#checkForCompositition(
                        `0${this.#getColumnHeaderValue(textContent, [5], '')}`
                    ).isComposition // &&
                    //this.#getColumnHeaderValue(textContent, [12], '')
                ) {
                    //if (compositions.length == 0) compositions.push({});

                    if (
                        !this.#currentComposition ||
                        Number(
                            this.#getColumnHeaderValue(textContent, [3], '')
                        ) > 0 ||
                        Number(
                            this.#getColumnHeaderValue(textContent, [4], '')
                        ) > 0
                    ) {
                        // if (this.#currentKvartal == 1 && this.#currentLot == 30)
                        //     console.log(
                        //         this.#currentKvartal,
                        //         this.#currentLot,
                        //         this.#currentComposition,
                        //         'Мы в добавлении описания пород'
                        //     );
                        // Если у нас уже есть описание пород и это новое описание или предыдущая категория земель содержит коренную породу начинаем новое описаие
                        if (
                            this.#currentComposition &&
                            (this.#currentComposition !== compositionFullName ||
                                this.#checkForLandCategory(
                                    this.#currentLandName
                                ).hasMR)
                        ) {
                            compositions.push({});
                            lastComposition =
                                compositions[compositions.length - 1];
                        }

                        if (this.#currentComposition !== compositionFullName) {
                            if (this.#currentComposition)
                                this.#currentLandName = '';
                            this.#currentComposition = compositionFullName;
                            this.#currentLandType = 'лесные земли';
                        }

                        if (!this.#currentLandName) {
                            this.#currentLandName =
                                'Естественное происхождение';
                            this.#currentLandCode = 1101;
                        }

                        lastComposition = compositions[compositions.length - 1];

                        lastComposition['CN'] = this.#currentComposition;
                        lastComposition['CT'] = this.#currentCompositionType;
                        lastComposition['LN'] = this.#currentLandName;
                        lastComposition['LT'] = this.#currentLandType;
                        lastComposition['LCODE'] = this.#currentLandCode;

                        this.#currentLandName = '';
                    } else {
                        this.#currentComposition = `${
                            this.#currentComposition
                        }${compositionFullName}`;
                        lastComposition['CN'] = this.#currentComposition;
                    }
                    // В случае, если мы на описании композиции, но это не описание главной породы, а продолжение длинного описания текущей породы, добавляем его к общему описанию
                } else {
                    this.#currentComposition = `${
                        this.#currentComposition
                    }${compositionFullName}`;
                    lastComposition['CN'] = this.#currentComposition;
                }
                // if (
                //     (Number(this.#getColumnHeaderValue(textContent, [3], '')) >
                //         0 ||
                //     Number(this.#getColumnHeaderValue(textContent, [4], '')) >
                //         0) &&
                //     this.#checkForCompositition(
                //         `0${this.#getColumnHeaderValue(textContent, [5], '')}`
                //     ).isComposition
                // ) {
                //     if (this.#currentComposition) {

                //     } else {
                //         this.#currentComposition = compositionFullName;
                //     }

                // }
                // else {
                //     this.#currentComposition = `${
                //         this.#currentComposition
                //     }${compositionFullName}`;
                //     lastComposition['CN'] = this.#currentComposition;
                //     console.log(
                //         this.#currentKvartal,
                //         this.#currentLot,
                //         this.#currentComposition,
                //         'Обновляем текущую категорию земель'
                //     );
                // }
                // Проверяем является ли данная категория лесных земель дополнительным хоз-мероприятием и если да, то выходим из процедуры поиска и обновления категории
            } else if (
                !this.#checkForLotAdditional(textContent, true).isActivity
            ) {
                // Проверяем, если в колонке состава выдела есть какое-то наименование сущности, но оно не состав пород, то мы попали на новую категорию земель
                if (
                    this.#getColumnHeaderValue(textContent, [2], '')
                        .slice(0, 5)
                        .trim()
                ) {
                    const newLandName = this.#getColumnHeaderValue(
                        textContent,
                        Number(
                            this.#getColumnHeaderValue(textContent, [3], '')
                        ) > 0
                            ? [2]
                            : Number(
                                  this.#getColumnHeaderValue(
                                      textContent,
                                      [4],
                                      ''
                                  )
                              ) > 0
                            ? ['2-3']
                            : this.#checkForCompositition(
                                  `0${this.#getColumnHeaderValue(
                                      textContent,
                                      [5],
                                      ''
                                  )}`
                              ).isComposition
                            ? ['2-4']
                            : Number(
                                  this.#getColumnHeaderValue(
                                      textContent,
                                      [9],
                                      ''
                                  )
                              ) > 0 ||
                              Number(
                                  this.#getColumnHeaderValue(
                                      textContent,
                                      [10],
                                      ''
                                  )
                              ) > 0
                            ? ['2-8']
                            : Number(
                                  this.#getColumnHeaderValue(
                                      textContent,
                                      [11],
                                      ''
                                  )
                              ) > 0 ||
                              this.#getColumnHeaderValue(
                                  textContent,
                                  [11],
                                  ''
                              ) == '-'
                            ? ['2-10']
                            : ['2-11']
                    ).trim();

                    // Проверяем является ли данная категория лесных земель самостоятельной (имеет код в классификаторе) и если нет, считаем данное описание продолжением наименования предыдущего названия категории
                    let { landName, landType, compositionType, landCode } =
                        this.#checkForLandCategory(newLandName, true);

                    let isNewCategory = true;
                    // Если категория лесных земель не найдена в классификаторе, тогда считаем ее продолжением наименования предыдущей категории
                    if (landCode < 1) {
                        const newCategory = this.#checkForLandCategory(
                            `${
                                this.#currentLandName
                                    ? this.#currentLandName + ' '
                                    : ''
                            }${
                                newLandName.indexOf(' ') > -1
                                    ? newLandName.slice(
                                          0,
                                          newLandName.indexOf(' ')
                                      )
                                    : newLandName
                            }`,
                            true
                        );

                        landName = newCategory.landName;
                        landType = newCategory.landType;
                        compositionType = newCategory.compositionType;
                        landCode = newCategory.landCode;
                        isNewCategory = false;
                    }

                    // if (this.#currentKvartal == 70 && this.#currentLot == 9) {
                    //     console.log(
                    //         newLandName,
                    //         landName,
                    //         landType,
                    //         landCode,
                    //         compositionType,
                    //         isNewCategory,
                    //         'На дополнение!'
                    //     );
                    // }

                    this.#currentCompositionType = compositionType;
                    this.#currentComposition = '';

                    if (this.#currentCompositionType == composeType.object) {
                        //Если найденная категория не является землями леса, то пытаемся отделить наименование земли и описание ее дополнительной характеристики
                        // const fullLandName = this.#getColumnHeaderValue(
                        //     textContent,
                        //     ['2-22'],
                        //     ''
                        // ).trim();

                        // if (fullLandName.trim().indexOf('  ') > -1) {

                        //     landName = fullLandName.split('  ')[0].trim();
                        //     // landDetailes = fullLandName.slice(
                        //     //     fullLandName.indexOf('  ') + 2
                        //     // )
                        //     //     ? fullLandName
                        //     //           .slice(fullLandName.indexOf('  ') + 2)
                        //     //           .trim()
                        //     //     : '';
                        // }

                        // В случае отсутствия кода категории пытаемся повторно ее определить для целей логирования отсутствия данных
                        if (landCode < 1) {
                            //const { landCode, landName } =
                            //this.#checkForLandCategory(newLandName, true);
                            //this.#currentLandName = landName;
                            //this.#currentLandCode = landCode;

                            lastComposition['CT'] =
                                this.#currentCompositionType;
                            lastComposition['LN'] = newLandName;
                            lastComposition['LT'] = landType;
                            lastComposition['LCODE'] = landCode;
                        } else {
                            this.#currentLandName = landName;
                            this.#currentLandCode = landCode;
                            this.#currentLandType = landType;

                            lastComposition['CT'] =
                                this.#currentCompositionType;
                            lastComposition['LN'] = this.#currentLandName;
                            lastComposition['LT'] = this.#currentLandType;
                            lastComposition['LCODE'] = this.#currentLandCode;

                            this.#currentFeatureType = featureType.addition;
                        }
                    } else {
                        // Прежде чем проверять наличие сложной категории земель вначале проверяем на наличие описания пород в строке и
                        // если находим описание пород и при этом у нас нет текущего описания пород - обновляем его
                        if (
                            newLandName.indexOf('  ') > -1 &&
                            !lastComposition['CN'] &&
                            this.#checkForCompositition(
                                newLandName
                                    .slice(newLandName.indexOf('  ') + 2)
                                    .trim()
                            ).isComposition
                        ) {
                            this.#currentComposition = newLandName
                                .slice(newLandName.indexOf('  ') + 2)
                                .trim();

                            lastComposition['CN'] = this.#currentComposition;
                            // console.log(
                            //     this.#currentComposition,
                            //     this.#currentKvartal,
                            //     this.#currentLot,
                            //     'Нашли в строке категории земель описание пород деревьев'
                            // );
                        }

                        // console.log(
                        //     this.#currentKvartal,
                        //     this.#currentLot,
                        //     this.#currentLandName,
                        //     landName,
                        //     'Текущая добавка к породе'
                        // );

                        if (this.#currentLandName !== landName) {
                            // Проверяем на обнаружение дополнения к наименованию категории культуры
                            // Присваиваем имененное значение описание категории лесных земель в описание композиции и проверяем код категории
                            this.#currentLandName = landName;
                            // Если обнаруживаем новое описание категории земель, добавляем его в описание категории леса
                            if (landCode > 0 && isNewCategory) {
                                if (lastComposition['LN'])
                                    compositions.push({});

                                lastComposition =
                                    compositions[compositions.length - 1];
                                this.#currentLandCode = landCode;
                                lastComposition['LN'] = this.#currentLandName;

                                lastComposition['CT'] =
                                    this.#currentCompositionType;
                                lastComposition['LT'] = landType;
                                lastComposition['LCODE'] =
                                    this.#currentLandCode;
                                // Обнуляем предыдущее описание пород
                                this.#currentComposition = '';
                            } else if (!isNewCategory) {
                                // Если мы нашли добавку к текущей категории, обновляем наименование данной категории в описании пород текущего выдела
                                lastComposition['LN'] = this.#currentLandName;

                                if (landCode > 0) {
                                    this.#currentLandCode = landCode;
                                    lastComposition['LCODE'] =
                                        this.#currentLandCode;
                                }
                            }
                        }
                    }
                }

                //}
            }
        }
    };

    #parseLotContent = (textContent) => {
        // Проверем, не попали ли мы в заголовок таблицы или верхний колонтитул страницы, если да, то пропускаем парсинг
        if (
            this.#checkForTableHeader(textContent) ||
            this.#checkForKvartal(textContent)
        )
            return;

        if (this.#currentStep == searchStep.stepFeature) {
            const {
                hasCompositions,
                compositions: lotCompositions,
                hasAdditions,
                additions: lotAdditions,
                currentLot,
            } = this.#checkForCompositionsAndAdditions();

            switch (this.#currentFeatureType) {
                case featureType.addition:
                    let {
                        isAdditional,
                        isActivity,
                        activityName,
                        name,
                        value,
                    } = this.#checkForLotAdditional(
                        this.#getColumnHeaderValue(textContent, ['2-23'], '')
                    );

                    // Проверяем, чтобы мы были не на основной строке описания сущности и категория земель была лесные земли
                    if (isAdditional) {
                        // Проверяем на наличие хозмероприятий, и если они есть, добавляем их в группу описания пород
                        if (
                            value.length -
                                (this.#getColumnHeaderValue(
                                    textContent,
                                    [23],
                                    ''
                                ).length +
                                    value
                                        .slice(
                                            0,
                                            -this.#getColumnHeaderValue(
                                                textContent,
                                                [23],
                                                ''
                                            ).length
                                        )
                                        .trim().length) >
                                15 &&
                            this.#getColumnHeaderValue(
                                textContent,
                                [23],
                                ''
                            ).trim() &&
                            this.#parseCompositionActivities(
                                this.#getColumnHeaderValue(
                                    textContent,
                                    [23],
                                    ''
                                ),
                                false,
                                false
                            )
                        ) {
                            // Добавляем новое хозмероприятие в группу хоз/мероприятий
                            if (!currentLot['FA']) currentLot['FA'] = [];
                            currentLot['FA'].push(
                                this.#getColumnHeaderValue(
                                    textContent,
                                    [23],
                                    ''
                                )
                            );
                            value = value
                                .slice(
                                    0,
                                    value.indexOf(
                                        this.#getColumnHeaderValue(
                                            textContent,
                                            [23],
                                            ''
                                        )
                                    ) - 1
                                )
                                .trim();
                            // Если после удаления мероприятия ничего не остается выходим из процедуры добавления дополнения
                            if (!value) return;
                        }
                        // Если в дополнеии присутствует 2 пробела и строка начинается с 1-го символа, то это вероятно часть от наименования категории земель - добавляем ее в текущее описание
                        if (
                            name.indexOf('  ') > -1 &&
                            name.slice(0, 5).trim()
                        ) {
                            // Если мы нашли новую добавку к категории земель присваиваем ее
                            const { landName, landCode } =
                                this.#checkForLandCategory(
                                    `${this.#currentLandName} ${
                                        isStringEqual(
                                            this.#currentLandName,
                                            name.split('  ')[0].trim()
                                        ) < 0
                                            ? ' ' + name.split('  ')[0].trim()
                                            : ''
                                    }`
                                );
                            if (hasCompositions && landCode > -1) {
                                this.#currentLandName = landName;
                                this.#currentLandCode = landCode;
                                lotCompositions[lotCompositions.length - 1][
                                    'LN'
                                ] = this.#currentLandName;
                                lotCompositions[lotCompositions.length - 1][
                                    'LCODE'
                                ] = this.#currentLandCode;
                            }
                            name = name.slice(name.indexOf('  ') + 2).trim();
                        }

                        // Далее проверяем, если в одной строке у нас есть несколько дополнений, то просматриваем все и добавляем в описание пород
                        if (
                            textContent.trim().indexOf(':') > -1 &&
                            isStringEqual(textContent.trim(), name) > 0
                        ) {
                            const complexAdditional = `${name} ${value}`;
                            this.#extractFromComplexAdditional(
                                complexAdditional
                            ).forEach((additionItem) => {
                                const {
                                    isAdditional: hasAdditional,
                                    name,
                                    value,
                                } = this.#checkForLotAdditional(
                                    additionItem.trim()
                                );
                                if (hasAdditional && value) {
                                    lotAdditions.push({ name, value });
                                }
                            });
                        } else lotAdditions.push({ name, value });
                    } else {
                        // Проверяем, если наименование категории является хозмероприятием - добавляем его в дополнение и выходим из дальнейшего рассмотрения дополнений
                        if (isActivity) {
                            lotCompositions[0]['LN'] = activityName;
                            // Проверяем на наличие хозмероприятий, и если они есть, добавляем их
                            value = this.#parseAdditionalAndAddActivity(
                                textContent,
                                value,
                                currentLot
                            );

                            lotAdditions.push({ name, value });
                            // После проверки при положительном результате дальнейшие действия не проводим
                            return;
                        }
                        if (
                            // Если это не целое дополнение, то добавляем его в значение параметра дополнения для нелесных земель предыдущей итерации
                            //console.log(name, value, 'Добавление к дополнению');
                            hasAdditions &&
                            textContent.trim() &&
                            Number(
                                this.#getColumnHeaderValue(textContent, [0], '')
                            ) == 0
                        ) {
                            textContent = this.#getColumnHeaderValue(
                                textContent,
                                ['2-22'],
                                ''
                            ).trim();
                            // Если в добавке к дополнению присутствует 2 пробела, то это вероятно часть от наименования категории земель - добавляем ее в текущее описание
                            if (
                                textContent.indexOf('  ') > -1 &&
                                this.#currentCompositionType ==
                                    composeType.object
                            ) {
                                // Если мы нашли новую добавку к категории земель присваиваем ее
                                const { landName, landCode } =
                                    this.#checkForLandCategory(
                                        `${this.#currentLandName} ${textContent
                                            .split('  ')[0]
                                            .trim()}`
                                    );
                                if (hasCompositions && landCode > -1) {
                                    this.#currentLandName = landName;
                                    this.#currentLandCode = landCode;
                                    lotCompositions[lotCompositions.length - 1][
                                        'LN'
                                    ] = this.#currentLandName;
                                    lotCompositions[lotCompositions.length - 1][
                                        'LCODE'
                                    ] = this.#currentLandCode;
                                }

                                textContent = textContent
                                    .slice(textContent.indexOf('  ') + 2)
                                    .trim();
                            }
                            const lastAddition =
                                lotAdditions[lotAdditions.length - 1];
                            if (lastAddition.value && textContent)
                                lastAddition.value += ' ' + textContent.trim();
                        }
                    }
                    break;
                case featureType.main:
                    // Если категория земель нелесные земли, то выходим из процедуры добавления описания
                    if (this.#currentCompositionType == composeType.object) {
                        // Проверяем наличие хоз. мероприятий и если есть, то добавляем информацию в выдел
                        this.#addSingleCompositToLot(
                            textContent,
                            this.#currentCompositionType
                        );
                        return;
                    }

                    // Если мы на этапе парсинга пород в выделе, то проверяем, находимся ли мы на главной строке
                    // Если мы на главной строке выдела, то парсим общие сведения для всего выдела и затем записываем сведения индивидуально по каждой породе
                    if (!hasCompositions) lotCompositions.push({});
                    const currentComposition =
                        lotCompositions[lotCompositions.length - 1];
                    // Если мы находимся на описании пород и присутствует номер и высота яруса или тип леса, то считываем информацию в текущий выдел
                    if (
                        Number(
                            this.#getColumnHeaderValue(textContent, [3], '') > 0
                        ) ||
                        (this.#getColumnHeaderValue(textContent, [12], '') &&
                            !currentComposition['TLU'])
                    ) {
                        // Проверяем, если наименование категории является хозмероприятием - добавляем его в дополнение, иначе рассматриваем как новую категорию
                        let { isActivity, activityName, name, value } =
                            this.#checkForLotAdditional(textContent);
                        if (isActivity) {
                            this.#currentLandName = activityName;
                            currentComposition['LN'] = this.#currentLandName;
                            //this.#currentLandName;

                            // Проверяем на наличие хозмероприятий, и если они есть, добавляем их
                            value = this.#parseAdditionalAndAddActivity(
                                textContent,
                                value,
                                currentLot
                            );

                            lotAdditions.push({ name, value });
                            // После проверки при положительном результате дальнейшие действия не проводим
                            return;
                        }
                        // Мы на строке с превалирующей породой
                        // Заносим данные общие для всего породного состава
                        textContent = textContent.replaceAll(/,(\d+)/g, '.$1');

                        // Вообще перестаем добавлять ярус для породы, так как будем ориентироваться на ярус категории земель и ярус текущей породы
                        // if (!currentComposition['FL'])
                        //     currentComposition['FL'] =
                        //         Number(
                        //             this.#getColumnHeaderValue(
                        //                 textContent,
                        //                 [3],
                        //                 ''
                        //             )
                        //         ) > 0
                        //             ? Number(
                        //                   this.#getColumnHeaderValue(
                        //                       textContent,
                        //                       [3],
                        //                       ''
                        //                   )
                        //               )
                        //             : this.#checkForLandCategory(
                        //                   currentComposition['LN']
                        //               ).landTier;

                        if (
                            Number(
                                this.#getColumnHeaderValue(textContent, [4], '')
                            ) > 0
                        )
                            currentComposition['FLH'] = Number(
                                this.#getColumnHeaderValue(textContent, [4], '')
                            );

                        currentComposition['FC'] = this.#getColumnHeaderValue(
                            textContent,
                            [5],
                            ''
                        );

                        // if (this.#getColumnHeaderValue(textContent, [14], ''))
                        //     currentComposition['TS'] =
                        //         this.#getColumnHeaderValue(
                        //             textContent,
                        //             [14],
                        //             ''
                        //         );

                        if (this.#getColumnHeaderValue(textContent, [9], ''))
                            currentComposition['AC'] =
                                this.#getColumnHeaderValue(
                                    textContent,
                                    [9],
                                    ''
                                );

                        if (
                            Number(
                                this.#getColumnHeaderValue(
                                    textContent,
                                    [10],
                                    ''
                                )
                            ) > 0
                        )
                            currentComposition['AG'] = Number(
                                this.#getColumnHeaderValue(
                                    textContent,
                                    [10],
                                    ''
                                )
                            );
                        if (
                            Number(
                                this.#getColumnHeaderValue(
                                    textContent,
                                    [11],
                                    ''
                                )
                            ) > 0
                        )
                            currentComposition['FB'] = Number(
                                this.#getColumnHeaderValue(
                                    textContent,
                                    [11],
                                    ''
                                )
                            );
                        if (
                            Number(
                                this.#getColumnHeaderValue(
                                    textContent,
                                    [15],
                                    ''
                                )
                            ) > 0
                        )
                            currentComposition['FLR'] = Number(
                                this.#getColumnHeaderValue(
                                    textContent,
                                    [15],
                                    ''
                                )
                            );

                        if (
                            Number(
                                this.#getColumnHeaderValue(
                                    textContent,
                                    [21],
                                    ''
                                )
                            ) > 0
                        )
                            currentComposition['FLC'] = Number(
                                this.#getColumnHeaderValue(
                                    textContent,
                                    [21],
                                    ''
                                )
                            );
                        if (
                            Number(
                                this.#getColumnHeaderValue(
                                    textContent,
                                    [22],
                                    ''
                                )
                            ) > 0
                        )
                            currentComposition['FLD'] = Number(
                                this.#getColumnHeaderValue(
                                    textContent,
                                    [22],
                                    ''
                                )
                            );

                        this.#addSingleCompositToLot(textContent);
                        // Для добавления индивидуальной породы проверяем, чтобы в выделе уже было описание категории земель и/или состава пород
                        // Для добавления хозмероприятий смотрим также на наличие категории лесных земель
                    } else if (
                        currentComposition['CN'] ||
                        currentComposition['LN']
                    ) {
                        // Проверяем, если текущая строка является хозмероприятием - добавляем его в дополнение, иначе рассматриваем как дополнительное описание породы леса
                        let { isActivity, activityName, name, value } =
                            this.#checkForLotAdditional(textContent);
                        if (isActivity) {
                            this.#currentLandName = activityName;
                            currentComposition['LN'] = this.#currentLandName;
                            value = this.#parseAdditionalAndAddActivity(
                                textContent,
                                value,
                                currentLot
                            );
                            lotAdditions.push({ name, value });

                            // После проверки при положительном результате дальнейшие действия не проводим
                            return;
                        }
                        this.#addSingleCompositToLot(textContent);
                    }
                    break;
            }
        }
    };

    #parseAdditionalAndAddActivity = (
        textContent,
        activitiValue,
        currentLot
    ) => {
        if (
            activitiValue.length -
                activitiValue
                    .slice(
                        0,
                        -this.#getColumnHeaderValue(textContent, [23], '')
                            .length
                    )
                    .trim().length >
                20 &&
            this.#getColumnHeaderValue(textContent, [23], '').trim()
        ) {
            if (!currentLot['FA']) currentLot['FA'] = [];

            currentLot['FA'].push(
                this.#getColumnHeaderValue(textContent, [23], '')
            );
            activitiValue = activitiValue
                .slice(
                    0,
                    -this.#getColumnHeaderValue(textContent, [23], '').length
                )
                .trim();
        }

        return activitiValue;
    };

    // Функция поиска категории защитных лесных земель
    #parseProtecteZoneOzu = (protectZoneOzu) => {
        let resultZoneOzuId = 7;

        let zoneOzuIndex = this.#mapFile['nameProtectedForests'].findIndex(
            (zoneOzuItem) => {
                return (
                    isStringEqual(protectZoneOzu, zoneOzuItem[0]) == 0 &&
                    Number(this.#mapFile['nameProtectedForests'][2]) > 0
                );
            }
        );

        if (zoneOzuIndex > -1) {
            resultZoneOzuId = Number(this.#mapFile['nameProtectedForests'][2]);
        } else {
            zoneOzuIndex = lotProtectZoneOzu.findIndex((zoneOzuItem) => {
                return (
                    zoneOzuItem.name.split('|').findIndex((ozuName) => {
                        if (isStringEqual(protectZoneOzu, ozuName, true) > -1) {
                            resultZoneOzuId = zoneOzuItem.code;
                            return true;
                        }
                    }) > -1
                );
            });

            if (
                zoneOzuIndex == -1 &&
                !this.#noProtectZoneOzu.has(protectZoneOzu)
            ) {
                this.#noProtectZoneOzu.add(protectZoneOzu);
                this.#messagerForestry.warningMessages(
                    `Не удалось распарсить категорию защитных мероприятий [${protectZoneOzu}] в квартале ${
                        this.#currentKvartal
                    }`
                );
            }
        }
        // if (this.#currentKvartal == 154)
        //     console.log(this.#currentKvartal, protectZoneOzu, zoneOzuIndex);
        return resultZoneOzuId;
    };

    #checkForTableHeader = (textContent) => {
        if (
            (textContent.split(':').length > 10 ||
                textContent.split('|').length > 10) &&
            !this.#tableHeaders.length
        ) {
            // console.log(
            //     textContent,
            //     'Нашли строку для поиска заголовка таблицы'
            // );
            // Если отсутствует структура заголовка, то пытаемся его прочитать
            const splitSymbol = textContent.split(':').length > 10 ? ':' : '|';
            let start = 0;
            let end = 0;

            if (textContent.indexOf(splitSymbol) == 0)
                textContent = ` ${textContent.slice(1)}`;
            //end = 1;
            //}

            if (Number(textContent.split(splitSymbol)[0]) > 0) {
                this.#tableHeaders = textContent
                    .split(splitSymbol)
                    .map((item) => {
                        end += item.length;
                        const diapazon = { start, end };
                        start = end;
                        end = start + 1;
                        return diapazon;
                    });
                // Исправляем ширину последней колонки до 120 символов при необходимости
                if (this.#tableHeaders.length > 0)
                    this.#tableHeaders[this.#tableHeaders.length - 1].end =
                        this.#tableHeaders[this.#tableHeaders.length - 1].end <
                        120
                            ? 120
                            : this.#tableHeaders[this.#tableHeaders.length - 1]
                                  .end;
                //console.log(this.#tableHeaders, 'HEADER');
            }
        }

        return (
            textContent.split(':').length > 10 ||
            textContent.split('-').length > 10 ||
            textContent.split('—').length > 10 ||
            textContent.split('|').length > 10 ||
            textContent.split('=').length > 10 ||
            textContent.trim() == '' ||
            textContent.search(/Т а к с а ц и о н н о е/i) > -1 ||
            textContent.search(/Таксационное описание/i) > -1 ||
            this.#tableHeaders.length == 0 ||
            Number(textContent.trim()) > 0 ||
            this.#checkForKvartal(textContent) ||
            this.#currentFeatureType == featureType.final
        );
    };

    #checkForKvartal = (textContent) => {
        return (
            textContent.search(/Квартал /i) > 0 ||
            textContent.search(/Квартал: /i) > 0 ||
            textContent.search(/Участковое /i) > 0 ||
            textContent.search(/Лесничество/i) > 0 ||
            textContent.search(/уч.лесн/i) > 0 ||
            textContent.search(this.#forestryMain) > 0 ||
            textContent.search(this.#forestryDistrict) > 0 ||
            textContent.search(/Категория защ/i) > 0 ||
            textContent.search(/Категория лесов/i) > 0 ||
            textContent.search(/Целевое назн/i) > 0 ||
            textContent.search(/Всего по /i) > 0
        );
    };

    // Добавляем проверку на наличие нового выдела и его площади (пытаемся распарсить первые 2-е колонки вне их диапазонов)
    #checkForNewLotArea = (lotUniqueData = '') => {
        lotUniqueData = lotUniqueData.replaceAll(',', '.').trim();

        let parseData =
            lotUniqueData.indexOf(' ') > -1 &&
            lotUniqueData.slice(0, lotUniqueData.indexOf(' ')).trim();

        const lotId = parseData && (Number(parseData) || 0);

        parseData =
            lotUniqueData.indexOf(' ') > -1 &&
            lotUniqueData.slice(lotUniqueData.indexOf(' ')).trim();
        const lotArea =
            parseData &&
            (Number(parseData) > 0 && Number(Number(parseData).toFixed(1)) > 0
                ? Number(parseData)
                : 0.1 || 0);

        return {
            lotId,
            lotArea,
            isNewLot: lotId > 0 && lotArea > 0 && this.#currentKvartal,
        };
    };
    // Если мы нашли дополнение с :, то пытаемся его представить в комплексном виде и распарсить на составляющие
    #extractFromComplexAdditional = (complexAdditional) => {
        let resultAdditionals = [];
        //console.log(complexAdditional, 'Найден новый комплексный заголовок');
        if (complexAdditional) {
            lotAdditionalData.forEach((addition) => {
                let additionalInsertIndex = -1;
                addition.value.split('|').forEach((aValue) => {
                    if (isStringEqual(complexAdditional, aValue) > -1) {
                        if (additionalInsertIndex == -1) {
                            additionalInsertIndex = isStringEqual(
                                complexAdditional,
                                aValue
                            );
                        } else {
                            if (
                                additionalInsertIndex >
                                isStringEqual(complexAdditional, aValue)
                            )
                                additionalInsertIndex = isStringEqual(
                                    complexAdditional,
                                    aValue
                                );
                        }
                    }
                });
                if (additionalInsertIndex > -1)
                    complexAdditional = `${complexAdditional.slice(
                        0,
                        additionalInsertIndex
                    )}     ${complexAdditional.slice(additionalInsertIndex)}`;
            });

            while (complexAdditional.indexOf('      ') > -1)
                complexAdditional = complexAdditional
                    .replaceAll('      ', '     ')
                    .trim();

            resultAdditionals = complexAdditional
                .split('     ')
                .filter((value) => value.trim());
        }
        // if (this.#currentKvartal == 4 && this.#currentLot == 46)
        //     console.log(resultAdditionals, 'Дополнительные дополнения');

        return resultAdditionals;
    };

    // Проверяем наличие текущей категории земель
    #checkForProtectedForest = (protectedZone, logWarning = false) => {
        const result = {
            pzName: protectedZone,
            pzCode: 0,
        };

        // Проверяем код типа защитных лесов из классификатора purposeForests map файла
        const protectedZoneIndex = this.#mapFile['purposeForests'].findIndex(
            (zoneItem, index) => {
                return (
                    isStringEqual(zoneItem[0], protectedZone) == 0 &&
                    Number(this.#mapFile['purposeForests'][index][2]) > 0
                );
            }
        );
        // Если мы нашли такую защитную зону то возвращаем ее индекс
        if (protectedZoneIndex > 0) {
            result['pzCode'] =
                this.#mapFile['purposeForests'][protectedZoneIndex][2];
            result['pzName'] =
                this.#mapFile['purposeForests'][protectedZoneIndex][0].trim();
        } else {
            const pzExtraIndex = lotExtraProtectZone.findIndex((pzItem) => {
                const ptotectIndex = pzItem.name
                    .split('|')
                    .findIndex(
                        (pzPart) =>
                            isStringEqual(protectedZone, pzPart, true) > -1
                    );
                if (ptotectIndex > -1) result['pzCode'] = pzItem.code;
                return ptotectIndex > -1;
            });
            // Если не нашли код защитных лесов логируем ошибку
            if (
                pzExtraIndex == -1 &&
                !this.#noProtectZone.has(protectedZone) &&
                this.#currentKvartal &&
                logWarning
            ) {
                this.#noProtectZone.add(protectedZone);
                this.#messagerForestry.warningMessages(
                    `Не удалось распарсить категорию защитных лесов [${protectedZone}] в квартале ${
                        this.#currentKvartal || ''
                    }`
                );
            }
        }
        return result;
    };

    // Проверяем наличие текущей категории земель
    #checkForLandCategory = (
        landCategory,
        logWarning = false,
        checkForActivity = true
    ) => {
        let hasAdditional = false;
        landCategory = landCategory || '';

        const result = {
            landName: landCategory,
            landType: 'нелесные земли',
            compositionType: composeType.object,
            landTier: 0,
            hasMR: false,
            landCode: -1,
        };

        const { isComposition } = this.#checkForCompositition(landCategory);

        if (!isComposition && landCategory && landCategory.slice(0, 5).trim()) {
            landCategory = landCategory.trim();
            // Проверяем код типа лесных земель из классификатора landType map файла
            const landTypeIndex = this.#mapFile['landType'].findIndex(
                (landItem, index) => {
                    //if (!landItem[4] && landItem[0].search(landCategory) == 0)
                    // console.log(
                    //     landItem[0],
                    //     landItem[4],
                    //     'Категория не определена!'
                    // );
                    return (
                        index > 0 &&
                        isStringEqual(landCategory, landItem[0]) == 0
                    );
                }
            );

            // Если мы нашли такую категорию земель. то возвращаем ее индекс
            if (landTypeIndex > 0) {
                result['landName'] =
                    this.#mapFile['landType'][landTypeIndex][0].trim();
                result['landType'] =
                    this.#mapFile['landType'][landTypeIndex][2].trim();
                result['compositionType'] =
                    this.#mapFile['landType'][landTypeIndex][2].trim() ==
                    'нелесные земли'
                        ? composeType.object
                        : composeType.culture;
                result['landCode'] =
                    this.#mapFile['landType'][landTypeIndex][4];
            } else {
                // Если не нашли категорию в map файле пробуем найти ее в доп материалах к программе
                const landExtraIndex = lotExtraLandType.findIndex((item) => {
                    return (
                        item.value
                            .split('|')
                            .findIndex((landTypeItem, index) => {
                                // if (
                                //     this.#currentKvartal == 17 &&
                                //     this.#currentLot == 20 &&
                                //     landTypeItem.indexOf('УЧ') > -1
                                // )
                                //     console.log(
                                //         landCategory,
                                //         landTypeItem,
                                //         isStringEqual(
                                //             landCategory,
                                //             landTypeItem
                                //         ),
                                //         item,
                                //         'Ищем наименование макета состав в выделе'
                                //     );
                                if (
                                    isStringEqual(
                                        landCategory,
                                        landTypeItem,
                                        true
                                    ) == 0
                                ) {
                                    //if (item.isPreview)
                                    result['landName'] = item.isPreview
                                        ? landCategory
                                        : landTypeItem;
                                    result['landType'] = item.type;
                                    result['landTier'] = item.tier;
                                    result['landCode'] = item.code;
                                    result['hasMR'] = item.hasMR || false;
                                    result['compositionType'] =
                                        result['landType'] == 'нелесные земли'
                                            ? composeType.object
                                            : composeType.culture;

                                    return true;
                                }
                            }) > -1
                    );
                });

                // if (this.#currentKvartal == 14 && this.#currentLot == 2)
                //     console.log(
                //         landCategory,
                //         landExtraIndex,
                //         result,
                //         'Текущая категория культур'
                //     );

                if (landExtraIndex < 0) {
                    result['landName'] = landCategory;
                    result['landType'] = 'нелесные земли';
                    result['compositionType'] = composeType.object;
                    result['landCode'] = -1;
                }
            }

            // if (checkForActivity) {
            //     // Проверяем категорию на хозмероприятия
            //     const { isActivity, isAdditional } =
            //         this.#checkForLotAdditional(landCategory);
            //     //console.log(landCategory, isActivity, isAdditional);
            //     hasAdditional = isActivity || isAdditional;
            // }

            if (
                this.#currentFeatureType == featureType.main &&
                !this.#noLandType.has(landCategory) &&
                (result['landCode'] || 0) < 1 &&
                //!hasAdditional &&
                logWarning
            ) {
                this.#noLandType.add(landCategory);

                this.#messagerForestry.warningMessages(
                    `Не удалось распарсить категорию земель [${landCategory}] для выдела ${
                        this.#currentLot
                    } в квартале ${this.#currentKvartal}`
                );
            }
        }
        //if (landCategory.search('Прогал') > -1)
        //    console.log(landCategory, result['landCode']);
        return result;
    };

    // Проверяем текущую строку на наличие дополнения в выделе
    #checkForLotAdditional = (textContent, logWarning = false) => {
        let isAdditional = false;
        let isActivity = false;
        let activityName = '';
        let name = '';
        let value = '';

        if (
            this.#currentStep == searchStep.stepFeature &&
            textContent.replaceAll('-', '').replaceAll('0', '').trim() &&
            (this.#currentFeatureType == featureType.main ||
                this.#currentFeatureType == featureType.addition)
        ) {
            //if (textContent.indexOf('подлес') > -1)
            //console.log('Парсим подлесок');
            textContent = textContent.trim();
            const { hasAdditions, hasCompositions, compositions } =
                this.#checkForCompositionsAndAdditions();

            isAdditional =
                lotAdditionalData.findIndex((lotValue) => {
                    return (
                        lotValue.value.split('|').findIndex((lotPart) => {
                            if (
                                isStringEqual(textContent, lotPart.trim()) == 0
                            ) {
                                if (lotValue.isElement) {
                                    // Проверяем на наличие дополнения и отсутствии его среди наименования культур (чтобы случайно вместо дополнения не захватить культуру)
                                    name = lotPart.trim();
                                    value = textContent
                                        .slice(lotPart.length)
                                        .replaceAll(':', '')
                                        .trim();
                                } else {
                                    name = lotValue.name.trim();
                                    value =
                                        isStringEqual(
                                            textContent,
                                            lotValue.name.trim()
                                        ) == 0
                                            ? textContent
                                                  .slice(lotValue.name.length)
                                                  .replaceAll(':', '')
                                                  .trim()
                                            : textContent
                                                  .replaceAll(':', '')
                                                  .trim();
                                }

                                //return textContent.trim().search(lotValue.name) == 0;
                                return true;
                            }
                        }) > -1
                    );
                }) > -1 || textContent.indexOf(':') > -1;

            isActivity =
                lotAdditionalActivities.findIndex((activitiesValue) => {
                    if (
                        hasCompositions &&
                        isStringEqual(
                            compositions[0]['LN'],
                            activitiesValue.composition
                        ) > -1 &&
                        isStringEqual(
                            textContent,
                            activitiesValue.additionalText
                        ) > -1
                    ) {
                        name = activitiesValue.name;
                        activityName = activitiesValue.composition;
                        if (
                            this.#currentLandName.indexOf('-') > 0 ||
                            this.#currentLandName.indexOf(' ') > 0
                        ) {
                            const splitSymbol =
                                this.#currentLandName.indexOf('-') > 0
                                    ? '-'
                                    : ' ';
                            value = `${this.#currentLandName
                                .slice(
                                    this.#currentLandName.indexOf(splitSymbol) +
                                        1
                                )
                                .trim()} ${textContent.trim()}`;
                        } else value = textContent.trim();
                        return true;
                    }
                }) > -1;

            if (textContent.indexOf(':') > -1 && !name) {
                name = textContent.split(':')[0].trim();
                value = textContent.split(':').slice(1).join('').trim();
            }
            // На последнем этапе проверки дополнения, если мы не находим характерных дополнений, хоз-мероприятий,
            // у нас нет активных дополнений и текущий кандидат не является категорией леса, то добавляем его в качестве нечеткого описания
            if (
                !isAdditional &&
                !isActivity &&
                !hasAdditions &&
                // this.#checkForLandCategory(textContent.trim(), false, false)
                //     .landCode == -1 &&
                this.#currentLandCode > -1 &&
                this.#currentCompositionType == composeType.object
            ) {
                name = 'objDesc';
                value = '';

                if (
                    isStringEqual(textContent.trim(), this.#currentLandName) !==
                    0
                ) {
                    isAdditional = true;
                    value = textContent.trim();
                } else if (
                    textContent
                        .trim()
                        .slice(this.#currentLandName.length + 1)
                        .trim()
                ) {
                    isAdditional = true;
                    value = textContent
                        .trim()
                        .slice(this.#currentLandName.length + 1)
                        .trim();
                }
            }

            const hasAdditional = isAdditional && isActivity;

            // if (
            //     this.#currentLandName &&
            //     this.#currentLandName.search('Просека') > -1
            // )
            //     console.log(textContent, isAdditional, 'Check for additional');

            if (
                !hasAdditional &&
                this.#currentFeatureType == featureType.addition &&
                !this.#noAdditional.has(textContent) &&
                !hasAdditions &&
                logWarning
            ) {
                this.#noAdditional.add(textContent);
                // Если мы не находим дополнения вообще, тогда пишем лог
                if (!name && !value) {
                    this.#messagerForestry.warningMessages(
                        `Не удалось распарсить дополнительное описание [${textContent}] для выдела ${
                            this.#currentLot
                        } в квартале ${this.#currentKvartal}`
                    );
                }
            }
        }

        return { isAdditional, isActivity, activityName, name, value };
    };

    // Проверяем наличие описания композиций и дополнений в композиции
    #checkForCompositionsAndAdditions = () => {
        let hasCompositions = false;
        let hasAdditions = false;

        const currentLot =
            this.#forestryResult[this.#currentKvartal].lots[this.#currentLot];

        const compositions =
            this.#forestryResult[this.#currentKvartal].lots[this.#currentLot][
                'compositions'
            ];

        let additions =
            this.#forestryResult[this.#currentKvartal].lots[this.#currentLot][
                'additions'
            ];

        if (!additions) additions = [];

        hasCompositions = compositions.length > 0;
        hasAdditions = additions.length > 0;

        return {
            hasCompositions,
            hasAdditions,
            currentLot,
            compositions,
            additions,
        };
    };

    // Проверяем текущую строку на наличие статистики по выделу
    #checkForKvartalSummary = (textContent) => {
        return (
            textContent.search(/Итого по категории/gi) > -1 ||
            textContent.search(/Итого по кварталу/gi) > -1 ||
            textContent.search(/Итоги по /gi) > -1 ||
            textContent.search(/Итого:/gi) > -1
        );
    };

    #checkForForesterySummary = (textContent) => {
        return textContent.search(/Всего по /gi) > -1;
    };

    // Функция проверки текущей лесной культуры на наличие породного состава и возвращение коэффициента породы
    #checkForCompositition = (composition = '', koeffIndex = 0) => {
        const composeMask = new RegExp(
            /(([\d]{1,3}|,{1}|\+{1}){1}([А-Я]{1,4}|-{1}){1})/g
        );
        // Если в элементе описания композиции обнаружены пробелы => удаляем их
        composition = composition?.replaceAll(' ', '');

        let isComposition = false;
        let koeff = 0;
        let fullName = composition;
        let name = composition;
        let count = 0;

        if (
            composition &&
            composition.match(composeMask) &&
            composition.match(composeMask).length > 0
        ) {
            count = composition.match(composeMask).length;
            koeff =
                koeffIndex > -1
                    ? composition
                          .match(composeMask)
                          [
                              koeffIndex < composition.match(composeMask).length
                                  ? koeffIndex
                                  : composition.match(composeMask).length - 1
                          ].match(/[\d\+,]+/g)[0]
                    : 0;
            if (isNaN(koeff)) koeff = 0;

            fullName = composition.match(composeMask).join('');
            isComposition = Boolean(fullName == composition);
            name =
                koeffIndex > -1
                    ? composition
                          .match(composeMask)
                          [
                              koeffIndex < composition.match(composeMask).length
                                  ? koeffIndex
                                  : composition.match(composeMask).length - 1
                          ].match(/[А-Я|-]+/g)[0]
                    : '';
        }

        // Удаляем все прочерки из наименования пород
        if (name == '-' || name == '0') name = '';

        return {
            isComposition,
            koeff,
            name,
            fullName,
            count,
        };
    };

    #checkForLandInTier = (landCategoryName) => {
        // Проверяем категорию земель на наличии ее в землях с установочным ярусом

        return (
            lotExtraLandType.findIndex((item) => {
                return (
                    item.value.split('|').findIndex((landTypeItem) => {
                        return (
                            item.tier &&
                            landCategoryName &&
                            landCategoryName.search(
                                new RegExp(landTypeItem, 'i')
                            ) == 0
                        );
                    }) > -1
                );
            }) > -1
        );
    };

    // Функция для парсинга значения выражения по типу, если значение не определено, то возвращается предыдущее
    #extractValueFromContent = (content, type = 'N', prevValue) => {
        if (type == 'N') {
            if (Number(content) !== 0) return content;
        } else {
            if (content.trim()) return content;
        }
        return prevValue;
    };

    // Функция для добавления описания единичной породы в текущий состав пород для текущего выдела
    #addSingleCompositToLot = (textContent, cType = composeType.culture) => {
        const { compositions, hasCompositions, currentLot } =
            this.#checkForCompositionsAndAdditions();
        if (!hasCompositions) compositions.push({});
        const currentComposition = compositions[compositions.length - 1];

        if (this.#getColumnHeaderValue(textContent, [23], '')) {
            if (!currentLot['FA']) {
                if (this.#getColumnHeaderValue(textContent, [23], ''))
                    currentLot['FA'] = [
                        this.#getColumnHeaderValue(textContent, [23], ''),
                    ];
            } else
                currentLot['FA'].push(
                    this.#getColumnHeaderValue(textContent, [23], '')
                );
        }

        // Если категория земель нелесные земли выходим из дальнейшего парсингаили отсутствует описание пород
        if (cType == composeType.object) return;
        // console.log(
        //     currentComposition['TLU'],
        //     this.#getColumnHeaderValue(textContent, [12], ''),
        //     this.#currentKvartal,
        //     this.#currentLot,
        //     'Текущий ТЛУ'
        // );

        // Проверяем ТЛУ леса на корректность заполнения
        const newTlu = this.#getColumnHeaderValue(textContent, [12], '')
            .replaceAll(' ', '')
            .replaceAll('-', '')
            .trim();

        // if (this.#currentKvartal == 7 && this.#currentLot == 9)
        //     console.log(
        //         this.#currentLandName,
        //         this.#currentLandCode,
        //         this.#getColumnHeaderValue(textContent, [10], ''),
        //         this.#getColumnHeaderValue(textContent, [11], ''),
        //         this.#getColumnHeaderValue(textContent, [12], ''),
        //         textContent
        //     );

        if (newTlu) {
            // Перед добавлением TLU проверяем на наличие TLU в предыдущей категории и если оно там есть добавляем туда, в ином случае в описание текущей породы
            const prevComposition = compositions[compositions.length - 2];

            if (
                prevComposition &&
                prevComposition['TLU'] &&
                prevComposition['TLU'].length > 0
            ) {
                prevComposition['TLU'].push(newTlu);
            } else {
                if (!currentComposition['TLU']) currentComposition['TLU'] = [];

                currentComposition['TLU'].push(newTlu);
            }
        }

        // Если отсутствует описание пород выходим из дальнейшего парсинга
        //if (!currentComposition['CN']) return;

        if (
            this.#checkForCompositition(
                `0${this.#getColumnHeaderValue(textContent, [5], '')}`
            ).isComposition
        ) {
            // Если найдена новая порода, то добавляем ее детальное описание в текущую сущность выдела
            if (!currentComposition['detailes'])
                currentComposition['detailes'] = [];
            const compositionIndex = currentComposition['detailes'].length;

            textContent = textContent.replaceAll(/,(\d+)/g, '.$1');

            currentComposition['detailes'].push({
                CN: this.#checkForCompositition(
                    this.#getColumnHeaderValue(textContent, [5], ''),
                    0
                ).name,

                ...(Number(this.#getColumnHeaderValue(textContent, [3], '')) >
                    0 ||
                this.#checkForLandCategory(currentComposition['LN']).landTier
                    ? {
                          CT:
                              Number(
                                  this.#getColumnHeaderValue(
                                      textContent,
                                      [3],
                                      ''
                                  )
                              ) ||
                              this.#checkForLandCategory(
                                  currentComposition['LN']
                              ).landTier,
                      }
                    : {}),
                CK: this.#checkForCompositition(
                    currentComposition['CN'],
                    compositionIndex
                ).koeff,
                ...(Number(this.#getColumnHeaderValue(textContent, [6], '')) > 0
                    ? {
                          CA: Number(
                              this.#getColumnHeaderValue(textContent, [6], '')
                          ),
                      }
                    : {}),
                ...(Number(this.#getColumnHeaderValue(textContent, [7], '')) > 0
                    ? {
                          CH: Number(
                              this.#getColumnHeaderValue(textContent, [7], '')
                          ),
                      }
                    : {}),
                ...(Number(this.#getColumnHeaderValue(textContent, [8], '')) > 0
                    ? {
                          CD: Number(
                              this.#getColumnHeaderValue(textContent, [8], '')
                          ),
                      }
                    : {}),
                FFN: this.#getColumnHeaderValue(textContent, [13], ''),
                TS: this.#getColumnHeaderValue(textContent, [14], ''),
                FR: this.#getColumnHeaderValue(textContent, [16], ''),
                ...(Number(this.#getColumnHeaderValue(textContent, [17], '')) >
                0
                    ? {
                          CC: Number(
                              this.#getColumnHeaderValue(textContent, [17], '')
                          ),
                      }
                    : {}),
                FLS: this.#getColumnHeaderValue(textContent, [18], ''),
                FLSR: this.#getColumnHeaderValue(textContent, [19], ''),
                FLSS: this.#getColumnHeaderValue(textContent, [20], ''),
            });
        }
    };

    // Функция парсинга строки с номером квартала
    #parseKvartalContent = (textContent) => {
        let indexTract = 0;
        let indexProtect = 0;
        let protectZone = '';
        let newKvartal = 0;

        textContent = textContent
            .replace('Квартал:', 'Квартал')
            .replaceAll(':', ':     ');

        if (textContent.search(/уч.л-во/i) > 0) {
            indexTract = textContent.search(/уч.л-во/i) + 8;
            textContent = textContent.slice(indexTract).trim();
        } else if (textContent.search(/уч. лес-во/i) > 0) {
            indexTract = textContent.search(/уч. лес-во/i) + 11;
            textContent = textContent.slice(indexTract).trim();
        } else if (textContent.search(/участковое лесничество/i) > 0) {
            indexTract = textContent.search(/участковое лесничество/i) + 23;
            textContent = textContent.slice(indexTract).trim();
        } else if (textContent.search(/сельское участковое/i) > 0) {
            indexTract = textContent.search(/сельское участковое/i) + 20;
            textContent = textContent.slice(indexTract).trim();
        } else if (textContent.search(/участковое/i) > 0) {
            indexTract = textContent.search(/участковое/i) + 20;
            textContent = textContent.slice(indexTract).trim();
        } else if (
            textContent.search(this.#forestryMain) > -1 &&
            textContent.search(this.#forestryMain) >
                textContent.search(this.#forestryDistrict)
        ) {
            indexTract =
                textContent.search(this.#forestryMain) +
                this.#forestryMain.length * 2;
            textContent = textContent.slice(indexTract).trim();
        } else if (textContent.search(this.#forestryDistrict) > -1) {
            indexTract =
                textContent.search(this.#forestryDistrict) +
                this.#forestryDistrict.length * 1.5;
            textContent = textContent.slice(indexTract).trim();
            //console.log(this.#forestryDistrict, 'Участковое лесничество');
        }

        if (
            textContent.search(/Категория защ/i) > -1 ||
            textContent.search(/Категория лес/i) > -1 ||
            textContent.search(/Целевое назн/i) > -1
        ) {
            this.#currentStep = searchStep.stepKvartal;
            this.#currentStep = searchStep.stepKvartal;
            const searchCategory =
                textContent.search(/Категория защ/i) > -1
                    ? /Категория защ/i
                    : textContent.search(/Категория лес/i) > -1
                    ? /Категория лес/i
                    : /Целевое назн/i;

            if (
                textContent.search(searchCategory) > 1 &&
                !this.#forestryTract &&
                this.#isParseTitul
            ) {
                this.#forestryTract = textContent
                    .slice(0, textContent.search(searchCategory) - 1)
                    .trim();
            }
            indexProtect = textContent.indexOf(
                ' ',
                textContent.search(searchCategory) +
                    (textContent.search(/Категория лес/i) > -1 ? 15 : 22)
            );

            textContent = textContent.slice(indexProtect).trim();
            if (
                textContent.indexOf(':') > -1 &&
                (textContent.indexOf(':') < textContent.search(/Квартал /i) ||
                    textContent.search(/Квартал /i) == -1)
            ) {
                if (textContent.search(/Квартал /i) > -1) {
                    protectZone = textContent
                        .slice(
                            textContent.indexOf(':') + 1,
                            textContent.search(/Квартал /i)
                        )
                        .trim();
                } else {
                    protectZone = textContent
                        .slice(textContent.indexOf(':') + 1)
                        .trim();
                }
            } else {
                if (textContent.search(/Квартал /i) > -1) {
                    protectZone = textContent
                        .slice(0, textContent.search(/Квартал /i))
                        .trim();
                } else {
                    protectZone = textContent;
                }
            }

            // Если не находит указание на защитную категорию считаем, что пере кварталом уже указана защитая категория
        } else {
            if (textContent.search(/Квартал /i) > -1)
                protectZone = textContent
                    .slice(0, textContent.search(/Квартал /i))
                    .trim();
            // Если не находит указание на защитную категорию считаем, что пере кварталом уже указана защитая категория
        }

        if (textContent.search(/Квартал /i) > -1) {
            this.#currentStep = searchStep.stepFeature;
            this.#currentStep = searchStep.stepFeature;
            newKvartal = Number(
                textContent.slice(textContent.search(/Квартал /i) + 8)
            );

            if (this.#currentKvartal !== newKvartal) {
                // console.log(
                //     this.#countKvartals,
                //     newKvartal,
                //     this.#countLots,
                //     'Мы на квартале!!!'
                // );
                if (!this.#currentKvartal && newKvartal)
                    console.log(
                        `Начинаем парсинг таксационного описания лесничества ${
                            this.#forestryMain
                        }/${this.#forestryDistrict} ${
                            this.#forestryTract
                                ? '[Урочище ' + this.#forestryTract + ']'
                                : ''
                        }\nв регионе ${this.#forestryRegion} - файл [${
                            this.#forestryFile
                        }]`
                    );

                if (
                    Number(this.#currentKvartal) > 0 &&
                    Number(this.#countLots) > 0
                )
                    console.log(
                        `В квартале [${this.#currentKvartal}] найдено ${
                            this.#countLotsByKvartal
                        } выделов`
                    );
                this.#currentKvartal = newKvartal;
                this.#forestryResult[newKvartal] = {
                    lots: {},
                    Tract: this.#forestryAllCodes['F_TRACT'], //this.#currentForestryTract,
                    //PrZone: this.#currentProtectZone
                };
                this.#countKvartals++;
                this.#countLotsByKvartal = 0;

                //this.#currentStep = searchStep.stepKvartal;
            }
        }

        // Проверяем на наличие зоны защитных земель и присваиваем ее значение текущей категории защитных зон и если она не найдена добавляем ее в лог (после обновления номера квартала)
        // console.log(
        //     protectZone,
        //     this.#currentKvartal,
        //     this.#checkForProtectedForest(protectZone, true).pzCode
        // );

        if (
            protectZone &&
            this.#checkForProtectedForest(protectZone, true).pzCode > 0
        ) {
            this.#currentProtectZone = protectZone;

            // console.log(
            //     protectZone,
            //     `Новая защитная категория земель для квартала ${
            //         this.#currentKvartal
            //     }`
            // );
        }

        // console.log(
        //     `Найдены новые элементы леса: урочище <${
        //         this.#currentForestryTract
        //     }>; категория защитности <${this.#currentProtectZone}>; квартал - ${
        //         this.#currentKvartal
        //     }`
        // );
    };

    // Функция получения значения колонок из строки с разбивкой согласно заголовку таблицы
    #getColumnHeaderValue = (
        textItem,
        colIndexs,
        splitSymbol = '',
        captureAll = false
    ) => {
        if (this.#tableHeaders.length > 0 && colIndexs.length > 0) {
            return colIndexs.reduce((accumulator, index) => {
                if (Number(index) > -1) {
                    return (
                        accumulator +
                        (captureAll
                            ? textItem
                                  .slice(this.#tableHeaders[index].start)
                                  .trim()
                            : textItem.slice(
                                  this.#tableHeaders[index].start,
                                  this.#tableHeaders[index].end
                              )
                        ).trim() +
                        splitSymbol
                    );
                } else {
                    return textItem.slice(
                        this.#tableHeaders[Number(index.split('-')[0])].start,
                        this.#tableHeaders[Number(index.split('-')[1])].end
                    );
                }
            }, '');
        }
    };

    // Функция логирования шагов парсинга
    #messageToLogForestry = () => {
        try {
            if (
                fs.existsSync(
                    path.resolve(
                        rootPath,
                        this.#toPath,
                        `${this.#forestryMain}/${
                            this.#forestryFile.split('.')[0]
                        }_logger.json`
                    )
                )
            )
                fs.unlinkSync(
                    path.resolve(
                        rootPath,
                        this.#toPath,
                        `${this.#forestryMain}/${
                            this.#forestryFile.split('.')[0]
                        }_logger.json`
                    )
                );
            console.log('Logger file success deleted');
        } catch (err) {
            console.error('Delete logger file ERROR:', err.message);
        }
        //}

        try {
            if (
                fs.existsSync(
                    path.resolve(
                        rootPath,
                        this.#toPath,
                        `${this.#forestryMain}/${
                            this.#forestryFile.split('.')[0]
                        }_warning.log`
                    )
                )
            )
                fs.unlinkSync(
                    path.resolve(
                        rootPath,
                        this.#toPath,
                        `${this.#forestryMain}/${
                            this.#forestryFile.split('.')[0]
                        }_warning.log`
                    )
                );
            console.error('Delete warnings file ERROR:', err.message);
        } catch (err) {
            console.log('Warnings file success deleted');
        }

        try {
            if (
                fs.existsSync(
                    path.resolve(
                        rootPath,
                        this.#toPath,
                        `${this.#forestryMain}/${
                            this.#forestryFile.split('.')[0]
                        }_error.log`
                    )
                )
            )
                fs.unlinkSync(
                    path.resolve(
                        rootPath,
                        this.#toPath,
                        `${this.#forestryMain}/${
                            this.#forestryFile.split('.')[0]
                        }_error.log`
                    )
                );
            console.error('Delete ile ERROR:', err.message);
        } catch (err) {
            console.log('Error file success deleted');
        }
        //}
        return {
            logMessages: (textContent) => {
                try {
                    fs.writeFileSync(
                        path.resolve(
                            rootPath,
                            this.#toPath,
                            `${this.#forestryMain}/${
                                this.#forestryFile.split('.')[0]
                            }_logger.json`
                        ),
                        JSON.stringify(textContent)
                    );
                } catch (err) {
                    console.error('Write to logger file ERROR:', err);
                }
            },
            warningMessages: (textContent) => {
                try {
                    fs.writeFileSync(
                        path.resolve(
                            rootPath,
                            this.#toPath,
                            `${this.#forestryMain}/${
                                this.#forestryFile.split('.')[0]
                            }_warning.log`
                        ),
                        `${textContent}\n`,
                        { flag: 'a' }
                    );
                    //console.warn(textContent);
                } catch (err) {
                    console.error('Write to warning file ERROR:', err);
                }
            },
            errorMessages: (textContent) => {
                try {
                    fs.writeFileSync(
                        path.resolve(
                            rootPath,
                            this.#toPath,
                            `${this.#forestryMain}/${
                                this.#forestryFile.split('.')[0]
                            }_error.log`
                        ),
                        `${textContent}\n`,
                        { flag: 'a' }
                    );
                    //console.warn(textContent);
                } catch (err) {
                    console.error('Write error_message to file ERROR:', err);
                }
            },
        };
    };

    // Функция чтения заголовка таблицы таксационной карты из файла
    #readForestryHeader = () => {
        try {
            const jsonString = fs.readFileSync(
                path.resolve(rootPath, this.#toPath, 'schema/tableHeader.json')
            );
            return JSON.parse(jsonString);
        } catch (err) {
            console.log('Header forestry file read failed:', err);
            this.#forestErrorList.set(
                'HeaderFile',
                `Не удалось прочитать файл заголовков таблицы!`
            );

            return [];
        }
    };

    // Читаем файл лесничества (по умолчанию с классификатором исходных данных для лесничества - map)
    #openFileForestry = async (fileName, isParseResult = true) => {
        let mapFileName = '';

        try {
            if (fileName) {
                mapFileName = fileName;
                console.log(`Читаем файл ${mapFileName}`);
            } else {
                if (
                    fs.existsSync(
                        path.resolve(
                            rootPath,
                            this.#toPath,
                            `${this.#forestryMain}/map.xlsx`
                        )
                    )
                ) {
                    mapFileName = `${this.#forestryMain}/map.xlsx`;
                } else {
                    mapFileName = `schema/map.xlsx`;
                }
                console.log(`Читаем map файл ${mapFileName}`);
            }

            return isParseResult
                ? JSON.parse(
                      await anyReader.getText(
                          path.resolve(rootPath, this.#toPath, mapFileName)
                      )
                  )
                : await anyReader.getText(
                      path.resolve(rootPath, this.#toPath, mapFileName)
                  );
        } catch (err) {
            // throw new Error(
            //     `Не удалось прочитать ${fileName} файл лесничества <${
            //         this.#forestryMain
            //     }> по причине:\n ${err.message || '500 error on server'}`
            // );
            if (fileName) {
                this.#forestErrorList.set(
                    'ForestryFile',
                    `Не удалось прочитать ${fileName} файл лесничества <${
                        this.#forestryMain
                    }> по причине:\n ${err.name || '500 error on server'}`
                );
            } else {
                this.#forestErrorList.set(
                    'MapFile',
                    `Не удалось прочитать ${mapFileName} map-файл классификатор лесничеств <${
                        this.#forestryMain
                    }> по причине:\n ${err.message || '500 error on server'}`
                );
            }
        }
    };

    // Функция форматирования значения полей БД (символьное и с плавающей запятой) по количеству целой и дробной частей
    #formatField = (
        value,
        type = 'N',
        intSize = 1,
        floatSize = 0,
        isPadding = false
    ) => {
        if (!value) value = '';

        if (type === 'N') {
            return Number(
                Number(value.toString().replace(',', '.')).toFixed(floatSize)
            );
            //.toString()
            //.padStart(isPadding && floatSize == 0 ? intSize + 1 : 0, '0');
        } else {
            const newValue = value.toString().trim();
            return newValue.length > intSize
                ? newValue.slice(0, intSize)
                : newValue.padStart(
                      isPadding ? intSize - newValue.length : 0,
                      isPadding ? '0' : ''
                  );
        }
    };

    // Функция инициализации схемы полей в таблице выходнй БД
    #readFieldsDescription = async () => {
        // Если у нас уже есть колонки, то выходим из функции добавления структуры базы
        if (this.#dbFields.length > 0) return;

        const shemaDB = (await this.#openFileForestry('schema/db_schema.xlsx'))[
            'schema'
        ];

        for (let i = 0; i < shemaDB.length; i++) {
            if (i > 0 && shemaDB[i][1] && shemaDB[i][2]) {
                const name = shemaDB[i][1].trim();
                switch (shemaDB[i][2].split(' ')[0]) {
                    case 'Char': {
                        const size = Number(
                            shemaDB[i][2].split(' ')[1].slice(1, -1)
                        );
                        this.#dbFields.push({ name, type: 'C', size });
                        break;
                    }
                    case 'Decimal': {
                        const size = Number(
                            shemaDB[i][2]
                                .split(' ')[1]
                                .slice(1, -1)
                                .split(',')[0]
                        );
                        const decimalPlaces = Number(
                            shemaDB[i][2]
                                .split(' ')[1]
                                .slice(1, -1)
                                .split(',')[1]
                        );
                        this.#dbFields.push({
                            name,
                            type: 'N',
                            size,
                            decimalPlaces,
                        });
                    }
                }
            }
        }
        console.log('Читаем структуру колонок БД для записи лесничеств');
    };

    // Функция инициализации БД для главного лесничества в формате dbf
    #openOrCreateDbfFile = async () => {
        try {
            console.log(
                'Открываем БД для записи сведений таксационной карточки'
            );
            if (
                fs.existsSync(
                    path.resolve(
                        rootPath,
                        this.#toPath,
                        `${this.#forestryMain}/${this.#forestryMain}.dbf`
                    )
                )
            ) {
                fs.unlinkSync(
                    path.resolve(
                        rootPath,
                        this.#toPath,
                        `${this.#forestryMain}/${this.#forestryMain}.dbf`
                    )
                );
            }
            await this.#readFieldsDescription();

            return await DBFFile.create(
                path.resolve(
                    rootPath,
                    this.#toPath,
                    `${this.#forestryMain}/${this.#forestryMain}.dbf`
                ),
                this.#dbFields,
                { encoding: this.#charset }
            );
        } catch (err) {
            //console.log(this.#dbFields, err, 'Считанная схема map файла');
            //console.log(this.#dbFields, err, 'Считанная схема map файла');
            this.#forestErrorList.set(
                'DBFFileError',
                `Не удалось открыть/создать файл базы [${path.resolve(
                    rootPath,
                    this.#toPath,
                    `${this.#forestryMain}/${this.#forestryMain}.dbf`
                )}] по причине ошибка ['${err.name}']`
            );
        }
    };
}

module.exports = { ForestParser };
