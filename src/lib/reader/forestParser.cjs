const anyReader = require('any-text');
const { DBFFile } = require('dbffile');

const fs = require('fs');
const path = require('path');

const searchStep = {
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
    object: 'OBJECT',
};

const lotAdditionalData = [
    { name: 'Класс пожарной опасности ', isElement: true },
    { name: 'подлесок ', isElement: true },
    { name: 'подрост ', isElement: true },
    { name: 'культуры-', isElement: true },
    { name: 'год создания л/к ', isElement: false },
    { name: 'год вырубки ', isElement: false },
    { name: 'полнота ', isElement: false },
    { name: 'ЛЕСОХОЗЯЙСТВЕHHАЯ', isElement: false },
];
const lotAdditionalActivities = [
    { composition: 'Вырубка', additionalText: ' пней,' },
];

const lotExtraProtectZone = [
    { name: 'Зеленые зоны', code: 131802 },
    { name: 'Лесопарковые зоны', code: 131801 },
    { name: 'Защитные полосы вдоль дорог', code: 120800 },
    { name: 'Защ. пол. лесов, расп.вд жел. пут. общ. пол', code: 133100 },
];

const lotExtraLandType = [
    {
        value: 'Естеств. возобновл.',
        type: 'лесные земли',
        tier: 1,
        code: '1101',
    },
    {
        value: 'Лагеря отдыха',
        type: 'нелесные земли',
        code: '2412',
    },
    {
        value: 'Усадьбы',
        type: 'нелесные земли',
        code: '2401',
    },
    {
        value: 'Разрывы противопожарные',
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
        type: 'нелесные земли',
        code: '2423',
    },
    {
        value: 'Трассы мелиоративные',
        type: 'нелесные земли',
        code: '2556',
    },
    {
        value: 'Дорога автомоб. иск. покр.',
        type: 'нелесные земли',
        code: '2320',
    },
    {
        value: 'Сады',
        type: 'лесные земли',
        tier: 1,
        code: '1343',
    },
    {
        value: 'Насажд.с культ.подпол.|Нас.ест.с прим.л/к',
        type: 'лесные земли',
        tier: 5,
        code: '1107',
    },
    {
        value: 'Культуры н/с|Культуры несомкнувшиеся',
        type: 'лесные земли',
        tier: 4,
        code: '1201',
    },
    {
        value: 'Культ.лесные|Культуры лесные|лесные культуры',
        type: 'лесные земли',
        tier: 1,
        code: '1108',
    },
    {
        value: 'Прогалина',
        type: 'лесные земли',
        tier: 1,
        code: '1510',
    },
    {
        value: 'Культуры с культурами под пологом|Насажд.с культ.подпол.|Несомкн.к.непокр.пл.',
        type: 'лесные земли',
        tier: 1,
        code: '1114',
    },
    {
        value: 'Единичные деревья',
        type: 'лесные земли',
        tier: 9,
        code: '1101',
    },
    {
        value: 'Вырубка',
        type: 'лесные земли',
        tier: 1,
        code: '1509',
    },
    {
        value: 'Лесосека|Текущая лесосека',
        type: 'лесные земли',
        tier: 1,
        code: '1507',
    },
    {
        value: 'Редина естественная|Редина',
        type: 'лесные земли',
        tier: 8,
        code: '1400',
    },
    {
        value: 'Дороги полевые, лесные',
        type: 'нелесные земли',
        code: '2307',
    },
    {
        value: 'Дорога автомоб. грунтовые',
        type: 'нелесные земли',
        code: '1001',
    },
    {
        value: 'Болото',
        type: 'лесные земли',
        code: '2507',
    },
    {
        value: 'Просека квартальная',
        type: 'нелесные земли',
        code: '2322',
    },
    // Добавляем промежуточное описание культур для интерпретации первичных нзвание лесных земель, с целью дальнейшего уточнения
    {
        value: 'Культ|Насажд',
        type: 'лесные земли',
        isPreview: true,
        tier: 1,
        code: '1101',
    },
];

class ForestParser {
    #isParseHeader = false;

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

