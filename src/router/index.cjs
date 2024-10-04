const eventsRouter = require('./events.cjs').router;
const clientsRouter = require('./clients.cjs').router;
const todosRouter = require('./todos.cjs').router;
const fgisRouter = require('./fgisparser.cjs').router;

const Router = require('express');
const router = new Router();

router.use('/', clientsRouter);
router.use('/', eventsRouter);
router.use('/', todosRouter);
router.use('/', fgisRouter);

module.exports = { router };
