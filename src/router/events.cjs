const Router = require('express');
const router = new Router();

let { genUniqId } = require('../lib/helpers/helpers.cjs');

router.get('/events', (req, res) => {
	console.log('test events');
	const headers = {
		// Тип соединения 'text/event-stream' необходим для SSE
		'Content-Type': 'text/event-stream',
		'Access-Control-Allow-Origin': '*',
		// Отставляем соединение открытым 'keep-alive'
		Connection: 'keep-alive',
		'Cache-Control': 'no-cache',
	};
	// Записываем в заголовок статус успешного ответа 200
	res.writeHead(200, headers);

	/*
    Формирование данных:
    Когда EventSource получает множество последовательных
    строк, начинающихся с data: они объединяются, вставляя
    символ новой строки между ними. Завершающие символы
    новой строки удаляются.
    Двойные символы конца строки \n\n обозначают конец
    события.
    */
	console.log(JSON.stringify(global.todoState), 'list of todos');
	const sendData = `data: ${JSON.stringify(global.todoState)}\n\n`;

	res.write(sendData);
	// Если используется compression middleware, то необходимо
	// добавить res.flush() для отправки данных пользователю
	res.flush();

	// Создаём уникальный идентификатор клиента
	const clientId = genUniqId();
	const newClient = {
		id: clientId,
		res,
	};

	clients.push(newClient);

	console.log(`${clientId} - Connection opened`);

	req.on('close', () => {
		console.log(`${clientId} - Connection closed`);
		global.clients = global.clients.filter((client) => client.id !== clientId);
	});
});

module.exports = { router };
