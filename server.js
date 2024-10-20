import express from 'express';
import compression from 'compression';
import bodyParser from 'body-parser';
import cors from 'cors';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

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

global.rootPath = dirname(fileURLToPath(import.meta.url));

console.log(global.rootPath, 'Root path');

const app = express();
app.use(compression());
app.use(cors());
app.use(bodyParser.json());
app.use((req, res, next) => {
    //res.setHeader('charset','UTF-8');
    res.set({ 'content-type': 'text/html; charset=utf-8' });
    next();
});

app.use('/', addRouters);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(
        `Shared todo list server listening at http://localhost:${PORT}`
    );
});
