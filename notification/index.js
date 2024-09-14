const amqp = require('amqplib/callback_api');
const nodeMailer = require('nodemailer');
require("dotenv").config();

amqp.connect(process.env.MSG_QUEUE_URL, (err, connection) => {
    if (err) throw err;

    connection.createChannel((err, channel) => {
        if (err) throw err;

        const queue = 'email_queue';

        channel.assertQueue(queue, { durable: true });
        channel.prefetch(1);

        console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", queue);

        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                const emailData = JSON.parse(msg.content.toString());

                const transporter = nodeMailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'enesbilalbabaturalpro06@gmail.com',
                        pass: process.env.EMAIL_PASS
                    }
                });

                try {
                    await transporter.sendMail({
                        from: '"Buket Erşahin" <enesbilalbabaturalpro06@gmail.com>',
                        to: emailData.to,
                        subject: emailData.subject,
                        html: emailData.body
                    });

                    console.log(" [x] Sent %s", emailData.to);

                    // Acknowledge message as processed
                    channel.ack(msg);
                } catch (error) {
                    console.error("Error sending email:", error);
                    // Optionally, requeue the message for another attempt
                    channel.nack(msg);
                }
            }
        });
    });
});