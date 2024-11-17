const Router = require('express');
const router = new Router();

// const batchRead = async () => {
// 	let dbf = await DBFFile.open(path.resolve(__dirname, '../assets/test.dbf'), { encoding: 'UTF-8' });
// 	console.log(`DBF file contains ${dbf.recordCount} records.`);
// 	console.log(`Field names: ${dbf.fields.map((f) => f.name).join(', ')}`);
// 	let records = await dbf.readRecords(10); // batch-reads up to 100 records, returned as an array
// 	for (let record of records) console.log(record, 'Current record of DBF FILE');
// };
const fs = require('fs');
const path = require('path');

let schemaData = '';

const { ForestParser } = require('../lib/reader/forestParser.cjs');
const {
    tryParseForestryData,
} = require('../lib/reader/forestryParserFunc.cjs');
const { getAllFilesFromFolder } = require('../lib/helpers/helpers.cjs');

const anyReader = require('../lib/reader/anytext.cjs').reader;

// const allForestrys = [
//     'Вичугское',
//     'Заволжское',
//     'Ивановское',
//     'Ильинское',
//     'Кинешемское',
//     'Пучежское',
//     'Тейковское',
//     'Фурмановское',
//     'ШУЙСКОЕ',
//     'ЮЖСКОЕ',
// ];

const allForestrys = ['Заволжское'];

const parserOptions = {
    forestryMain: '',
    forestryDistrict: '',
    forestryTract: '',
    forestryRegion: 'Ивановская область',
    forestryFile: '',
    coordSystem: 'msk37Zona1',
    taxerCompany: 'ООО «Лесопроектное бюро»',
    taxerExpedition: 1,
    charset: '866',
    isParseHeader: true,
    isParseTitul: true,
};

router.get('/parse', async (req, res) => {
    const { DBFFile } = require('dbffile');
    const parser = await new ForestParser(parserOptions)();
    //await batchRead();
    //console.log(anyReader);
    // anyReader.getText(path.resolve(__dirname, '../assets/TO_Воронское.docx')).then(function (data) {
    // 	tryParseForestryData(data);
    // });

    anyReader
        .getText(path.resolve(__dirname, '../assets/схема_бд.xlsx'))
        .then(async (data) => {
            //tryParseForestryData(parserOptions);
            let schemaData =
                '<table><caption><h3>Таблица схемы БД</h3></caption>';
            const dbFields = [];
            const dbRecords = [];

            const currentSchema = JSON.parse(data)['schema'];
            for (let i = 0; i < currentSchema.length; i++) {
                schemaData += '<tr>';
                if (i > 0 && currentSchema[i][1] && currentSchema[i][2]) {
                    const name = currentSchema[i][1].trim();
                    switch (currentSchema[i][2].split(' ')[0]) {
                        case 'Char': {
                            const size = Number(
                                currentSchema[i][2].split(' ')[1].slice(1, -1)
                            );
                            dbFields.push({ name, type: 'C', size });
                            break;
                        }
                        case 'Decimal': {
                            const size = Number(
                                currentSchema[i][2]
                                    .split(' ')[1]
                                    .slice(1, -1)
                                    .split(',')[0]
                            );
                            const decimalPlaces = Number(
                                currentSchema[i][2]
                                    .split(' ')[1]
                                    .slice(1, -1)
                                    .split(',')[1]
                            );
                            dbFields.push({
                                name,
                                type: 'N',
                                size,
                                decimalPlaces,
                            });
                        }
                    }
                }

                for (let j = 0; j < currentSchema[i].length; j++) {
                    if (i == 0) {
                        schemaData += `<th>${
                            currentSchema[i][j] ?? 'Empty'
                        }</th>`;
                    } else {
                        schemaData += `<td>${
                            currentSchema[i][j] ?? 'no data'
                        }</td>`;
                    }
                }
                schemaData += '</tr>';
            }
            //const dbf = await openOrCreateDbfFile(dbFields);

            dbRecords.push({
                MUK: 1120,
                SRI: 10,
                MU: 20,
                GIR: 30,
                MK: 123400,
                UD: 50,
                KV: 1000,
            });
            dbRecords.push({
                MUK: 1121,
                SRI: 11,
                MU: 21,
                GIR: 31,
                MK: 123410,
                UD: 60,
                KV: 1050,
            });
            dbRecords.push({
                MUK: 1122,
                SRI: 12,
                MU: 22,
                GIR: 32,
                MK: 123420,
                UD: 70,
                KV: 1080,
            });
            dbRecords.push({
                MUK: 1123,
                SRI: 13,
                MU: 23,
                GIR: 33,
                MK: 123430,
                UD: 80,
                KV: 1120,
            });
            dbRecords.push({
                MUK: 1124,
                SRI: 14,
                MU: 24,
                GIR: 34,
                MK: 123440,
                UD: 90,
                KV: 1210,
            });

            //await dbf.appendRecords(dbRecords);
            //console.log(`${dbRecords.length} records added.`);
            schemaData += '</table>';
            //res.set({ 'content-type': 'text/html; charset=utf-8' })
            res.end(`<h1>Parser taksoCards!</h1>${schemaData}`);

            // Запускаем процедуру парсинга таксационных описаний последовательно по всей папке
            if (!parserOptions.forestryFile) {
                allForestrys.forEach(async (forestryMain) => {
                    const fileList = getAllFilesFromFolder(
                        path.resolve(__dirname, '../assets', forestryMain)
                    );
                    await parser.setForestryMain(forestryMain);
                    for (const fName of fileList) {
                        parser.forestryFile = fName;
                        //parser.foresteryHeader = null;
                        await parser.parseForestry();
                        //break;
                    }
                });
            } else {
                allForestrys.forEach(async (forestryMain) => {
                    await parser.setForestryMain(forestryMain);
                    parser.forestryFile = parserOptions.forestryFile;
                    //parser.foresteryHeader = null;
                    await parser.parseForestry();
                });
            }
        });
});

router.get('/transform', async (req, res) => {
    //const parser = await new ForestParser(parserOptions)();
    // Запускаем процедуру парсинга таксационных описаний последовательно по всей папке
    const fileList = getAllFilesFromFolder(
        path.resolve(__dirname, '../assets', parserOptions.forestryMain),
        { mask: '.pdf' }
    );
    console.log(fileList, 'Найдены файлы в дириктории');
    res.end(`<h1>Transform taksoCards to txt file!</h1>${schemaData}`);

    for (const fName of fileList) {
        //parser.forestryFile = fName;
        //await parser.parseForestry();
        //break;
        // console.log(fName, 'Найден новый файл');
        await anyReader
            .getText(
                path.resolve(
                    __dirname,
                    '../assets',
                    parserOptions.forestryMain,
                    fName
                ),
                { isTransform: true }
            )
            .then((data) => {
                fs.writeFileSync(
                    path.resolve(
                        __dirname,
                        '../assets',
                        parserOptions.forestryMain,
                        `${path.parse(fName).name}.txt`
                    ),
                    data
                );
                console.log(`Файл ${fName} переформатирован!`);
            });
    }
});

module.exports = { router };
