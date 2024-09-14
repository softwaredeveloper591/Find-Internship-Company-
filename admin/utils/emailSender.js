const amqp = require('amqplib/callback_api');
const { MSG_QUEUE_URL } = require("../config");

exports.sendEmail = (to, subject, body) => {
    amqp.connect(MSG_QUEUE_URL, (err, connection) => {
        if (err) throw err;
        connection.createChannel((err, channel) => {
            if (err) throw err;

            const msg = JSON.stringify({ to, subject, body });
            channel.assertQueue('email_queue', { durable: true });
            channel.sendToQueue('email_queue', Buffer.from(msg), { persistent: true });

            console.log(`Email sent to ${to}`);
        });
        setTimeout(() => connection.close(), 500);
    });
};
