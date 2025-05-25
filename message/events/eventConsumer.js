const { connectRabbitMQ, consumeEvent } = require('../rabbitmq');
const db = require('../data/db'); // Import your database models

async function startEventConsumers() {
  try {
    // Connect to RabbitMQ
    await connectRabbitMQ();

    // Consume `student.created` events
    consumeEvent('student.created', async (message) => {
      // Save the student to the database
      try {
        await db.Student.create({
          id: message.id,
          username: message.username,
          email: message.email,
        });
        console.log('Student saved to database:', message);
      } catch (error) {
        console.error('Failed to save student to database:', error);
      }
    });

    // Consume `company.created` events
    consumeEvent('company.created', async (message) => {
      console.log('Processing company.created event:', message);

      // Save the company to the database
      try {
        await db.Company.create({
          id: message.id,
          username: message.username,
          email: message.email,
        });
        console.log('Company saved to database:', message);
      } catch (error) {
        console.error('Failed to save company to database:', error);
      }
    });

    // Add more consumers for other events (e.g., `student.updated`, `admin.updated`, etc.)
  } catch (error) {
    console.error('Failed to start event consumers:', error);
  }
}

module.exports = startEventConsumers;