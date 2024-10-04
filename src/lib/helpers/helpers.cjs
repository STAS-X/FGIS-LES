
const genUniqId = () => {
	return Date.now() + '-' + Math.floor(Math.random() * 1000000000);
};

module.exports = { genUniqId };
