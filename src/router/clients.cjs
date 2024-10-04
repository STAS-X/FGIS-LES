const Router = require('express');
const router = new Router();

router.get('/clients', (req, res) => {
	res.json(global.clients.map((client) => client.id));
});

module.exports = { router };
