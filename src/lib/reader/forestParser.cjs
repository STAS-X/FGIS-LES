const anyReader = require('any-text');
const { DBFFile } = require('dbffile');

const fs = require('fs');
const path = require('path');
const { threadId } = require('worker_threads');
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

const lotAdditionalData = [
    { value: 'Класс пожарной опасности ', isElement: true },
    { value: 'подлесок ', isElement: true },
    { value: 'Склон ', isElement: true },
    { value: 'Склон ', isElement: true },
    { value: 'подрост ', isElement: true },
    { value: 'культуры |культуры-', isElement: true },
    { value: 'повреждение ', isElement: true },
    { value: 'год создания л/к ', isElement: true },
    { value: 'год вырубки ', isElement: true },
    { value: 'Рекреац.хар-ка ', isElement: true },
    { value: 'селекционная оценка ', isElement: true },
    { value: 'ОЗУ ', isElement: true },
    {
        value: 'ТЛУ ВАРЬИРУЕТ|ТИП ЛЕСА |НАСАЖДЕНИЕ |СОСТАВ |ПОЛНОТА |РЕКОМЕНД.|РЕКОМ.К|РЕКОМЕНДАЦИИ|ПРОВЕДЕНО СОД|ПЛС.ВДОЛЬ |В ВЫДЕЛЕ ',
        name: 'состав ',
        isElement: false,
    },
    { value: 'ЛЕСОХОЗЯЙСТВЕHHАЯ', name: 'хар-ка ', isElement: false },
];

const lotProtectZoneOzu = [
    { name: 'Берегозащитные участки лесов', code: 2 },
    {
        name: 'Уч. л. вок. сан., дет. лаг., дом. отд., пан., тур. баз и др. леч. и озд. уч.',
        code: 83,
    },
    {
        name: 'Берегозащитные,почвозащитные участки лесов,расположенные вдоль водных объектов,склонов оврагов',
        code: 63,
    },
    { name: 'Опушки леса граничащие с безлесными пространствами', code: 13 },
    {
        name: 'Полосы леса по берегам рек или иных водных объектов, заселенных бобрами',
        code: 5,
    },
    { name: 'Другие ОЗУ', code: 7 },
    {
        name: 'Небольшие участки лесов, расположенные среди безлестных пространств',
        code: 1,
    },
    { name: 'Опушки леса, примыкающие к дорогам', code: 3 },
    { name: 'Участ.леса вокруг глухариных токов', code: 113 },
];

const lotAdditionalActivities = [
    { composition: 'Вырубка', additionalText: 'пней', name: 'год вырубки' },
    { composition: 'Прогалина', additionalText: 'пней', name: 'год вырубки' },
];

const lotExtraProtectZone = [
    { name: 'Зеленые зоны', code: 131802 },
    { name: 'Лесопарковые зоны', code: 131801 },
    {
        name: 'Леса расположенные в водоохранных зонах|Запретные полосы вдоль водных объектов|Леса водоохранных зон',
        code: 110201,
    },
    { name: 'ЗАПР.ПОЛ.ЛЕС.ВДОЛЬ ВОД.ОБЪЕКТ.', code: 110100 },
    { name: 'ЛЕСА,РАСПОЛ.В ЗАЩ.ПОЛОС.ЛЕСОВ', code: 120800 },

    {
        name: 'Защитные полосы вдоль дорог|Защитн.полосы вдоль ж/д и а/д|Защитные полосы вдоль авт. и жел. дорог|Защитные полосы лесов, расп-е вдоль  ж/д путей  и а/д',
        code: 130000,
    },
    { name: 'Эксплуатационные леса', code: 204100 },
    { name: 'Защ. пол. лесов, расп.вд жел. пут. общ. пол', code: 133100 },
];

