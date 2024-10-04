import express from 'express';
import compression from 'compression';
import bodyParser from 'body-parser';
import cors from 'cors';

import { forestryTitleMasks } from './src/lib/reader/forestryParserFunc.cjs';

import { router as addRouters } from './src/router/index.cjs';

let clients = [];
let todoState = [];

let forestryData = {
	examination: '',
	examinationYear: 2001,
	forestryMain: '',
	forestryDistrict: '',
	kvartalRange: [],
	partyChief: '',
	partyIngineer: '',
	kvartalFeatures: {},
};

// Устанавливаем глобальные переменные для обмена данными в проекте
global.clients = clients;
global.todoState = todoState;
global.forestryData = forestryData;
global.forestryTitleMasks = forestryTitleMasks;

const app = express();
app.use(compression());
app.use(cors());
app.use(bodyParser.json());

app.use('/', addRouters);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
	console.log(`Shared todo list server listening at http://localhost:${PORT}`);
});
