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
    header: 'HEADER',
    kvartal: 'KVARTAL',
};

const compotitionType = {
    culture: 'FOREST_CULTURE',
    object: 'FOREST_OBJECT',
};

const lotAdditionalData = ['Класс пожарной опасности '];
const lotAdditionalLandType = [
    {
        value: 'Насажд.с культ.подпол.',
        type: 'лесные земли',
        tier: 5,
        code: '1107',
    },
    {
        value: 'Единичные деревья',
        type: 'лесные земли',
        tier: 9,
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
    #currentComposition = null;
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

    #countLots = 0;
    #countKvartals = 0;

    #forestryResult = {};

    #pathToAssets = 'src/assets';

    #dbFields = [];

    #dbfFile = null;
    #mapFile = null;
    #loggerFile = null;
    #schemaFields = null;
    #tableHeaders = null;

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
        this.#isParseHeader = options.isParseHeader ?? true;

        this.#forestryFile = options.forestryFile;
    }

    parseForestry = async () => {
        // В начале запускаем функцию инициализации исходных данных для дальнейшего использовани при парсинге таксо
        await this.#initParserData();

        // Начинаем парсить данные таксационной карточки
        for (const forestItem of this.#forestryContent) {
            // Проверяем каждую строку на наличие различных сущностей и подсказываем как необходимо парсить текущие данные
            this.#checkForForestryFeature(forestItem);
            //if (forestItem)
            // Распарсиваем содержимое строки таксационной карточки по описаниям лесных пород для текущего выдела
            this.#parseLotContent(forestItem);
        }
        // Записываем полученный после парсинга объект в лог файл
        this.#loggerFile(this.#forestryResult);
    };

    #initParserData = async () => {
        // Создаем или открываем dbf базу для внесения данных таксационной карты
        this.#dbfFile = await this.#openOrCreateDbfFile();
        // Читаем map файл со всеми классификаторами и кодами сущностей для лесничества
        this.#mapFile = await this.#openFileForestry();
        // Если не нужно парсить заголовок таблицы - загружаем его из подготовленного файла
        if (!this.#isParseHeader)
            this.#tableHeaders = this.#readForestryHeader();
        // Создаем логгер парсинга
        this.#loggerFile = this.#writeToLogForestry();

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
    };

    // Функция проверяет тип объекта текущей строки: квартал, выдел, порода, дополнение или статистика
    #checkForForestryFeature = (textContent) => {
        // Проверяем на наличие данных по кварталу
        if (textContent.search(/Квартал /i) > 0) {
            console.log(textContent);
            // Распарсиваем данные урочища, защитной категории леса и новый номер квартала
            this.#parseKvartalContent(textContent);
            //this.#currentFeatureType = featureType.kvartal;
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
                    kvArea: this.#getColumnHeaderValue(textContent, [1], ''),
                };
            this.#currentComposition =
                this.#currentLandType =
                this.#currentLandName =
                    null;
        }
        // Проверяем на наличии дополнений для описания выдела
        else if (
            this.#checkForLotAdditional(
                this.#getColumnHeaderValue(textContent, [2], '', true)
            ).isAdditional
        ) {
            this.#currentFeatureType = featureType.addition;
        }
        // Проверяем на наличие статистики по кварталу
        else if (this.#checkForKvartalSummary(textContent)) {
            this.#currentFeatureType = featureType.summary;
        }

        // Проверем наличие новой категории и/или описания пород леса
        if (
            this.#currentStep == searchStep.stepFeature &&
            this.#currentFeatureType == featureType.main
        ) {
            // Если это не состав пород, тогда это текущая категория леса
            const { isComposition } = this.#checkForCompositition(
                this.#getColumnHeaderValue(textContent, [2], '')
            );

            // Если это породный состав, а также присутствуют ярус и высота яруса, то добавляем его в описание выдела
            if (isComposition) {
                if (
                    Number(this.#getColumnHeaderValue(textContent, [3], '')) >
                        0 &&
                    Number(this.#getColumnHeaderValue(textContent, [4], '')) > 0
                ) {
                    const compositions =
                        this.#forestryResult[this.#currentKvartal].lots[
                            this.#currentLot
                        ].compositions;
                    if (
                        this.#currentComposition !==
                        this.#getColumnHeaderValue(textContent, [2], '')
                    ) {
                        console.log(
                            this.#currentLandName,
                            this.#currentLandType,
                            this.#currentComposition,
                            this.#getColumnHeaderValue(textContent, [2], ''),
                            'Смотрим текущее значение категорий земель'
                        );
                        if (!this.#currentLandName) {
                            this.#currentLandName =
                                'Естественное происхождение';
                            compositions.push({});
                        }
                        this.#currentLandType = 'лесные земли';
                    }

                    const lastComposition =
                        compositions[compositions.length - 1];

                    this.#currentComposition = this.#getColumnHeaderValue(
                        textContent,
                        [2],
                        ''
                    );
                    lastComposition['compositionName'] =
                        this.#currentComposition;
                    lastComposition['landTypeName'] = this.#currentLandName;
                    lastComposition['landType'] = this.#currentLandType;

                    // Зануляем категорию земель, чтобы новые категории давали начало новому описанию сущности леса в выделе
                    this.#currentLandName = null;
                } else {
                    // Если это дополнение к названию состава пород, то добавляем его к последнему copmositionName
                    const compositions =
                        this.#forestryResult[this.#currentKvartal].lots[
                            this.#currentLot
                        ].compositions;
                    const lastComposition =
                        compositions[compositions.length - 1];
                    this.#currentComposition += this.#getColumnHeaderValue(
                        textContent,
                        [2],
                        ''
                    );
                    lastComposition['compositionName'] =
                        this.#currentComposition;
                }
            } else {
                // Проверяем, если в колонке состава выдела есть какое-то наименование сущности, но оно не состав пород, то мы попали на новую категорию земель
                if (this.#getColumnHeaderValue(textContent, [2], '') !== '') {
                    const newLandName = this.#getColumnHeaderValue(
                        textContent,
                        this.#currentLandName ? [2] : ['2 - 22'],
                        ''
                    );
                    // Предполагаем, что повторяться могут только лесные культуры, поэтому, если обнаружено повторение категории состава, то это также лесная культура
                    if (this.#currentLandName) {
                        // Обнаружено дополнение наименования категории лесных земель, добавляем ее в текущее наименование категории
                        const compositions =
                            this.#forestryResult[this.#currentKvartal].lots[
                                this.#currentLot
                            ].compositions;
                        const lastComposition =
                            compositions[compositions.length - 1];
                        this.#currentLandName += this.#getColumnHeaderValue(
                            textContent,
                            [2],
                            ''
                        );
                        lastComposition['landTypeName'] =
                            this.#getColumnHeaderValue(textContent, [2], '');
                    } else {
                        // Если обнаруживаем новое описание нелесных земель, добавляем его в описание категори леса
                        const { landName, landType, landCode } =
                            this.#checkForLandCategory(newLandName);

                        this.#currentLandType = landType;
                        this.#currentLandName = landName;
                        this.#currentComposition = null;
                        const compositions =
                            this.#forestryResult[this.#currentKvartal].lots[
                                this.#currentLot
                            ].compositions;
                        compositions.push({});
                        const lastComposition =
                            compositions[compositions.length - 1];
                        lastComposition['landTypeName'] = this.#currentLandName;
                        lastComposition['landType'] = this.#currentLandType;
                    }
                }
            }
        }
    };

    #parseLotContent = (textContent) => {
        // Проверем, не попали ли мы в заголовок таблицы и если да, то пропускаем парсинг
        if (this.#checkForTableHeader(textContent)) return;

        if (this.#currentStep == searchStep.stepFeature) {
            switch (this.#currentFeatureType) {
                case featureType.addition:
                    if (textContent.trim() == '') return;
                    const { isAdditional, name, value } =
                        this.#checkForLotAdditional(textContent);
                    console.log(name, value, 'Текущее дополнение');
                    const lotAdditions =
                        this.#forestryResult[this.#currentKvartal].lots[
                            this.#currentLot
                        ].additions;
                    if (isAdditional) {
                        lotAdditions.push({ name, value });
                    } else {
                        // Если это не целое дополнение, то добавляем его в значение параметра дополнения предыдущей итерации
                        if (lotAdditions.length > 0) {
                            const lastAddition =
                                lotAdditions[lotAdditions.length - 1];
                            if (lastAddition.value)
                                lastAddition.value += ' ' + textContent.trim();
                        }
                    }
                    break;
                case featureType.main:
                    // Если мы на этапе парсинга пород в выделе, то проверяем, находимся ли мы на главной строке
                    // Если мы на главной строке выдела, то парсим общие сведения для всего выдела и затем записываем сведения индивидуально по каждой породе
                    const compositions =
                        this.#forestryResult[this.#currentKvartal].lots[
                            this.#currentLot
                        ].compositions;
                    const currentComposition =
                        compositions[compositions.length - 1];
                    if (
                        Number(
                            this.#getColumnHeaderValue(textContent, [3], '') > 0
                        ) &&
                        Number(
                            this.#getColumnHeaderValue(textContent, [4], '')
                        ) > 0
                    ) {
                        // Мы на строке с превалирующей породой
                        currentComposition['forestLayer'] = Number(
                            this.#getColumnHeaderValue(textContent, [3], '')
                        );
                        currentComposition['forestLayerHeight'] = Number(
                            this.#getColumnHeaderValue(textContent, [4], '')
                        );
                        currentComposition['forestAgeClass'] = Number(
                            this.#getColumnHeaderValue(textContent, [9], '')
                        );
                        currentComposition['forestAgeGroup'] = Number(
                            this.#getColumnHeaderValue(textContent, [10], '')
                        );
                        currentComposition['forestBonitet'] = Number(
                            this.#getColumnHeaderValue(textContent, [11], '')
                        );
                        currentComposition['forsestFullNess'] =
                            this.#getColumnHeaderValue(textContent, [13], '');
                        currentComposition['forsestReserve'] =
                            Number(
                                this.#getColumnHeaderValue(
                                    textContent,
                                    [14],
                                    ''
                                )
                            ) ?? 0;
                        currentComposition['forsestLotReserve'] =
                            Number(
                                this.#getColumnHeaderValue(
                                    textContent,
                                    [15],
                                    ''
                                )
                            ) ?? 0;

                        currentComposition['forsestLotStock'] =
                            this.#getColumnHeaderValue(textContent, [18], '');
                        currentComposition['forsestLotStockRedin'] =
                            this.#getColumnHeaderValue(textContent, [19], '');
                        currentComposition['forsestLotStockSingle'] =
                            this.#getColumnHeaderValue(textContent, [20], '');
                        currentComposition['forsestLotClutter'] =
                            this.#getColumnHeaderValue(textContent, [21], '');
                        currentComposition['forsestLotDrop'] =
                            this.#getColumnHeaderValue(textContent, [22], '');

                        this.#addSingleCompositToLot(textContent);
                        // Для добавления индивидуальной породы проверяем, чтобы в выделе уже было описание состава пород
                    } else if (currentComposition['compositionName']) {
                        this.#addSingleCompositToLot(textContent);
                    }
                    break;
            }
        }
    };

    #checkForTableHeader = (textContent) => {
        if (
            textContent.split(':').length > 10 ||
            textContent.split('-').length > 10 ||
            textContent.trim() == '' ||
            textContent.search(/Квартал /i) > 0
        )
            return true;
        return false;
    };

    #checkForLandCategory = (landCategory) => {
        const result = {
            landName: 'Естественное происхождение',
            landType: 'лесные земли',
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
                // console.log(
                //     this.#mapFile['landType'][landTypeIndex],
                //     'Get LandType data from MAP'
                // );
                result['landName'] = landCategory;
                result['landType'] =
                    this.#mapFile['landType'][landTypeIndex][3].trim();
                result['landCode'] =
                    this.#mapFile['landType'][landTypeIndex][4] ?? '0';
            } else {
                // Если не нашли категорию в map файле пробуем найти ее в доп материалах к программе
                const landAdditionalIndex = lotAdditionalLandType.findIndex(
                    (item) => {
                        return item.value.search(landCategory) == 0;
                    }
                );
                if (landAdditionalIndex > -1) {
                    result['landName'] = landCategory;
                    result['landType'] =
                        lotAdditionalLandType[landAdditionalIndex].type;
                    result['landTier'] =
                        lotAdditionalLandType[landAdditionalIndex].tier;
                    result['landCode'] =
                        lotAdditionalLandType[landAdditionalIndex].code;
                } else {
                    result['landType'] = 'нелесные земли';
                    result['landCode'] = '-1';
                    console.log(
                        `Не удалось распарсить категорию земель ${landCategory} для выдела ${
                            this.#currentLot
                        } в квартале ${this.#currentKvartal}`
                    );
                }
            }
        }
        return result;
    };

    // Проверяем текущую строку на наличие дополнения в выделе
    #checkForLotAdditional = (textContent) => {
        let isAdditional = false;
        let name = '';
        let value = '';

        if (
            this.#currentStep == searchStep.stepFeature &&
            (this.#currentFeatureType == featureType.main ||
                this.#currentFeatureType == featureType.addition)
        ) {
            isAdditional =
                (textContent.indexOf(':') > -1 &&
                    textContent.split(':').length == 2) ||
                lotAdditionalData.findIndex((lotValue) => {
                    if (textContent.trim().search(lotValue) == 0) {
                        name = lotValue.trim();
                        value = textContent.replace(lotValue, '').trim();
                        console.log(name, value, 'Additional data');
                    }
                    return textContent.trim().search(lotValue) == 0;
                }) > -1;
            if (
                textContent.indexOf(':') > -1 &&
                textContent.split(':').length == 2
            ) {
                name = textContent.split(':')[0].trim();
                value = textContent.split(':')[1].trim();
            }
        }
        return { isAdditional, name, value };
    };

    // Проверяем текущую строку на наличие статистики по выделу
    #checkForKvartalSummary = (textContent) => {
        return (
            textContent.search(/Итого по категории/gi) > -1 ||
            textContent.search(/Итого по кварталу/gi) > -1
        );
    };

    // Функция проверки текущей лесной культуры на наличие породного состава и возвращение коэффициента породы
    #checkForCompositition = (composition, koeffIndex = 0) => {
        const composeMask = new RegExp(/[\d|\+|,]+[^\d\+,]+/g);
        let isComposition = false;
        let koeff = '';
        if (
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
        }
        return { isComposition, koeff };
    };

    // Функция для добавления описания единичной породы в текущий состав пород для текущего выдела
    #addSingleCompositToLot = (textContent) => {
        const compositions =
            this.#forestryResult[this.#currentKvartal].lots[this.#currentLot]
                .compositions;
        const currentComposition = compositions[compositions.length - 1];

        if (!currentComposition['forestTlu']) {
            currentComposition['forestTlu'] = [
                this.#getColumnHeaderValue(textContent, [12], ''),
            ];
        } else if (this.#getColumnHeaderValue(textContent, [12], '')) {
            currentComposition['forestTlu'].push(
                this.#getColumnHeaderValue(textContent, [12], '')
            );
        }

        if (this.#getColumnHeaderValue(textContent, [23], '')) {
            if (!currentComposition['forestActivities']) {
                currentComposition['forestActivities'] = [
                    this.#getColumnHeaderValue(textContent, [23], ''),
                ];
            } else
                currentComposition['forestActivities'].push(
                    this.#getColumnHeaderValue(textContent, [23], '')
                );
        }

        if (!currentComposition['detailes'])
            currentComposition['detailes'] = [];
        const compositionIndex = currentComposition['detailes'].length;
        currentComposition['detailes'].push({
            singleName: this.#getColumnHeaderValue(textContent, [5], ''),
            tier: this.#checkForLandCategory(currentComposition['landTypeName'])
                .tier,
            koeff: this.#checkForCompositition(
                currentComposition['compositionName'],
                compositionIndex
            ).koeff,
            age: Number(this.#getColumnHeaderValue(textContent, [6], '')) ?? 0,
            height:
                Number(this.#getColumnHeaderValue(textContent, [7], '')) ?? 0,
            diameter:
                Number(this.#getColumnHeaderValue(textContent, [8], '')) ?? 0,
            stock: this.#getColumnHeaderValue(textContent, [16], ''),
            commodity: this.#getColumnHeaderValue(textContent, [17], ''),
        });
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

        if (textContent.search(/Категория защ/i) > -1) {
            if (textContent.search(/Категория защ/i) > 1) {
                this.#currentForestryTract = textContent
                    .slice(0, textContent.search(/Категория защ/i) - 1)
                    .trim();
            }
            indexProtect = textContent.indexOf(
                ' ',
                textContent.search(/Категория защ/i) + 13
            );
            textContent = textContent.slice(indexProtect).trim();
            this.#currentProtectZone = textContent
                .slice(0, textContent.search(/Квартал /i) - 1)
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
                    forestryTract: this.#forestryFile.split('.')[0], //this.#currentForestryTract,
                    forestryProtect: this.#currentProtectZone,
                };
                this.#countKvartals++;
                this.#countLots = 0;

                this.#currentStep = searchStep.stepKvartal;
            }
        }

        console.log(
            `Найдены новые элементы леса: урочище <${
                this.#currentForestryTract
            }>; категория защитности <${this.#currentProtectZone}>; квартал - ${
                this.#currentKvartal
            }`
        );
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
                            : textItem
                                  .slice(
                                      this.#tableHeaders[index].start,
                                      this.#tableHeaders[index].end + 1
                                  )
                                  .trim()) +
                        splitSymbol
                    );
                } else {
                    for (
                        let i = Number(index.split('-')[0]);
                        i <= Number(index.split('-')[1]);
                        i++
                    ) {
                        accumulator =
                            accumulator +
                            this.#getColumnHeaderValue(textItem, [i]) +
                            splitSymbol;
                    }
                    return accumulator;
                }
            }, '');
        }
    };

    // Функция логирования шагов парсинга
    #writeToLogForestry = () => {
        if (
            fs.existsSync(
                path.resolve(
                    rootPath,
                    this.#toPath,
                    `${this.#forestryMain}/logger.json`
                )
            )
        ) {
            fs.unlink(
                path.resolve(
                    rootPath,
                    this.#toPath,
                    `${this.#forestryMain}/logger.json`
                ),
                (err) => {
                    if (err) {
                        console.error('Delete logger file ERROR:', err);
                    }
                    console.log('Logger file success deleted');
                }
            );
        }
        return (textContent) => {
            try {
                fs.writeFileSync(
                    path.resolve(
                        rootPath,
                        this.#toPath,
                        `${this.#forestryMain}/logger.json`
                    ),
                    JSON.stringify(textContent)
                );
            } catch (err) {
                console.error('Delete logger file ERROR:', err);
            }
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
                }> по причине:\n ${err.message ?? '500 error on server'}`
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