    #currentStep = searchStep.stepKvartal;
    #currentFeatureType = featureType.kvartal;

    #forestryMain = null;
    #forestryDistrict = null;
    #forestryTract = null;
    #forestryRegion = null;
    #forestryCS = null;
    #taxerCompany = null;
    #taxerExpedition = null;

    #noLandType = null;
    #noAdditional = null;
    #noProtectZone = null;

    #countLots = 0;
    #countKvartals = 0;

    #forestryResult = {};

    #pathToAssets = 'src/assets';

    #dbFields = [];

    #dbfFile = null;
    #mapFile = null;
    #messagerForestry = null;
    #schemaFields = null;
    #tableHeaders = [];

    #forestryFile = null;

    #forestryContent = [];

    #toPath = 'src/assets';

    #charset = 'UTF-8';

    constructor(options = {}) {
        //super();

        this.#forestryMain = options.forestryMain;
        this.#forestryDistrict = options.forestryDistrict;
        this.#forestryTract = options.forestryTract;
        this.#forestryRegion = options.forestryRegion;
        this.#forestryCS = options.forestryCS;
        this.#taxerCompany = options.taxerCompany;
        this.#taxerExpedition = options.taxerExpedition;
        this.#isParseHeader = !!options.isParseHeader;

        this.#forestryFile = options.forestryFile;

        this.#noLandType = new Set();
        this.#noAdditional = new Set();
        this.#noProtectZone = new Set();
    }

    parseForestry = async () => {
        // В начале запускаем функцию инициализации исходных данных для дальнейшего использовани при парсинге таксо
        await this.#initParserData();
        // Начинаем парсить данные таксационной карточки
        for (const forestItem of this.#forestryContent) {
            //console.log(forestItem);
            if (this.#currentFeatureType !== featureType.final) {
                // Проверяем каждую строку на наличие различных сущностей и подсказываем как необходимо парсить текущие данные
                this.#checkForForestryFeature(forestItem);
                //if (forestItem)
                // Распарсиваем содержимое строки таксационной карточки по описаниям лесных пород для текущего выдела
                this.#parseLotContent(forestItem);
            }
            //if (Number(this.#currentKvartal) == 12) break;
            // if (this.#currentLot == 7) {
            //     this.#messagerForestry.logMessages(this.#forestryResult);
            //     //break;
            // }
        }
        // Записываем полученный после парсинга объект в лог файл
        this.#messagerForestry.logMessages(this.#forestryResult);
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
            // Создаем логгер парсинга
            this.#messagerForestry = this.#messageToLogForestry();

            // Читаем требуемый файл - таксационную карточку лесничества и выводим результат на экран
            this.#forestryContent =
                (
                    await this.#openFileForestry(
                        `${this.#forestryMain}/${this.#forestryFile}`,
                        false
                    )
                ).split('\n') ?? [];

