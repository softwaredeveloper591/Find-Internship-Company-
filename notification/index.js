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
		                user: 'automatedinternshipsystem@gmail.com',
		                pass: process.env.EMAIL_PASS
		            }
		        });
			
		        const mailOptions = {
		            from: '"Automated Internship System" <automatedinternshipsystem@gmail.com>',
		            to: emailData.to,
		            subject: emailData.subject,
		            html: emailData.body,
		        };
			
		        // Only include attachments if present
		        if (emailData.attachment) {
		            mailOptions.attachments = [{
		                filename: emailData.attachment.filename,
		                content: Buffer.from(emailData.attachment.content.data), // or emailData.attachment.content if already a Buffer
		            }];
		        }
			
		        try {
		            await transporter.sendMail(mailOptions);
		            console.log(" [x] Sent %s", emailData.to);
		            channel.ack(msg);
		        } catch (error) {
		            console.error("Error sending email:", error);
		            channel.nack(msg); // optionally requeue
		        }
		    }
		});
    });
});