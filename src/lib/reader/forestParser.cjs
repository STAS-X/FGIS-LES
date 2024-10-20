import { throws } from 'assert';

const anyReader = require('any-text');
const { DBFFile } = require('dbffile');

const fs = require('fs');
const path = require('path');

const searchStep = {
    stepKvartal: 'KVARTAL',
    stepFeature: 'FEATURE',
};

const featureType = {
    main: 'MAIN_FEATURE',
    sub: 'SUB_FEATURE',
    addition: 'ADDITION_FEATURE',
    summary: 'SUMMARY',
    header: 'HEADER',
};

class ForestParser {
    #isParseHeader = false;

    #currentKvartal = null;
    #currentLot = null;
    #currentComposition = null;
    #currentDetailed = null;
    #currentProtectZone = null;

    #forestryMain = null;
    #forestryDistrict = null;
    #forestryTract = null;
    #forestryRegion = null;
    #forestryCS = null;
    #taxerCompany = null;
    #taxerExpedition = null;

    #pathToAssets = 'src/assets';

    #dbFields = [];

    #dbfFile = null;
    #mapFile = null;
    #schemaFields = null;
    #tableHeaders = null;

    #toPath = 'src/assets';

    #charset = 'UTF-8';

    constructor(options = {}) {
        super();

        this.#forestryMain = options.forestryMain;
        this.#forestryDistrict = options.forestryDistrict;
        this.#forestryTract = options.forestryTract;
        this.#forestryRegion = options.forestryRegion;
        this.#forestryCS = options.forestryCS;
        this.#taxerCompany = options.taxerCompany;
        this.#taxerExpedition = options.taxerExpedition;
        this.#isParseHeader = options.isParseHeader ?? true;
    }

    parseForestry = async () => {
        // В начале запускаем функцию инициализации исходных данных для дальнейшего использовани при парсинге таксо
        await this.#initParserData();
    };

    #initParserData = async () => {
        // Создаем или открываем dbf базу для внесения данных таксационной карты
        this.#dbfFile = await this.#openOrCreateDbfFile();
        // Читаем map файл со всеми классификаторами и кодами сущностей для лесничества
        this.#mapFile = await this.#openMapForestry();
        // Если не нужно парсить заголовок таблицы - загружаем его из подготовленного файла
        if (!this.#isParseHeader)
            this.#tableHeaders = this.#readForestryHeader();
    };

    // Функция чтения заголовка таблицы таксационной карты из файла
    #readForestryHeader = () => {
        try {
            const jsonString = fs.readFileSync(
                path.resolve(rootPath, this.#toPath, 'schema/fHeader.json')
            );
            const header = JSON.parse(jsonString);
            return header;
        } catch (err) {
            console.log('Header forestry file read failed:', err);
            return [];
        }
    };

    // Читаем map файл с классификатором исходных данных для лесничества
    #openMapForestry = async () => {
        try {
            return JSON.parse(
                await anyReader.getText(
                    path.resolve(
                        rootPath,
                        this.#toPath,
                        `${this.#forestryMain}/map.xlsx`
                    )
                )
            );
        } catch (err) {
            throw new Error(
                `Не удалось прочитать map файл для лесничества <${
                    this.#forestryMain
                }> по причине:\n ${err.message ?? '500 error on server'}`
            );
        }
    };

    // Функция инициализации схемы полей в таблице выходнй БД
    #readFieldsDescription = async () => {
        const shemaDB = JSON.parse(
            await anyReader.getText(
                path.resolve(rootPath, this.#toPath, `schema/db_schema.xlsx`)
            )
        )['schema'];

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
    };

    // Функция инициализации БД для главного лесничества в формате dbf
    #openOrCreateDbfFile = async () => {
        try {
            return await DBFFile.open(
                path.resolve(
                    rootPath,
                    this.#toPath,
                    `${this.#forestryMain}/${this.#forestryMain}.dbf`
                ),
                { encoding: this.#charset }
            );
        } catch (e) {
            await readFieldsDescription();
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