            if (this.#forestryContent.length > 0) {
                console.log(
                    //this.#forestryContent,
                    `Данные файла лесничества ${this.#forestryMain} - [${
                        this.#forestryFile
                    }] прочитаны`
                );
            } else {
                console.log(
                    `Файл лесничества ${this.#forestryMain} - [${
                        this.#forestryFile
                    }] - пустой`
                );
            }
        } catch (err) {
            console.log(`Error occured:\n ${err}`);
        }
    };

    // Функция проверяет тип объекта текущей строки: квартал, выдел, порода, дополнение или статистика
    #checkForForestryFeature = (textContent) => {
        // Проверяем на наличие данных по кварталу
        if (this.#checkForKvartal(textContent)) {
            // Распарсиваем данные урочища, защитной категории леса и новый номер квартала
            this.#parseKvartalContent(textContent);

            // Проверяем на завершение таксационной карты
            if (this.#checkForForesterySummary(textContent))
                this.#currentFeatureType = featureType.final;
            return;
            //this.#currentFeatureType = featureType.kvartal;
            // Если обнаруживаем данные для пропуска проверки на элементы леса, то выходим из функции
        } else if (this.#checkForTableHeader(textContent)) {
            console;
            return;
        } // Проверяем на наличие статистики по кварталу
        else if (this.#checkForKvartalSummary(textContent)) {
            this.#currentFeatureType = featureType.summary;
            // Проверяем начало нового выдела и при его наличии переходим на шаг MAIN_FEATURE
        } else if (
            Number(this.#getColumnHeaderValue(textContent, [0], '')) > 0 &&
            this.#currentKvartal
        ) {
            // Если нашли начало нового выдела присваиваем необходимые сущности
            this.#currentStep = searchStep.stepFeature;
            this.#currentFeatureType = featureType.main;
            this.#currentLot = Number(
                this.#getColumnHeaderValue(textContent, [0], '')
            );
            this.#countLots++;
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
        // Проверяем на наличии дополнений для описания выдела
        else if (
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
                (this.#currentLandName == 'Единичные деревья' ||
                    this.#currentLandName == 'Сады') &&
                this.#getColumnHeaderValue(textContent, [2], '') ==
                    this.#getColumnHeaderValue(textContent, [5], '')
                    ? '1'
                    : ''
            }${this.#getColumnHeaderValue(textContent, [2], '')}`;

            const { isComposition, fullName: compositionFullName } =
                this.#checkForCompositition(compositionText);
            const { compositions } = this.#checkForCompositionsOrAdditions();

            // Если это породный состав, а также присутствуют ярус и высота яруса, то добавляем его в описание выдела
            if (isComposition) {
                this.#currentCompositionType = composeType.culture;
                // console.log(
                //     Number(this.#getColumnHeaderValue(textContent, [3], '')),
                //     Number(this.#getColumnHeaderValue(textContent, [4], '')),
                //     this.#getColumnHeaderValue(textContent, [5], ''),
                //     compositionFullName,
                //     'Test composition data'
                // );

                if (
                    Number(this.#getColumnHeaderValue(textContent, [3], '')) >
                        0 ||
                    Number(this.#getColumnHeaderValue(textContent, [4], '')) >
                        0 ||
                    this.#getColumnHeaderValue(textContent, [5], '') ||
                    this.#getColumnHeaderValue(textContent, [12], '')
                ) {
                    if (this.#currentComposition !== compositionFullName) {
                        if (!this.#currentLandName) {
                            this.#currentLandName =
                                'Естественное происхождение';
                        }
                        if (compositions.length == 0) compositions.push({});

                        this.#currentLandType = 'лесные земли';
                    }

                    const lastComposition =
                        compositions[compositions.length - 1];

                    this.#currentComposition = compositionFullName;

                    lastComposition['CN'] = this.#currentComposition;
                    lastComposition['CT'] = this.#currentCompositionType;
                    lastComposition['LN'] = this.#currentLandName;
                    lastComposition['LT'] = this.#currentLandType;
                    lastComposition['LCODE'] = this.#currentLandCode ?? 1101;

                    // Зануляем категорию земель, чтобы новые категории давали начало новому описанию сущности леса в выделе
                    this.#currentLandName = null;
                } else {
                    // Если это дополнение к названию состава пород, то добавляем его к последнему copmositionName
                    // ==> if (compositions.length == 0) compositions.push({});

                    const lastComposition =
                        compositions[compositions.length - 1];

                    if (this.#currentComposition) {
                        this.#currentComposition += compositionFullName;
                    } else {
                        this.#currentComposition = compositionFullName;
                    }
                    // if (compositions.length == 0)
                    //     this.#messagerForestry.logMessages(
                    //         JSON.stringify(this.#forestryResult)
                    //     );

                    lastComposition['CN'] = this.#currentComposition;
                    // Зануляем категорию земель, чтобы новые категории давали начало новому описанию сущности леса в выделе
                    this.#currentLandName = null;
                }
            } else {
                // Проверяем, если в колонке состава выдела есть какое-то наименование сущности, но оно не состав пород, то мы попали на новую категорию земель
                if (this.#getColumnHeaderValue(textContent, [2], '') !== '') {
                    const newLandName = this.#getColumnHeaderValue(
                        textContent,
                        //this.#currentLandName ||
                        Number(
                            this.#getColumnHeaderValue(textContent, [3], '')
                        ) > 0 ||
                            Number(
                                this.#getColumnHeaderValue(textContent, [4], '')
                            ) > 0
                            ? [2]
                            : ['2 - 6'],
                        ''
                    );

                    // Проверяем является ли данная категория лесных земель самостоятельной (имеет код в классификаторе) и если нет, считаем данное описание продолжением наименования предыдущего названия категории
                    let { landName, landType, compositionType, landCode } =
                        this.#checkForLandCategory(newLandName, true);

                    // console.log(
                    //     newLandName,
                    //     landName,
                    //     landCode,
                    //     'Try parse new landype'
                    // );

                    // Если категория леных земель не найдена в классификаторе, тогда считаем ее продолжением наименования предыдущей категории
                    if (landCode < 1) {
                        const newCategory = this.#checkForLandCategory(
                            `${
                                this.#currentLandName
                                    ? this.#currentLandName + ' '
                                    : ''
                            }${newLandName}`,
                            true
                        );
                        landName = newCategory.landName;
                        landType = newCategory.landType;
                        compositionType = newCategory.compositionType;
                        landCode = newCategory.landCode;
                    }

                    this.#currentCompositionType = compositionType;
                    this.#currentLandCode = landCode;
                    //this.#currentCompositionType = null;

                    let landDetailes = '';

                    if (this.#currentCompositionType == composeType.object) {
                        //Если найденная категори не является землями леса, то пытаемся отделить наименование земли и описание ее дополнительной характеристики
                        const fullLandName = this.#getColumnHeaderValue(
                            textContent,
                            ['2-22'],
                            ''
                        );

                        if (fullLandName.trim().indexOf('  ') > -1) {
                            landName = fullLandName.split('  ')[0].trim();
                            landDetailes = fullLandName
                                .slice(fullLandName.indexOf('  ') + 2)
                                .trim();
                        }
                        this.#currentLandType = landType;
                        this.#currentLandName = landName;

                        this.#forestryResult[this.#currentKvartal].lots[
                            this.#currentLot
                        ]['additions'] = [];

                        compositions.push({});
                        const lastComposition =
                            compositions[compositions.length - 1];

                        const { landCode } = this.#checkForLandCategory(
                            this.#currentLandName,
                            true
                        );
                        this.#currentLandCode = landCode;

                        lastComposition['CT'] = this.#currentCompositionType;
                        lastComposition['LN'] = this.#currentLandName;
                        lastComposition['LT'] = this.#currentLandType;
                        lastComposition['LCODE'] = this.#currentLandCode;

                        if (landDetailes) {
                            const { additions } =
                                this.#checkForCompositionsOrAdditions();
                            additions.push({
                                name: 'objDesc',
                                value: landDetailes,
                            });
                            this.#currentFeatureType = featureType.addition;
                        }
                    } else {
                        // Если обнаруживаем новое описание категории земель, добавляем его в описание категории леса
                        if (this.#currentLandName !== landName)
                            compositions.push({});

                        this.#currentLandName = landName;

                        const lastComposition =
                            compositions[compositions.length - 1];
                        // Присваиваем имененное значение описание категории лесных земель в описание композиции и проверяем код категории
                        lastComposition['LN'] = this.#currentLandName;
                        let { landType, landCode } = this.#checkForLandCategory(
                            this.#currentLandName,
                            true
                        );
                        lastComposition['CT'] = this.#currentCompositionType;
                        lastComposition['LT'] = landType;
                        lastComposition['LCODE'] = landCode;
                    }

                    //}
                }
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
            switch (this.#currentFeatureType) {
                case featureType.addition:
                    const { isAdditional, name, value } =
                        this.#checkForLotAdditional(textContent);
                    const { additions: lotAdditions } =
                        this.#checkForCompositionsOrAdditions();
                    // Проверяем, чтобы мы были не на основной строке описания сущности и категория земель была лесные земли
                    if (isAdditional) {
                        lotAdditions.push({ name, value });
                    } else {
                        // Если это не целое дополнение, то добавляем его в значение параметра дополнения для нелесных земель предыдущей итерации
                        if (
                            lotAdditions.length > 0 &&
                            textContent.trim() &&
                            Number(
                                this.#getColumnHeaderValue(textContent, [0], '')
                            ) == 0
                        ) {
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
                    const { compositions } =
                        this.#checkForCompositionsOrAdditions();
                    const currentComposition =
                        compositions[compositions.length - 1];
                    // Если мы находимся на описании пород и присутствует номер и высота яруса или тп леса, то считываем информацию в текущий выдел
                    if (
                        Number(
                            this.#getColumnHeaderValue(textContent, [3], '') > 0
                        ) ||
                        this.#getColumnHeaderValue(textContent, [12], '')
                    ) {
                        // Мы на строке с превалирующей породой

                        currentComposition['FL'] =
                            this.#getColumnHeaderValue(textContent, [3], '') ||
                            currentComposition['FL'];

                        currentComposition['FLH'] =
                            this.#getColumnHeaderValue(textContent, [4], '') ||
                            currentComposition['FLH'];
                        currentComposition['FC'] =
                            !currentComposition['FC'] &&
                            this.#getColumnHeaderValue(textContent, [5], '')
                                ? this.#getColumnHeaderValue(
                                      textContent,
                                      [5],
                                      ''
                                  )
                                : currentComposition['FC'];

                        currentComposition['AC'] =
                            this.#getColumnHeaderValue(textContent, [9], '') ||
                            currentComposition['AC'];

                        currentComposition['AG'] =
                            this.#getColumnHeaderValue(textContent, [10], '') ||
                            currentComposition['AG'];

                        currentComposition['FB'] =
                            this.#getColumnHeaderValue(textContent, [11], '') ||
                            currentComposition['FB'];
                        currentComposition['FFN'] =
                            this.#getColumnHeaderValue(textContent, [13], '') ||
                            currentComposition['FFN'];
                        currentComposition['FR'] =
                            this.#getColumnHeaderValue(textContent, [14], '') ||
                            currentComposition['FFN'];
                        currentComposition['FLR'] =
                            this.#getColumnHeaderValue(textContent, [15], '') ||
                            currentComposition['FLR'];

                        currentComposition['FLS'] =
                            this.#getColumnHeaderValue(textContent, [18], '') ||
                            currentComposition['FLS'];
                        currentComposition['FLSR'] =
                            this.#getColumnHeaderValue(textContent, [19], '') ||
                            currentComposition['FLSR'];
                        currentComposition['FLSS'] =
                            this.#getColumnHeaderValue(textContent, [20], '') ||
                            currentComposition['FLSS'];
                        currentComposition['FLC'] =
                            this.#getColumnHeaderValue(textContent, [21], '') ||
                            currentComposition['FLC'];
                        currentComposition['FLD'] =
                            this.#getColumnHeaderValue(textContent, [22], '') ||
                            currentComposition['FLD'];

                        this.#addSingleCompositToLot(textContent);
                        // Для добавления индивидуальной породы проверяем, чтобы в выделе уже было описание состава пород
                    } else if (currentComposition['CN']) {
                        this.#addSingleCompositToLot(textContent);
                    }
                    break;
            }
        }
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
            textContent.search(/Участковое /i) > 0 ||
            textContent.search(/Лесничество/i) > 0 ||
            textContent.search(/уч.лес/i) > 0 ||
            textContent.search(this.#forestryDistrict) > 0 ||
            textContent.search(/Категория защ/i) > 0 ||
            textContent.search(/Целевое назн/i) > 0
        );
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
                return index > 0 && zoneItem[0].search(protectedZone) == 0;
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
                if (pzItem.name.search(protectedZone) == 0)
                    result['pzCode'] = pzItem.code;
                return pzItem.name.search(protectedZone) == 0;
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
                    return index > 0 && landItem[0].search(landCategory) == 0;
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
                    this.#mapFile['landType'][landTypeIndex][4] || '0';
            } else {
                // Если не нашли категорию в map файле пробуем найти ее в доп материалах к программе
                const landExtraIndex = lotExtraLandType.findIndex((item) => {
                    return (
                        item.value
                            .split('|')
                            .findIndex((landTypeItem, index) => {
                                if (
                                    // landTypeItem.search(
                                    //     new RegExp(landCategory, 'i')
                                    // ) == 0 ||
                                    landCategory.search(
                                        new RegExp(landTypeItem, 'i')
                                    ) == 0
                                ) {
                                    result['landName'] = item.isPreview
                                        ? landCategory
                                        : landTypeItem;
                                    result['landType'] = item.type;
                                    result['landTier'] = item.tier;
                                    result['landCode'] = item.code;
                                    return true;
                                }
                            }) > -1
                    );
                });

                if (result['landType'] == 'нелесные земли')
                    result['compositionType'] = composeType.object;

                if (landExtraIndex < 0) {
                    result['landName'] = landCategory;
                    result['landType'] = 'нелесные земли';
                    result['compositionType'] = composeType.object;
                    result['landCode'] = '-1';

                    //console.log(landCategory, 'Нелесное описание объекта');

                    if (
                        this.#currentFeatureType == featureType.main &&
                        !this.#noLandType.has(landCategory) &&
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
            }
        }
        return result;
    };

    // Проверяем текущую строку на наличие дополнения в выделе
    #checkForLotAdditional = (textContent, logWarning = false) => {
        let isAdditional = false;
        let name = '';
        let value = '';

        if (
            this.#currentStep == searchStep.stepFeature &&
            (this.#currentFeatureType == featureType.main ||
                this.#currentFeatureType == featureType.addition)
        ) {
            textContent = textContent.trim();

            isAdditional =
                (textContent.indexOf(':') > -1 &&
                    textContent.split(':').length == 2) ||
                lotAdditionalData.findIndex((lotValue) => {
                    if (textContent.search(lotValue.name) == 0) {
                        if (lotValue.isElement) {
                            name = lotValue.name.trim();
                            value = textContent
                                .replace(lotValue.name, '')
                                .trim();
                        } else {
                            name = 'Состав';
                            value = textContent;
                        }

                        const { hasAdditions } =
                            this.#checkForCompositionsOrAdditions();
                        //return textContent.trim().search(lotValue.name) == 0;
                        return (
                            (lotValue.isElement &&
                                textContent.search(lotValue.name) == 0) ||
                            (!lotValue.isElement && !hasAdditions)
                        );
                    }
                }) > -1 ||
                lotAdditionalActivities.findIndex((activitiesValue) => {
                    if (
                        this.#currentLandName &&
                        this.#currentLandName.search(
                            activitiesValue.composition
                        ) == 0 &&
                        textContent.search(activitiesValue.additionalText) > -1
                    ) {
                        name = 'activities';
                        value = textContent.trim();
                        return true;
                    }
                }) > -1;

            // if (isAdditional)
            //     console.log(name, value, textContent, 'Новое дополнение');
            if (
                textContent.indexOf(':') > -1 &&
                textContent.split(':').length == 2
            ) {
                name = textContent.split(':')[0].trim();
                value = textContent.split(':')[1].trim();
            }

            // if (
            //     this.#currentLandName &&
            //     this.#currentLandName.search('Просека') > -1
            // )
            //     console.log(textContent, isAdditional, 'Check for additional');

            if (
                !isAdditional &&
                this.#currentFeatureType == featureType.addition &&
                !this.#noAdditional.has(textContent) &&
                logWarning
            ) {
                this.#noAdditional.add(textContent);
                this.#messagerForestry.warningMessages(
                    `Не удалось распарсить дополнительное описание [${textContent}] для выдела ${
                        this.#currentLot
                    } в квартале ${this.#currentKvartal}`
                );
            }
        }
        return { isAdditional, name, value };
    };

    // Проверяем наличие описания композиций и дополнений в композиции
    #checkForCompositionsOrAdditions = () => {
        let hasCompositions = false;
        let hasAdditions = false;

        const additions =
            this.#forestryResult[this.#currentKvartal].lots[this.#currentLot][
                'additions'
            ];

        const compositions =
            this.#forestryResult[this.#currentKvartal].lots[this.#currentLot][
                'compositions'
            ];

        hasCompositions = (compositions ?? []).length > 0;
        hasAdditions = (additions ?? []).length > 0;

        return {
            hasCompositions,
            hasAdditions,
            compositions,
            additions,
        };
    };

    // Проверяем текущую строку на наличие статистики по выделу
    #checkForKvartalSummary = (textContent) => {
        return (
            textContent.search(/Итого по категории/gi) > -1 ||
            textContent.search(/Итого по кварталу/gi) > -1 ||
            textContent.search(/Итоги по /gi) > -1
        );
    };

    #checkForForesterySummary = (textContent) => {
        return textContent.search(/Всего по /gi) > -1;
    };

    // Функция проверки текущей лесной культуры на наличие породного состава и возвращение коэффициента породы
    #checkForCompositition = (composition, koeffIndex = 0) => {
        const composeMask = new RegExp(/[\d|\+|,]+[А-Я]+/g);
        let isComposition = false;
        let koeff = '';
        let fullName = composition;
        let name = composition;

        if (
            composition &&
            composition.match(composeMask) &&
            composition.match(composeMask).length > 0
        ) {
            isComposition = true;
            koeff = composition
                .match(composeMask)
                [
                    koeffIndex < composition.match(composeMask).length
                        ? koeffIndex
                        : composition.match(composeMask).length - 1
                ].match(/[\d\+,]+/g)[0];
            fullName = composition.match(composeMask).join('');
            name = composition
                .match(composeMask)
                [
                    koeffIndex < composition.match(composeMask).length
                        ? koeffIndex
                        : composition.match(composeMask).length - 1
                ].match(/[\d\+,]+/g)[1];
        }
        return { isComposition, koeff, name, fullName };
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
        const { compositions } = this.#checkForCompositionsOrAdditions();

        const currentComposition = compositions[compositions.length - 1];

        if (this.#getColumnHeaderValue(textContent, [23], '')) {
            if (!currentComposition['FA']) {
                if (this.#getColumnHeaderValue(textContent, [23], ''))
                    currentComposition['FA'] = [
                        this.#getColumnHeaderValue(textContent, [23], ''),
                    ];
            } else
                currentComposition['FA'].push(
                    this.#getColumnHeaderValue(textContent, [23], '')
                );
        }

        if (cType == composeType.object) return;

        if (!currentComposition['TLU']) {
            if (this.#getColumnHeaderValue(textContent, [12], ''))
                currentComposition['TLU'] = [
                    this.#getColumnHeaderValue(textContent, [12], ''),
                ];
        } else if (this.#getColumnHeaderValue(textContent, [12], '')) {
            currentComposition['TLU'].push(
                this.#getColumnHeaderValue(textContent, [12], '')
            );
        }

        // Если найдена новая порода, то добавляем ее детальное описание в текущую сущность выдела
        if (this.#getColumnHeaderValue(textContent, [5], '')) {
            if (!currentComposition['detailes'])
                currentComposition['detailes'] = [];
            const compositionIndex = currentComposition['detailes'].length;
            currentComposition['detailes'].push({
                CN: this.#checkForCompositition(
                    this.#getColumnHeaderValue(textContent, [5], ''),
                    0
                ).name,
                CT: this.#checkForLandCategory(currentComposition['LN']).tier,
                CK: this.#checkForCompositition(
                    currentComposition['CN'],
                    compositionIndex
                ).koeff,
                CA:
                    Number(this.#getColumnHeaderValue(textContent, [6], '')) ||
                    0,
                CH:
                    Number(this.#getColumnHeaderValue(textContent, [7], '')) ||
                    0,
                CD:
                    Number(this.#getColumnHeaderValue(textContent, [8], '')) ||
                    0,
                CS: this.#getColumnHeaderValue(textContent, [16], ''),
                CC: this.#getColumnHeaderValue(textContent, [17], ''),
            });
        }
    };

    // Функция парсинга строки с номером квартала
    #parseKvartalContent = (textContent) => {
        let indexTract = 0;
        let indexProtect = 0;
        let newKvartal = 0;

        if (textContent.search(/уч.л-во/i) > 0) {
            indexTract = textContent.search(/уч.л-во/i) + 8;
            textContent = textContent.slice(indexTract).trim();
        } else if (textContent.search(this.#forestryDistrict) > 0) {
            indexTract =
                textContent.search(this.#forestryDistrict) +
                this.#forestryDistrict.length;
            textContent = textContent.slice(indexTract).trim();
        }

        if (
            textContent.search(/Категория защ/i) > -1 ||
            textContent.search(/Целевое назн/i) > -1
        ) {
            const searchCategory =
                textContent.search(/Категория защ/i) > -1
                    ? /Категория защ/i
                    : /Целевое назн/i;

            if (textContent.search(searchCategory) > 1) {
                this.#currentForestryTract = textContent
                    .slice(0, textContent.search(searchCategory) - 1)
                    .trim();
            }
            indexProtect = textContent.indexOf(
                ' ',
                textContent.search(searchCategory) + 20
            );
            textContent = textContent.slice(indexProtect).trim();
            this.#currentProtectZone = textContent
                .slice(
                    0,
                    textContent.search(/Квартал /i) > 0
                        ? textContent.search(/Квартал /i) - 1
                        : textContent.length
                )
                .trim();
        }

        if (textContent.search(/Квартал /i) > -1) {
            newKvartal = Number(
                textContent.slice(textContent.search(/Квартал /i) + 8)
            );

            if (this.#currentKvartal != newKvartal) {
                if (
                    Number(this.#countKvartals) > 0 &&
                    Number(this.#countLots) > 0
                )
                    console.log(
                        `В квартале [${this.#currentKvartal}] найдено ${
                            this.#countLots
                        } выделов`
                    );
                this.#currentKvartal = newKvartal;
                this.#forestryResult[newKvartal] = {
                    lots: {},
                    Tract: this.#forestryFile.split('.')[0], //this.#currentForestryTract,
                    //PrZone: this.#currentProtectZone
                };
                this.#countKvartals++;
                this.#countLots = 0;

                this.#currentStep = searchStep.stepKvartal;
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
            return colIndexs
                .reduce((accumulator, index) => {
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
                            this.#tableHeaders[Number(index.split('-')[0])]
                                .start,
                            this.#tableHeaders[Number(index.split('-')[1])].end
                        );
                        // for (
                        //     let i = Number(index.split('-')[0]);
                        //     i <= Number(index.split('-')[1]);
                        //     i++
                        // ) {
                        //     accumulator =
                        //         accumulator +
                        //         this.#getColumnHeaderValue(textItem, [i]) +
                        //         splitSymbol;
                        // }
                        // return accumulator;
                    }
                }, '')
                .trim();
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
            return [];
        }
    };

    // Читаем файл лесничества (по умолчанию с классификатором исходных данных для лесничества - map)
    #openFileForestry = async (
        fileName = `${this.#forestryMain}/map.xlsx`,
        isParseResult = true
    ) => {
        try {
            console.log(`Читаем файл ${fileName}`);

            return isParseResult
                ? JSON.parse(
                      await anyReader.getText(
                          path.resolve(rootPath, this.#toPath, fileName)
                      )
                  )
                : await anyReader.getText(
                      path.resolve(rootPath, this.#toPath, fileName)
                  );
        } catch (err) {
            throw new Error(
                `Не удалось прочитать ${fileName} файл лесничества <${
                    this.#forestryMain
                }> по причине:\n ${err.message || '500 error on server'}`
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
            return await DBFFile.open(
                path.resolve(
                    rootPath,
                    this.#toPath,
                    `${this.#forestryMain}/${this.#forestryMain}.dbf`
                ),
                { encoding: this.#charset }
            );
        } catch (e) {
            console.log(e, 'Произошла ошибка');
            await this.#readFieldsDescription();
            console.log('Создаем БД для записи сведений таксационной карточки');
            return await DBFFile.create(
                path.resolve(
                    rootPath,
                    this.#toPath,
                    `${this.#forestryMain}/${this.#forestryMain}.dbf`
                ),
                this.#dbFields,
                { encoding: this.#charset }
            );
        }
    };
}

module.exports = { ForestParser };
