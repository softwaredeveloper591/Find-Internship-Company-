const amqp = require('amqplib');

let connection, channel;

async function connectRabbitMQ() {
  try {
    // Connect to RabbitMQ
    connection = await amqp.connect('amqp://admin:adminpass@rabbitmq-srv');
    channel = await connection.createChannel();

    console.log('Connected to RabbitMQ');

    return channel;
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    throw error;
  }
}

async function publishEvent(exchange, routingKey, message) {
  try {
    if (!channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    // Ensure the exchange exists
    await channel.assertExchange(exchange, 'topic', { durable: true });

    // Publish the message
    channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)));
    console.log(`Event published: ${routingKey}`, message);
  } catch (error) {
    console.error('Failed to publish event:', error);
  }
}

module.exports = { connectRabbitMQ, publishEvent };