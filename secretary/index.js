const { PORT } = require('./config');
const app = require('./app');

app.listen(PORT, () => {
		console.log(`app is listening on port ${PORT}`);
	}
)
.on('error', (error) => {
	console.log(error);
	process.exit();
})
.on('close', () => {
	channel.close();
});