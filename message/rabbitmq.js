const amqp = require('amqplib');

let connection, channel;

async function connectRabbitMQ() {
  try {
    // Connect to RabbitMQ
    connection = await amqp.connect('amqp://admin:adminpass@rabbitmq-srv');
    channel = await connection.createChannel();

    console.log('Connected to RabbitMQ');

    const exchange = 'user-events';
    await channel.assertExchange(exchange, 'topic', { durable: true });

    // Declare and bind queues (only once)
    const queues = [
      { name: 'student.created', routingKey: 'student.created' },
      { name: 'company.created', routingKey: 'company.created' },
      { name: 'student.updated', routingKey: 'student.updated' },
      { name: 'company.updated', routingKey: 'company.updated' },
      { name: 'admin.updated', routingKey: 'admin.updated' },
      { name: 'secretary.updated', routingKey: 'secretary.updated' },
    ];

    for (const { name, routingKey } of queues) {
      await channel.assertQueue(name, { durable: true });
      await channel.bindQueue(name, exchange, routingKey);
      console.log(`Queue "${name}" is bound to exchange "${exchange}" with routing key "${routingKey}"`);
    }

    return channel;
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    throw error;
  }
}

async function consumeEvent(queue, callback) {
  try {
    if (!channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    // Consume messages from the queue
    channel.consume(queue, (msg) => {
      if (msg !== null) {
        const messageContent = JSON.parse(msg.content.toString());
        console.log(`Event received from queue "${queue}":`, messageContent);

        // Process the message
        callback(messageContent);

        // Acknowledge the message
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error('Failed to consume event:', error);
  }
}

module.exports = { connectRabbitMQ, consumeEvent };