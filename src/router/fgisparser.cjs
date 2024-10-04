const Router = require('express');
const router = new Router();

// const { DBFFile } = require('dbffile');

// const batchRead = async () => {
// 	let dbf = await DBFFile.open(path.resolve(__dirname, '../assets/test.dbf'), { encoding: 'UTF-8' });
// 	console.log(`DBF file contains ${dbf.recordCount} records.`);
// 	console.log(`Field names: ${dbf.fields.map((f) => f.name).join(', ')}`);
// 	let records = await dbf.readRecords(10); // batch-reads up to 100 records, returned as an array
// 	for (let record of records) console.log(record, 'Current record of DBF FILE');
// };

const path = require('path');
const { tryParseForestryData } = require('../lib/reader/forestryParserFunc.cjs');

const anyReader = require('../lib/reader/anytext.cjs').reader;

router.get('/parse', async (req, res) => {
	//await batchRead();
	//console.log(anyReader);
	anyReader.getText(path.resolve(__dirname, '../assets/TO_Воронское.docx')).then(function (data) {
		tryParseForestryData(data);
	});
	//console.log(global.forestryTitleMasks);
	res.end('<h1>Hello World!</h1>');
});

module.exports = { router };