const lotExtraLandType = [
    {
        value: 'фонд  выборочных рубок|фонд постеп.рубок|фонд  добр-выбор.рубок',
        short: 'Фонд рубок',
        type: 'лесные земли',
        code: 1509,
    },

    {
        value: 'Естеств. возобновл.|Естеств.возобновл.|возобновление|Насажд.естеств.происхождения|Естественное происхождение',
        type: 'лесные земли',
        short: 'Естеств. происх.',
        tier: 1,
        code: '1101',
    },
    { value: 'Погибшее', type: 'лесные земли', tier: 30, code: '1504' },
    { value: 'Погибшее', type: 'лесные земли', tier: 30, code: '1504' },
    { value: 'Пастбище, выгон|Пастбище', type: 'нелесные земли', code: '2103' },
    {
        value: 'УЧ-КИ ЛЕСА ВОКР НАСЕЛ.ПУНКТОВ',
        type: 'нелесные земли',
        short: 'Уч.леса н.п.',
        code: '2544',
    },
    {
        value: 'Кордоны',
        type: 'нелесные земли',
        code: '2402',
    },
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
        value: 'Усадьбы|Усадьба|Усадьба ведомств.',
        short: 'Усадьба',
        type: 'нелесные земли',
        code: '2401',
    },

    {
        value: 'Разрывы противопожарные|Противопож. разрыв|Разрыв',
        short: 'Разрыв против.п.',
        type: 'нелесные земли',
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
        value: 'Дорога автомоб. иск. покр.',
        short: 'Дорога автом. иск.пок.',
        type: 'нелесные земли',
        code: '2320',
    },
    {
        value: 'Питомники лесные',
        type: 'нелесные земли',
        code: '1300',
    },
    {
        value: 'Сады',
        type: 'лесные земли',
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
    {
        value: 'Плантация',
        type: 'лесные земли',
        tier: 1,
        code: '1341',
    },
    {
        value: 'Культ.лесные|Культуры лесные|лесные культуры|Насаждение с лесн.культ.',
        short: 'Культуры лесные',
        type: 'лесные земли',
        tier: 1,
        code: '1108',
    },
    {
        value: 'Культуры н/с|Культуры несомкнувшиеся|Несомкнувшиеся л/к|Несомкнувш.л/к|несомкнувшиеся культуры',
        short: 'Культуры н/с',
        type: 'лесные земли',
        code: '1201',
    },
    {
        value: 'Насажд.с культ.подпол.|Насажд.с культ. под пол|Насажд.с культ.под пол.|Нас.ест.с прим.л/к|Насажд. с культурами под пологом',
        short: 'Насажд.с культ.п.п.',
        type: 'лесные земли',
        tier: 5,
        code: '1107',
    },
    {
        value: 'Насажд. расстр. рубками',
        short: 'Насажд. расст.руб.',
        type: 'лесные земли',
        code: 1103,
    },
    {
        value: 'Насажд. с пород. иск. пр.|Насажд. с породами искусс.|Насажд.с пород.искусс.|Насажд. с породами искус',
        short: 'Насажд. пор.иск.пр.',
        type: 'лесные земли',
        code: 1106,
    },
    {
        value: 'Несомкн.к.под полог.',
        short: 'Культуры н/с под п.',
        type: 'лесные земли',
        tier: 6,
        code: '1201',
    },
    {
        value: 'Насажд.из подроста|Насажд. из подроста',
        short: 'Насажд.из подр.',
        type: 'лесные земли',
        tier: 6,
        code: '1102',
    },

    {
        value: 'Прогалина',
        type: 'лесные земли',
        isPreview: true,
        tier: 1,
        code: '1503',
    },
    {
        value: 'Культуры с культурами под пологом|Насажд.с л/к под пол.|культуры под пологом',
        short: 'Насажд.с л/к под пол.',
        type: 'лесные земли',
        tier: 2,
        code: '1114',
    },
    {
        value: 'Несомкн.к.реконстр.',
        short: 'Насажд. н/с рек.',
        type: 'лесные земли',
        tier: 7,
        code: '1202',
    },
    {
        value: 'Несомкн.к.непокр.пл.',
        short: 'Насажд. л/к непок.пол.',
        type: 'лесные земли',
        tier: 6,
        code: '1201',
    },

    {
        value: 'Насажд.созд.рек',
        short: 'Насажд. соз.рек.',
        type: 'лесные земли',
        tier: 7,
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
        tier: 1,
        code: '1507',
    },
    {
        value: 'Вырубка|постепенные рубки',
        short: 'Вырубка',
        type: 'лесные земли',
        isPreview: true,
        tier: 1,
        code: '1509',
    },
    {
        value: 'Редина естественная|Редина',
        type: 'лесные земли',
        tier: 8,
        code: '1400',
    },
    {
        value: 'Сухостой свежий',
        short: 'Сухостой',
        type: 'лесные земли',
        tier: 13,
        code: '1101',
    },
    {
        value: 'Насаждение погибшее',
        short: 'Насаждение погиб.',
        type: 'лесные земли',
        code: '1504',
    },
    {
        value: 'Гарь',
        type: 'лесные земли',
        code: '2560',
    },
    {
        value: 'Поляна для отдыха',
        short: 'Поляна',
        type: 'нелесные земли',
        code: '1522',
    },
    {
        value: 'Канава мелиоратив.|Канава',
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
        value: 'Дороги полевые, лесные',
        short: 'Дорога лесная',
        type: 'нелесные земли',
        code: '2307',
    },
    {
        value: 'Прочие трассы',
        type: 'нелесные земли',
        code: '2553',
    },
    {
        value: 'Прочие земли',
        type: 'нелесные земли',
        code: '2544',
    },
    {
        value: 'Дорога автомоб. грунтовые|Дорога автом.грунтовая|Автомобильная дорога',
        short: 'Дорога грунт.',
        type: 'нелесные земли',
        code: '1001',
    },
    {
        value: 'Дорога лесная|Дорога',
        short: 'Дорога лесная',
        type: 'нелесные земли',
        code: '1001',
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
        value: 'Болото',
        type: 'нелесные земли',
        code: '2507',
    },
    {
        value: 'Река|Ручей|Пруд',
        type: 'нелесные земли',
        code: '2109',
    },
    {
        value: 'Просека квартальная|Просеки квартальные|Просека квартал',
        short: 'Просека квартал.',
        type: 'нелесные земли',
        code: '2310',
    },
    {
        value: 'Просека граничная|Просека',
        short: 'Просека граничн.',
        type: 'нелесные земли',
        code: '2322',
    },
    {
        value: 'Линия электропередачи|Линии электропередачи|ЛЭП',
        short: 'Линии э/п',
        type: 'нелесные земли',
        code: '2548',
    },
    // Добавляем промежуточное описание культур для интерпретации первичных названий лесных земель, с целью дальнейшего уточнения
    // // {
    // //     value: 'Культ|Насажд',
    // //     type: 'лесные земли',
    // //     isPreview: true,
    // //     tier: 1,
    // //     code: '1101',
    // // },
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

    forestryFile = null;

    #forestryContent = [];

    #toPath = 'src/assets';

    #charset = '866'; //'UTF-8';

    constructor(options = {}) {
        //super();
        this.forestryFile = path.parse(options.forestryFile).base;

        this.#forestryMain = options.forestryMain;
        this.#forestryDistrict = options.forestryDistrict;
        this.#forestryTract = options.forestryTract || '';
        this.#forestryRegion = options.forestryRegion;

        this.#taxerCompany = options.taxerCompany;
        this.#taxerExpedition = options.taxerExpedition;
        this.#isParseHeader = !!options.isParseHeader;
        this.#isParseTitul = !!options.isParseTitul;

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
                        `${this.#forestryMain}/${this.forestryFile}`,
                        false
                    )
                ).split('\n') ?? [];

            if (this.#forestryContent.length > 0) {
                console.log(
                    //this.#forestryContent,
                    `Данные файла [${this.forestryFile}] лесничества ${
                        this.#forestryMain
                    } прочитаны`
                );
            } else {
                console.log(
                    `Файл лесничества ${this.#forestryMain} - [${
                        this.forestryFile
                    }] - пустой`
                );
            }
            if (!this.#checkCriticalError())
                // Начинаем парсить данные таксационной карточки
                for (let forestItem of this.#forestryContent) {
                    // Подменяем иностранные символы в тексте - в некоторых книгах попадается транслитерация
                    forestItem = forestItem
                        .replaceAll('H', 'Н')
                        .replaceAll('K', 'К')
                        .replaceAll('C', 'С');

                    //console.log(this.#currentFeatureType);
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
                }] квартала [${this.#currentKvartal}]  в выделе [${
                    this.#currentLot
                }] квартала [${this.#currentKvartal}] `,
                `${err.message}\n${err.stack}`
            );
            // Если происходит ошибка в процессе парсинга добавляем ее в лог ошибок!
            this.#forestErrorList.set(
                `Ошибка парсинга [${this.#forestErrorList.size}]`,
                `${err.message}\n${err.stack}`
            );
        }
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

    #initParserVariable = () => {
        this.#countLots = 0;
        this.#countKvartals = 0;

        this.#noLandType = new Set();
        this.#noAdditional = new Set();
        this.#noProtectZone = new Set();
        this.#noProtectZoneOzu = new Set();
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
        const record = this.#dbFields.reduce((result, fieldItem) => {
            result[fieldItem.name] = this.#formatField(
                '',
                fieldItem.type,
                fieldItem.size,
                fieldItem.decimalPlaces ? fieldItem.decimalPlaces : 0,
                false
            );

            return result;
        }, {});

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
                        ...record,
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
                        AKTM: this.#actualYear ? Number(this.#actualYear) : 0,
                        KV: Number(kvartal),
                        ZK: Number(currentLot['compositions'][0]?.['LCODE']),
                        ZKG: Number(
                            currentLot['compositions'][0]?.['LCODE']
                                .toString()
                                .slice(0, 2)
                        ),
                        PL: Number(
                            Number(
                                currentLot['kvArea'].replace(',', '.')
                            ).toFixed(1)
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
                        ...this.#parseCompositioToDBF(currentLot),
                        // Добавляем описание дополнений для каждого выдела
                        ...this.#parseCompositionAdditional(currentLot),
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
                    this.forestryFile
                }] не найдено ни одного квартала(выдела)`
            );
        }
    };

    // Формирует значения колонок по превалирующей породе, бонитете, сведения по выдеу в целом и по каждой пароде в частности
    #parseCompositioToDBF = (currentLot) => {
        const compositionResult = {};
        let hasTLU = false;
        let compositionNum = 1;
        // Вначале добавляем общие характеристики для описания пород в выделе
        //compositionResul.push({})
        for (const composition of currentLot['compositions']) {
            if (
                composition['detailes']?.length > 0 &&
                composition['TLU']?.length == 2 &&
                !hasTLU
            ) {
                hasTLU = true;

                // Вначале заполняем общие сведения по выделу
                compositionResult['BON'] = this.#formatValueByField(
                    composition['FB'],
                    'BON'
                );
                compositionResult['VMR'] = this.#formatValueByField(
                    composition['detailes'][0]['CN'] !== '-'
                        ? composition['detailes'][0]['CN']
                        : '',
                    'VMR'
                );
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
                compositionResult['SVTB'] = this.#formatValueByField(
                    composition['FLC'],
                    'SVTB'
                );
                compositionResult['SVTL'] = this.#formatValueByField(
                    composition['FLD'],
                    'SVTL'
                );
                compositionResult['SUX'] = this.#formatValueByField(
                    composition['FLS'],
                    'SUX'
                );
                compositionResult['AGR'] = this.#formatValueByField(
                    composition['AG'],
                    'AGR'
                );
                compositionResult['STUR'] = this.#formatValueByField(
                    Number(composition['FLR']) * 10,
                    'STUR'
                );
                compositionResult['AKL'] = this.#formatValueByField(
                    composition['AC'],
                    'AKL'
                );
            }
            // Далее переходим к наполнению колонок по каждой породе сквозной нумерацией, начиная с 1
            if (compositionNum < 11 && composition['detailes']) {
                let newARD = 0;
                let newAMZ = 0;
                for (const detail of composition['detailes']) {
                    // Если обнаруживаем пустые деревья, переходим к следуюей породе
                    if (detail['CN'] == '-') continue;

                    newARD = detail['CT'] || composition['FL'];
                    newAMZ = detail['CA'] || newAMZ;

                    compositionResult[`ARD${compositionNum}`] =
                        this.#formatValueByField(
                            newARD,
                            `ARD${compositionNum}`
                        );
                    compositionResult[`KF${compositionNum}`] =
                        this.#formatValueByField(
                            detail['CK'],
                            `KF${compositionNum}`
                        );
                    compositionResult[`MR${compositionNum}`] =
                        this.#formatValueByField(
                            detail['CN'],
                            `MR${compositionNum}`
                        );
                    compositionResult[`AMZ${compositionNum}`] =
                        this.#formatValueByField(
                            newAMZ,
                            `AMZ${compositionNum}`
                        );
                    compositionResult[`H${compositionNum}`] =
                        this.#formatValueByField(
                            detail['CH'],
                            `H${compositionNum}`
                        );
                    compositionResult[`D${compositionNum}`] =
                        this.#formatValueByField(
                            detail['CD'],
                            `D${compositionNum}`
                        );
                    compositionResult[`PSP${compositionNum}`] =
                        this.#formatValueByField(
                            detail['CC'],
                            `PSP${compositionNum}`
                        );
                    compositionResult[`KIL${compositionNum}`] =
                        this.#formatValueByField(0, `KIL${compositionNum}`);
                    compositionResult[`SKAL${compositionNum}`] =
                        this.#formatValueByField(
                            detail['FFN'],
                            `SKAL${compositionNum}`
                        );
                    compositionResult[`SPS${compositionNum}`] =
                        this.#formatValueByField(0, `SPS${compositionNum}`);
                    compositionResult[`TUR1H${compositionNum}`] =
                        this.#formatValueByField(
                            detail['CS'] || detail['FLSR'],
                            `TUR1H${compositionNum}`
                        );
                    compositionNum++;
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
                let maket = [];
                //console.log(addition);
                // Проходимся по всем дополнениям и пытаемся записать сведения в соответствующие колонки БД
                switch (addition.name) {
                    case 'подлесок':
                        cPart = addition.value.match(/\B([А-Я]{1,3}(?= |,))/g);
                        cValue = addition.value.toLowerCase();
                        cType =
                            cValue.toLowerCase().search('редкий') > -1
                                ? 3
                                : cValue.toLowerCase().search('средний') > -1
                                ? 2
                                : 1;
                        additionResult['STG32'] = cType;
                        if (cPart)
                            cPart.forEach((part, index) => {
                                additionResult[`MR${index + 1}32`] = part;
                            });
                        break;
                    case 'подрост':
                        cPart = addition.value.match(/(\d+[А-Я]{1,3}){1,3}/g);
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
                        if (addition.value == 'HОРМАЛЬHЫЕ') {
                            maket[`DM${makets.length}1`] = '2';
                        } else {
                            maket[`DM${makets.length}1`] = '1';
                        }
                        break;
                    case 'год вырубки':
                        //console.log(`${cValue}`, 'Парсим вырубку с пнями!');
                        cValue = addition.value.toLowerCase();
                        const fellingYear =
                            Number(
                                cValue
                                    .match(/(?:\b|-| )\d+(?=г|,)/g)?.[0]
                                    ?.replace(',', '.') || 0
                            ) || 0;
                        // Год вырубки для пней
                        additionResult['KMET'] = Number(
                            this.#formatValueByField(
                                fellingYear > 0 && fellingYear < 100
                                    ? 1900 + fellingYear
                                    : fellingYear,
                                'KMET'
                            )
                        );
                        // Количество пней
                        additionResult['KSK'] = Number(
                            this.#formatValueByField(
                                Number(
                                    cValue
                                        .match(
                                            /(?<=пней )\d+(?=шт| |\b)|(?:\b *)\d+(?=шт)/g
                                        )?.[0]
                                        ?.replace(',', '.') || 0
                                ),
                                'KSK'
                            )
                        );
                        // Количество сосны
                        additionResult['PKSK'] = Number(
                            this.#formatValueByField(
                                Number(
                                    cValue
                                        .match(
                                            /(?:сосны *-? +)\d+(?=шт| )/g
                                        )?.[0]
                                        ?.replace(',', '.') || 0
                                ),
                                'PKSK'
                            )
                        );
                        // Диаметр пней
                        additionResult['DP'] = Number(
                            this.#formatValueByField(
                                Number(
                                    cValue
                                        .match(
                                            /(?:диаметр *=? +)\d+(?=см| |\b)/g
                                        )?.[0]
                                        ?.replace(',', '.') || 0
                                ),
                                'DP'
                            )
                        );
                        // Задаем целевую попроду, если мы на вырубках пеньков
                        const mainDetaile =
                            currentLot['compositions'][0]['detailes']?.[0];
                        if (mainDetaile?.['CN'] !== '-')
                            additionResult['MR'] = this.#formatValueByField(
                                currentLot['compositions'][0]['detailes'][0][
                                    'CN'
                                ],
                                'MR'
                            );
                        break;
                    case 'ОЗУ':
                        // Парсим ОЗУ-шки
                        cValue = addition.value;
                        additionResult['SKP'] = this.#formatValueByField(
                            this.#parseProtecteZoneOzu(cValue),
                            'SKP'
                        );
                        break;
                    case 'год создания л/к':
                    case 'культуры':
                    case 'культуры-':
                        // Макет Культуры - 11, Особенности - 23
                        makets.push({});
                        maket = makets[makets.length - 1];
                        maket[`M${makets.length}`] = 11;
                        cValue = addition.value.toLowerCase();

                        // console.log(
                        //     cValue,
                        //     cValue.match(/(?:\b|-?)\d+(?=,?|г?| +)/g)?.[0],
                        //     'Год вырубки не найден'
                        // );
                        if (cValue.match(/(?:\b|-?)\d+(?=,?|г?| +)/g)) {
                            const cultureCreationYear = Number(
                                cValue.match(/(?:\b|-?)\d+(?=,?|г?| +)/g)[0]
                            );
                            maket[`DM${makets.length}${dNum}`] =
                                this.#formatValueByField(
                                    cultureCreationYear < 100
                                        ? 1900 + cultureCreationYear
                                        : cultureCreationYear,
                                    `DM${makets.length}${dNum}`
                                );
                            ++dNum;
                        }
                        if (
                            cValue.match(
                                /(?<=состояние\s)погибшие(?=,| |\B)/g
                            ) ||
                            cValue.match(
                                /(?<=состояние\s)удовлетворител(?=,| |\B)/g
                            ) ||
                            cValue.match(
                                /(?<=состояние\s)недовлетворител(?=,| |\B)/g
                            )
                        ) {
                            maket[`DM${makets.length}${dNum}`] =
                                this.#formatValueByField(
                                    cValue.match(
                                        /(?<=состояние\s)Погибшие(?=,| |\B)/g
                                    )
                                        ? 1
                                        : cValue.match(
                                              /(?<=состояние\s)удовлетворител(?=,| |\B)/g
                                          )
                                        ? 2
                                        : 3,
                                    `DM${makets.length}${dNum}`
                                );
                            ++dNum;
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
            const tractCode = path.parse(this.forestryFile).name.indexOf('-')
                ? !isNaN(path.parse(this.forestryFile).name.split('-')[0])
                    ? Number(path.parse(this.forestryFile).name.split('-')[0])
                    : 0
                : !isNaN(path.parse(this.forestryFile).name)
                ? Number(path.parse(this.forestryFile).name)
                : 0;

            const admCode = 0;
            // path.parse(this.forestryFile).name.indexOf('-') &&
            // !isNaN(path.parse(this.forestryFile).name.split('-')[1])
            //     ? Number(path.parse(this.forestryFile).name.split('-')[1])
            //     : 0;

            if (this.#mapFile['districtForestries']) {
                const forestryIndex = this.#mapFile[
                    'districtForestries'
                ].findIndex((districtItem) => {
                    return (
                        districtItem[1]?.search(this.#forestryMain) == 0 &&
                        districtItem[2]?.search(this.#forestryRegion) == 0 &&
                        (!this.#forestryDistrict ||
                            districtItem[0] == this.#forestryDistrict) &&
                        (tractCode == 0 || districtItem[5] == tractCode) &&
                        (!this.#forestryTract ||
                            districtItem[3]?.search(this.#forestryTract) ==
                                0) &&
                        (admCode == 0 || districtItem[6] == admCode)
                    );
                });

                // console.log(
                //     this.#forestryMain,
                //     this.#forestryRegion,
                //     this.#forestryDistrict,
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

    #getShortCategoryName = (landCategory) => {
        let shortCategoryName = landCategory;

        // Пробуем найти короткое имя для текущей категории земель для записи информации в DBF
        lotExtraLandType.every((item) => {
            return (
                item.value.split('|').findIndex((landTypeItem, index) => {
                    if (
                        isStringEqual(landTypeItem, landCategory) == 0 ||
                        isStringEqual(landCategory, landTypeItem) == 0
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

    #getUsekNumberByComposition = (composition) => {
        const treeIndex = this.#mapFile['treeNew'].findIndex(
            (treeItem, index) => {
                return (
                    index > 0 && isStringEqual(treeItem[1], composition) == 0
                );
            }
        );
        return Number(
            treeIndex > -1 ? this.#mapFile['treeNew'][treeIndex][4] : 0
        );
    };

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

    // Функция пытается парсить титульный лист таксационной карты
    #checkForForestryTitul = async (textContent) => {
        if (this.#currentStep == searchStep.stepTitul) {
            //console.log('Parse forestry');
            const mainMask = [
                'Лесничество: ',
                'Лес-во: ',
                'Лесничество ',
                'Лес-во ',
            ];
            const districtMask = [
                'Уч.л-во: ',
                'Уч.л-во ',
                'Участковое лес-во: ',
                'Участковое лес-во ',
                'Участковое лесничество: ',
                'Участковое лесничество ',
            ];
            const tractMask = ['Урочище: ', 'Урочище '];

            mainMask.forEach((item) => {
                if (textContent.trim().search(item) == 0 && !this.#forestryMain)
                    this.#forestryMain = textContent.replace(item, '').trim();
            });
            districtMask.forEach((item) => {
                if (
                    textContent.trim().search(item) == 0 &&
                    !this.#forestryDistrict
                ) {
                    this.#forestryDistrict = textContent
                        .replace(item, '')
                        .trim();
                }
            });
            tractMask.forEach((item) => {
                if (
                    textContent.trim().search(item) == 0 &&
                    !this.#forestryTract
                )
                    this.#forestryTract = textContent.replace(item, '').trim();
            });

            if (textContent.search('по состоянию ') >= 0) {
                // Нашли год обследования
                if (textContent.match(/\d+\.?/g)) {
                    const currentYear = Number(
                        textContent.match(/\d+\.?/g)[
                            textContent.match(/\d+\.?/g).length - 1
                        ]
                    );
                    this.#actualYear =
                        currentYear < 100 ? 2000 + currentYear : currentYear;
                }
            }
        }
        if (
            textContent.search(/Квартал /i) > -1 ||
            textContent.search(/Квартал: /i) > -1
        ) {
            //console.log('Начинаем парсинг параметров лесничества');
            // Ищем и присваиваем требуемые кода для заполнения DBF файла (регион, лесничество, урочище, GIR, административный район) и считываем данные таксационного описания лесничества
            await this.#parseForestryCodesAndContent();
            // Далее  переходим на шаг поиска кварталов
            //this.#currentStep = searchStep.stepKvartal;
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
            Number(this.#getColumnHeaderValue(textContent, [0], '')) > 0 &&
            this.#getColumnHeaderValue(textContent, ['0-1'], '')
                .trim()
                .indexOf(' ') > -1 &&
            this.#currentKvartal
        ) {
            // Если нашли начало нового выдела присваиваем необходимые сущности
            this.#currentStep = searchStep.stepFeature;
            this.#currentFeatureType = featureType.main;
            this.#currentLot = Number(
                this.#getColumnHeaderValue(textContent, [0], '')
            );
            this.#countLots++;
            this.#countLotsByKvartal++;
            this.#forestryResult[this.#currentKvartal].lots[this.#currentLot] =
                {
                    compositions: [],
                    additions: [],
                    // Площадь выдела
                    kvArea: this.#getColumnHeaderValue(textContent, [1], ''),
                    // Записываем код категории защитности леса
                    FP_CODE: this.#checkForProtectedForest(
                        this.#currentProtectZone,
                        true
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
            const { compositions, hasCompositions } =
                this.#checkForCompositionsAndAdditions();
            // Если это породный состав, а также присутствуют ярус и высота яруса, то добавляем его в описание выдела
            if (!hasCompositions) compositions.push({});
            let lastComposition = compositions[compositions.length - 1];

            if (isComposition) {
                this.#currentCompositionType = composeType.culture;

                if (
                    (Number(this.#getColumnHeaderValue(textContent, [3], '')) >
                        0 ||
                        Number(
                            this.#getColumnHeaderValue(textContent, [4], '')
                        ) > 0 ||
                        this.#checkForCompositition(
                            `0${this.#getColumnHeaderValue(
                                textContent,
                                [5],
                                ''
                            )}`
                        ).isComposition) &&
                    this.#getColumnHeaderValue(textContent, [12], '')
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
                        if (
                            lastComposition['CN'] &&
                            lastComposition['CN'] !== compositionFullName
                        ) {
                            compositions.push({});
                            lastComposition =
                                compositions[compositions.length - 1];
                        }

                        if (this.#currentComposition !== compositionFullName) {
                            this.#currentComposition = compositionFullName;
                            this.#currentLandType = 'лесные земли';
                        }

                        if (!this.#currentLandName) {
                            this.#currentLandName =
                                'Естественное происхождение';
                        }

                        lastComposition = compositions[compositions.length - 1];

                        lastComposition['CN'] = this.#currentComposition;
                        lastComposition['CT'] = this.#currentCompositionType;
                        lastComposition['LN'] = this.#currentLandName;
                        lastComposition['LT'] = this.#currentLandType;
                        lastComposition['LCODE'] =
                            this.#currentLandCode ?? 1101;

                        this.#currentLandName = '';
                    } else {
                        this.#currentComposition += compositionFullName;
                        lastComposition['CN'] = this.#currentComposition;
                    }
                    // В случае, если мы на описании композиции, но это не описание главной породы, а продолжение длинного описания текущей породы, добавляем его к общему описанию
                } else if (
                    Number(this.#getColumnHeaderValue(textContent, [3], '')) >
                        0 ||
                    Number(this.#getColumnHeaderValue(textContent, [4], '')) >
                        0 ||
                    this.#checkForCompositition(
                        `0${this.#getColumnHeaderValue(textContent, [5], '')}`
                    ).isComposition
                ) {
                    this.#currentComposition += compositionFullName;
                    lastComposition['CN'] = this.#currentComposition;
                }
                // Проверяем является ли данная категория лесных земель дополнительным хоз-мероприятием и если да, то выходим из процедуры поиска и обновления категории
            } else if (
                !this.#checkForLotAdditional(textContent, true).isActivity
            ) {
                // Проверяем, если в колонке состава выдела есть какое-то наименование сущности, но оно не состав пород, то мы попали на новую категорию земель
                if (this.#getColumnHeaderValue(textContent, [2], '')) {
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
                              ).isComposition || lastComposition['TLU']
                            ? ['2-4']
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
                        isNewCategory = false;
                    }

                    this.#currentCompositionType = compositionType;
                    this.#currentLandCode = landCode;
                    this.#currentComposition = '';

                    if (this.#currentCompositionType == composeType.object) {
                        //Если найденная категория не является землями леса, то пытаемся отделить наименование земли и описание ее дополнительной характеристики
                        const fullLandName = this.#getColumnHeaderValue(
                            textContent,
                            ['2-22'],
                            ''
                        )
                            .trim()
                            .trim();

                        if (fullLandName.trim().indexOf('  ') > -1) {
                            landName = fullLandName.split('  ')[0].trim();
                            landDetailes = fullLandName
                                .slice(fullLandName.indexOf('  ') + 2)
                                .trim();
                        }

                        this.#currentLandType = landType;
                        this.#currentLandName = this.#currentLandName
                            ? this.#currentLandName + ' '
                            : '' + landName;

                        const { landCode } = this.#checkForLandCategory(
                            this.#currentLandName,
                            true
                        );
                        this.#currentLandCode = landCode;

                        lastComposition['CT'] = this.#currentCompositionType;
                        lastComposition['LN'] = this.#currentLandName;
                        lastComposition['LT'] = this.#currentLandType;
                        lastComposition['LCODE'] = this.#currentLandCode;

                        this.#currentFeatureType = featureType.addition;
                    } else {
                        // Проверяем на обнаружение дополнения к наименованию категории культуры
                        if (this.#currentLandName !== landName) {
                            // Присваиваем имененное значение описание категории лесных земель в описание композиции и проверяем код категории
                            this.#currentLandName = landName;
                            // Если обнаруживаем новое описание категории земель, добавляем его в описание категории леса
                            if (landCode > 0 && isNewCategory) {
                                if (lastComposition['LN'])
                                    compositions.push({});

                                lastComposition =
                                    compositions[compositions.length - 1];

                                lastComposition['LN'] = this.#currentLandName;

                                lastComposition['CT'] =
                                    this.#currentCompositionType;
                                lastComposition['LT'] = landType;
                                lastComposition['LCODE'] = landCode;
                            } else {
                                // Если мы нашли добавку к текущей категории, обновляем наименование данной категории в описании пород текущего выдела
                                lastComposition['LN'] = this.#currentLandName;
                                // console.log(
                                //     this.#currentLandName,
                                //     'Текущая добавка к породе'
                                // );
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
                    let { isAdditional, name, value } =
                        this.#checkForLotAdditional(
                            this.#getColumnHeaderValue(
                                textContent,
                                ['2-23'],
                                ''
                            )
                        );
                    // console.log(
                    //     textContent,
                    //     this.#currentKvartal,
                    //     this.#currentLot,
                    //     isAdditional,
                    //     name,
                    //     value,
                    //     'Найдено новое дополнение!'
                    // );
                    // Проверяем, чтобы мы были не на основной строке описания сущности и категория земель была лесные земли
                    if (isAdditional) {
                        // Проверяем на наличие хозмероприятий, и если они есть, добавляем их
                        if (
                            value.length -
                                value
                                    .slice(
                                        0,
                                        -this.#getColumnHeaderValue(
                                            textContent,
                                            [23],
                                            ''
                                        ).length
                                    )
                                    .trim().length >
                                20 &&
                            this.#getColumnHeaderValue(
                                textContent,
                                [23],
                                ''
                            ).trim()
                        ) {
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
                            if (hasCompositions)
                                lotCompositions[lotCompositions.length - 1][
                                    'LN'
                                ] += ` ${name.split('  ')[0]}`;
                            name = name.slice(name.indexOf('  ') + 2).trim();
                        }

                        // Далее проверяем, если в одной строке у нас есть несколько дополнений, то просматриваем все и добавляем в описание пород
                        if (textContent.trim().indexOf(':') > -1) {
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
                                if (hasAdditional)
                                    lotAdditions.push({ name, value });
                            });
                        } else lotAdditions.push({ name, value });
                    } else {
                        // Если это не целое дополнение, то добавляем его в значение параметра дополнения для нелесных земель предыдущей итерации
                        //console.log(name, value, 'Добавление к дополнению');
                        if (
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
                            );
                            // Если в добавке к дополнеию присутствует 2 пробела, то это вероятно часть от наименования категории земель - добавляем ее в текущее описание
                            if (
                                textContent.indexOf('  ') > -1 &&
                                (textContent[0].trim() || textContent[1].trim())
                            ) {
                                lotCompositions[lotCompositions.length - 1][
                                    'LN'
                                ] += ` ${textContent.split('  ')[0].trim()}`;
                                textContent = textContent
                                    .slice(textContent.indexOf('  ') + 2)
                                    .trim();
                            }
                            const lastAddition =
                                lotAdditions[lotAdditions.length - 1];
                            if (lastAddition.value)
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

                        currentComposition['FL'] =
                            Number(
                                this.#getColumnHeaderValue(textContent, [3], '')
                            ) > 0
                                ? Number(
                                      this.#getColumnHeaderValue(
                                          textContent,
                                          [3],
                                          ''
                                      )
                                  )
                                : this.#checkForLandCategory(
                                      currentComposition['LN']
                                  ).landTier;

                        currentComposition['FLH'] = Number(
                            this.#getColumnHeaderValue(textContent, [4], '')
                        );
                        currentComposition['FC'] = this.#getColumnHeaderValue(
                            textContent,
                            [5],
                            ''
                        );

                        currentComposition['AC'] =
                            this.#getColumnHeaderValue(textContent, [9], '') ||
                            currentComposition['AC'] ||
                            0 ||
                            0;

                        currentComposition['AG'] = Number(
                            this.#getColumnHeaderValue(textContent, [10], '')
                        );
                        currentComposition['FB'] =
                            Number(
                                this.#getColumnHeaderValue(
                                    textContent,
                                    [11],
                                    ''
                                )
                            ) || 0;
                        currentComposition['FLR'] =
                            Number(
                                this.#getColumnHeaderValue(
                                    textContent,
                                    [15],
                                    ''
                                )
                            ) || 0;
                        currentComposition['FLC'] =
                            Number(
                                this.#getColumnHeaderValue(
                                    textContent,
                                    [21],
                                    ''
                                )
                            ) || 0;
                        currentComposition['FLD'] =
                            Number(
                                this.#getColumnHeaderValue(
                                    textContent,
                                    [22],
                                    ''
                                )
                            ) || 0;

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

    #parseProtecteZoneOzu = (protectZoneOzu) => {
        let resultZoneOzuId = 7;

        let zoneOzuIndex = this.#mapFile['nameProtectedForests'].findIndex(
            (zoneOzuItem) => {
                return isStringEqual(protectZoneOzu, zoneOzuItem[0]) == 0;
            }
        );
        if (zoneOzuIndex > -1) {
            return Number(
                this.#mapFile['nameProtectedForests'][2] || resultZoneOzuId
            );
        } else {
            zoneOzuIndex = lotProtectZoneOzu.findIndex((zoneOzuItem) => {
                if (zoneOzuItem) {
                    return zoneOzuItem.name.split('|').findIndex((ozuName) => {
                        if (isStringEqual(ozuName, protectZoneOzu) == 0) {
                            resultZoneOzuId = zoneOzuItem.code;
                            return true;
                        }
                    });
                }
            });
        }

        if (zoneOzuIndex == -1 && !this.#noProtectZoneOzu.has(protectZoneOzu)) {
            this.#noProtectZoneOzu.add(protectZoneOzu);
            this.#messagerForestry.warningMessages(
                `Не удалось распарсить категорию защитных мероприятий [${protectZoneOzu}] в квартале ${
                    this.#currentKvartal
                }`
            );
        }
        return resultZoneOzuId;
    };

    #checkForTableHeader = (textContent) => {
        if (
            (textContent.split(':').length > 10 ||
                textContent.split('|').length > 10) &&
            !this.#tableHeaders.length
        ) {
            // Если отсутствует структура заголовка, то пытаемся его прочитать
            const splitSymbol = textContent.split(':').length > 10 ? ':' : '|';
            let start = 0;
            let end = 0;

            if (textContent.indexOf(splitSymbol) == 0) {
                textContent = textContent.slice(1);
                end = 1;
            }

            if (Number(textContent.split(splitSymbol)[0]) > 0) {
                this.#tableHeaders = textContent
                    .split(splitSymbol)
                    .map((item) => {
                        end += item.length - (start == 0 ? 1 : 0);
                        const diapazon = { start, end };
                        start = end + 1;
                        end = start;
                        return diapazon;
                    });
                //console.log(this.#tableHeaders, 'HEADER');
            }
        }

        return (
            textContent.split(':').length > 10 ||
            textContent.split('-').length > 10 ||
            textContent.split('|').length > 10 ||
            textContent.split('=').length > 10 ||
            textContent.trim() == '' ||
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

    // Если мы нашли комплексный заголовок, то пытаемся его распарсить на составляющие
    #extractFromComplexAdditional = (complexAdditional) => {
        let resultAdditionals = [];
        let cAdditional = '';
        //console.log(complexAdditional, 'Найден новый комплексный заголовок');
        if (complexAdditional) {
            lotAdditionalData.forEach((addition) => {
                addition.value.split('|').forEach((aValue) => {
                    if (
                        isStringEqual(complexAdditional, aValue) > -1 &&
                        cAdditional !== addition.value
                    ) {
                        cAdditional = addition.value;
                        complexAdditional = complexAdditional.replace(
                            new RegExp(aValue, 'i'),
                            `     ${aValue}`
                        );
                    }
                });
            });

            while (complexAdditional.indexOf('      ') > -1)
                complexAdditional = complexAdditional
                    .replaceAll('      ', '     ')
                    .trim();

            resultAdditionals = complexAdditional
                .split('     ')
                .filter((value) => value.trim());
        }
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
                    index > 0 &&
                    zoneItem[0].search(new RegExp(protectedZone, 'i')) == 0
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
                        (pzPart) => isStringEqual(pzPart, protectedZone) == 0
                    );
                if (ptotectIndex > -1) result['pzCode'] = pzItem.code;
                return ptotectIndex > -1;
            });
            // Если не нашли код защитных лесов логируем ошибку
            if (
                pzExtraIndex < 0 &&
                !this.#noProtectZone.has(protectedZone) &&
                logWarning
            ) {
                this.#noProtectZone.add(protectedZone);
                this.#messagerForestry.warningMessages(
                    `Не удалось распарсить категорию защитных лесов [${protectedZone}] в квартале ${
                        this.#currentKvartal
                    }`
                );
            }
        }
        return result;
    };

    // Проверяем наличие текущей категории земель
    #checkForLandCategory = (landCategory, logWarning = false) => {
        let hasAdditional = false;
        landCategory = landCategory.trim();
        landCategory = landCategory.trim();

        const result = {
            landName: 'Естественное происхождение',
            landType: 'лесные земли',
            compositionType: composeType.culture,
            landTier: 1,
            landCode: 1101,
        };

        const { isComposition } = this.#checkForCompositition(landCategory);

        if (!isComposition) {
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
                                if (
                                    isStringEqual(landTypeItem, landCategory) ==
                                        0 ||
                                    isStringEqual(landCategory, landTypeItem) ==
                                        0
                                ) {
                                    // if (
                                    //     (this.#currentKvartal == 1 && this.#currentLot == 1)
                                    // )
                                    //     console.log(landTypeItem, landCategory);
                                    //if (item.isPreview)
                                    result['landName'] = item.isPreview
                                        ? landCategory
                                        : landTypeItem;
                                    result['landType'] = item.type;
                                    result['landTier'] = item.tier;
                                    result['landCode'] = item.code;
                                    if (result['landType'] == 'нелесные земли')
                                        result['compositionType'] =
                                            composeType.object;

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

            // Проверяем категорию на хозмероприятия
            const { isActivity, isAdditional } =
                this.#checkForLotAdditional(landCategory);
            //console.log(landCategory, isActivity, isAdditional);
            hasAdditional = isActivity || isAdditional;

            if (
                this.#currentFeatureType == featureType.main &&
                !this.#noLandType.has(landCategory) &&
                (result['landCode'] || 0) < 1 &&
                !hasAdditional &&
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
            const { hasAdditions } = this.#checkForCompositionsAndAdditions();

            isAdditional =
                textContent.indexOf(':') > -1 ||
                lotAdditionalData.findIndex((lotValue) => {
                    return (
                        lotValue.value.split('|').findIndex((lotPart) => {
                            // Проверяем на наличие дополнения и отсутствии его среди наименования культур (чтобы случайно вместо дополнения не захватить культуру)
                            if (
                                isStringEqual(textContent, lotPart.trim()) == 0
                            ) {
                                if (lotValue.isElement) {
                                    name = lotPart.trim();
                                    value = textContent
                                        .slice(lotPart.length)
                                        .trim();
                                } else {
                                    name = lotValue.name.trim();
                                    value = textContent;
                                }

                                //return textContent.trim().search(lotValue.name) == 0;
                                return true;
                            }
                        }) > -1
                    );
                }) > -1;

            isActivity =
                lotAdditionalActivities.findIndex((activitiesValue) => {
                    if (
                        isStringEqual(
                            this.#currentLandName,
                            activitiesValue.composition
                        ) > -1
                    )
                        if (
                            // this.#currentLandName &&
                            // isStringEqual(
                            //     this.#currentLandName,
                            //     activitiesValue.composition
                            // ) == 0 &&
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
                                        this.#currentLandName.indexOf(
                                            splitSymbol
                                        ) + 1
                                    )
                                    .trim()} ${textContent.trim()}`;
                            } else value = textContent.trim();
                            return true;
                        }
                }) > -1;

            if (textContent.indexOf(':') > -1) {
                name = textContent.split(':')[0].trim();
                value = textContent.split(':').slice(1).join('').trim();
            }

            if (
                !isAdditional &&
                !isActivity &&
                !hasAdditions &&
                this.#currentCompositionType == composeType.object
            ) {
                name = 'objDesc';
                value = '';

                if (
                    !hasAdditions &&
                    textContent.indexOf('  ') > -1 &&
                    textContent
                        .slice(textContent.indexOf('  ') + 2)
                        .replaceAll('-', '')
                        .replaceAll('0', '')
                        .trim()
                ) {
                    isAdditional = true;
                    value = textContent.slice(textContent.indexOf('  ') + 2);
                } else {
                    if (
                        isStringEqual(
                            textContent.trim(),
                            this.#currentLandName
                        ) !== 0
                    ) {
                        isAdditional = true;
                        value = textContent.trim();
                    }
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
        const composeMask = new RegExp(/[\d|\+|,]+[А-Я|-]+/g);
        // Если в элементе описания композиции обнаружены пробелы => удаляем их
        composition = composition.replaceAll(' ', '');

        let isComposition = false;
        let koeff = '';
        let fullName = composition;
        let name = composition;
        let count = 0;

        if (
            composition &&
            composition.match(composeMask) &&
            composition.match(composeMask).length > 0
        ) {
            count = composition.match(composeMask).length;
            koeff = composition
                .match(composeMask)
                [
                    koeffIndex < composition.match(composeMask).length
                        ? koeffIndex
                        : composition.match(composeMask).length - 1
                ].match(/[\d\+,]+/g)[0];
            fullName = composition.match(composeMask).join('');
            isComposition = Boolean(fullName == composition);
            name = composition
                .match(composeMask)
                [
                    koeffIndex < composition.match(composeMask).length
                        ? koeffIndex
                        : composition.match(composeMask).length - 1
                ].match(/[А-Я|-]+/g)[0];
        }

        return {
            isComposition,
            koeff: isNaN(koeff) ? '0' : koeff,
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

        if (this.#getColumnHeaderValue(textContent, [12], '')) {
            if (!currentComposition['TLU']) currentComposition['TLU'] = [];

            currentComposition['TLU'].push(
                this.#getColumnHeaderValue(textContent, [12], '')
            );
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

            currentComposition['detailes'].push({
                CN: this.#checkForCompositition(
                    this.#getColumnHeaderValue(textContent, [5], ''),
                    0
                ).name,
                CT:
                    this.#checkForLandCategory(currentComposition['LN'])
                        .landTier ||
                    Number(this.#getColumnHeaderValue(textContent, [3], '')) ||
                    1,
                CK: this.#checkForCompositition(
                    currentComposition['CN'],
                    compositionIndex
                ).koeff,
                CA:
                    Number(this.#getColumnHeaderValue(textContent, [6], '')) ||
                    0 ||
                    0,
                CH:
                    Number(this.#getColumnHeaderValue(textContent, [7], '')) ||
                    0 ||
                    0,
                CD:
                    Number(this.#getColumnHeaderValue(textContent, [8], '')) ||
                    0 ||
                    0,
                FFN: this.#getColumnHeaderValue(textContent, [13], ''),
                FR: this.#getColumnHeaderValue(textContent, [14], ''),
                CS: this.#getColumnHeaderValue(textContent, [16], ''),
                CC:
                    Number(this.#getColumnHeaderValue(textContent, [17], '')) ||
                    0 ||
                    0,
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
        let newKvartal = 0;

        textContent = textContent
            .replace('Квартал:', 'Квартал')
            .replaceAll(':', ':     ');

        if (textContent.search(/уч.л-во/i) > 0) {
            indexTract = textContent.search(/уч.л-во/i) + 8;
            textContent = textContent.slice(indexTract).trim();
        } else if (textContent.search(/уч. лес-во/i) > 0) {
            indexTract = textContent.search(/уч. лес-во/i) + 12;
            textContent = textContent.slice(indexTract).trim();
        } else if (textContent.search(/участковое/i) > 0) {
            indexTract = textContent.search(/участковое/i) + 25;
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
                this.#isParseTitul &&
                this.#isParseTitul
            ) {
                this.#forestryTract = textContent
                    .slice(0, textContent.search(searchCategory) - 1)
                    .trim();
            }
            indexProtect = textContent.indexOf(
                ' ',
                textContent.search(searchCategory) +
                    (textContent.search(/Категория лес/i) > -1 ? 15 : 20)
            );

            textContent = textContent.slice(indexProtect).trim();
            this.#currentProtectZone = textContent
                .slice(0, textContent.search(/Квартал /i))
                .trim();
            // console.log(
            //     this.#currentProtectZone,
            //     'Текущая защитная зона лесов'
            // );
            // Если не находит указание на защитную категорию считаем, что пере кварталом уже указана защитая категория
        } else {
            this.#currentProtectZone = textContent
                .slice(0, textContent.search(/Квартал /i))
                .trim();
            // Если не находит указание на защитную категорию считаем, что пере кварталом уже указана защитая категория
        }
        // console.log(
        //     this.#currentKvartal,
        //     newKvartal,
        //     textContent.search(/Квартал/i),
        //     'Мы на квартале!!!'
        // );
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
                            this.forestryFile
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
                                  this.#tableHeaders[index].end + 1
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
                            this.forestryFile.split('.')[0]
                        }_logger.json`
                    )
                )
            )
                fs.unlinkSync(
                    path.resolve(
                        rootPath,
                        this.#toPath,
                        `${this.#forestryMain}/${
                            this.forestryFile.split('.')[0]
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
                            this.forestryFile.split('.')[0]
                        }_warning.log`
                    )
                )
            )
                fs.unlinkSync(
                    path.resolve(
                        rootPath,
                        this.#toPath,
                        `${this.#forestryMain}/${
                            this.forestryFile.split('.')[0]
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
                            this.forestryFile.split('.')[0]
                        }_error.log`
                    )
                )
            )
                fs.unlinkSync(
                    path.resolve(
                        rootPath,
                        this.#toPath,
                        `${this.#forestryMain}/${
                            this.forestryFile.split('.')[0]
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
                                this.forestryFile.split('.')[0]
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
                                this.forestryFile.split('.')[0]
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
                                this.forestryFile.split('.')[0]
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
                      '0'
                  );
        }
    };

    // Функция инициализации схемы полей в таблице выходнй БД
    #readFieldsDescription = async () => {
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
