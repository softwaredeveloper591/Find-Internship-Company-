const { PORT } = require('./config');
const app = require('./app');
const { connectRabbitMQ } = require('./rabbitmq');

async function start() {
  try {
    // Connect to RabbitMQ
    await connectRabbitMQ();

    console.log('user-srv is running...');
  } catch (error) {
    console.error('Failed to start user-srv:', error);
  }
}

start();

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