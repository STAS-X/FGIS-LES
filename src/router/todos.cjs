const Router = require('express');
const router = new Router();

let { genUniqId } = require('../lib/helpers/helpers.cjs');

// Добавляем новую задачу в список и отправляем
// состояние всем клиентам
router.post('/add-task', (req, res) => {
	const addedText = req.body.text;
	global.todoState = [{ id: genUniqId(), text: addedText, checked: false }, ...todoState];
	console.log(global.todoState, 'list todos');
	res.json(null);
	sendToAllUsers();
});

// Изменяем состояние выполнения задачи в списке
// и отправляем результат всем клиентам
router.post('/check-task', (req, res) => {
	const id = req.body.id;
	const checked = req.body.checked;
	global.todoState = global.todoState.map((item) => {
		if (item.id === id) {
			return { ...item, checked };
		} else {
			return item;
		}
	});
	res.json(null);
	sendToAllUsers();
});

// Удаляем задачу из списка и отправляем новое
// состояние списка всем клиентам
router.post('/del-task', (req, res) => {
	const id = req.body.id;
	global.todoState = global.todoState.filter((item) => {
		return item.id !== id;
	});
	res.json(null);
	sendToAllUsers();
});

// Выдаем пользователю список задач по запросу
router.get('/state', (req, res) => {
	console.log(global.todoState, 'list todos by state');
	res.json(global.todoState);
});

const sendToAllUsers = () => {
	for (let i = 0; i < global.clients.length; i++) {
		global.clients[i].res.write(`data: ${JSON.stringify(global.todoState)}\n\n`);
		global.clients[i].res.flush();
	}
};

module.exports = { router };
