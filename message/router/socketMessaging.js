const { Server } = require("socket.io");
const db = require("../data/db"); // Adjust the path to your database file
const jwt=require("jsonwebtoken");
const { APP_SECRET } = require("../config");

findUserByIdandType = async (userId, userType) => {
    let user = null;
    // Check the userType and find the user accordingly
    if(userType == "student") {
         user = await db.Student.findOne({ where: { id: userId }, attributes: { exclude: ['password'] } });
    }
    else if(userType == "company") {
         user = await db.Company.findOne({ where: { id: userId }, attributes: { exclude: ['password'] } });
    }
    else if(userType == "admin") {
         user = await db.Admin.findOne({ where: { id: userId }, attributes: { exclude: ['password'] } });
    }
    else if(userType == "secretary") {
         user = await db.Secretary.findOne({ where: { id: userId }, attributes: { exclude: ['password'] } });
    }
    // If userType is not recognized, return null or throw an error
    return user; 
}

async function findReceiverByEmail(email) {
    let receiver = null;
    const mail = email;
    const parts = mail.split("@");
    const domain = parts[1];

    if (email === "buketoksuzoglu@iyte.edu.tr") {
        receiver = await db.Admin.findOne({ where: { email }, attributes: { exclude: ['password'] } });
    }
    else if (domain === "iyte.edu.tr") {
        receiver = await db.Secretary.findOne({ where: { email }, attributes: { exclude: ['password'] } });
    }
    else if (domain === "std.iyte.edu.tr") {
        receiver = await db.Student.findOne({ where: { email }, attributes: { exclude: ['password'] } });
    }
    else {
        receiver = await db.Company.findOne({ where: { email }, attributes: { exclude: ['password'] } });
    }
    return receiver;
}

function initializeSocketServer(server) {  
    const io = new Server(server);

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        
        if (!token) {
            return next(new Error("Authentication error"));
        }
        // Verify token and attach user to socket
        jwt.verify(token, APP_SECRET, (err, user) => {
            if (err) {
                return next(new Error("Authentication error"));
              }
        
              // Check the userType attribute of the JWT payload
              if (user.userType != "student" && user.userType != "company" && user.userType != "admin" && user.userType != "secretary") {
                // If the userType is not one of the allowed types, return an error
                return next(new Error("Authentication error"));
              }
              socket.user = user;
              next();
        });
    });

    // Handle socket connections
    io.on("connection", async (socket) => {
        console.log(`User connected: ${socket.user.id}`);
        const conversationId = socket.handshake.query.conversationId;
        if (!conversationId) {
            socket.emit("error", { message: "Conversation ID is required" });   
            return;
        }
        // Find the conversation by ID
        const conversationIdInt = parseInt(conversationId, 10);
        const conversation = await db.Conversations.findOne({ where: { id: conversationIdInt } });

        if (!conversation) {
            socket.emit("error", { message: "Conversation not found" });
            return;
        }

        // Check if the user is a participant in the conversation
        const user = await findUserByIdandType(socket.user.id, socket.user.userType);
        if (!user) {
            socket.emit("error", { message: "User not found" });
            return; 
        }

        if (![conversation.user1_email, conversation.user2_email].includes(user.email)) {
            socket.emit("error", { message: "You are not a participant in this conversation" });
            return;
        }

        // Attach the conversation and the user to the socket object
        socket.conversation = conversation;
        socket.user = user;

        socket.join(conversationIdInt);
        console.log(`User ${user.email} joined conversation ${conversationIdInt}`);

        const messages = await db.Message.findAll({
            where: { conversation_id: conversationIdInt },
            order: [['createdAt', 'ASC']],
            attributes: ['id', 'from', 'to', 'message', 'createdAt', 'fileName', 'data', 'is_read']
        });

        // Format messages
        const unifiedMessages = messages.map(msg => ({
            id: msg.id,
            from: msg.from,
            to: msg.to,
            message: msg.message,
            timestamp: msg.createdAt,
            isSentByUser: msg.from === socket.user.email,
            fileName: msg.fileName,
            data: msg.data ? msg.data.toString('base64') : null,
            is_read: msg.is_read
        }));

        // Send the messages to the client
        socket.emit("conversationMessages", { messages: unifiedMessages });
        // Update the new messages count for the user who is not the sender
        //client: we can also update the new messages count when client sends an acknowledgment that all conversation messages are received.
	    conversation.user1_email === user.email ? conversation.update({ user1_new_messages: 0 }) : conversation.update({ user2_new_messages: 0 });

        // Handle sending messages
        socket.on("sendMessage", async ({ message, file, fileName }) => {
            const user = socket.user;
            const conversation = socket.conversation;

            if (!message && !file) {
                socket.emit("error", { message: "Message or file is required" });
                return;
            }

            let receiverEmail;
            if (conversation.user1_email === user.email) {
                receiverEmail = conversation.user2_email;
            } else if (conversation.user2_email === user.email) {
                receiverEmail = conversation.user1_email;
            }

            const receiver = await findReceiverByEmail(receiverEmail);
            if (!receiver) {
                socket.emit("error", { message: "Receiver not found" });
                return;
            }
            
            const matches = file.match(/^data:(.+);base64,(.+)$/);
            let data = null;
            if (matches) {
                // const mimeType = matches[1];
                const base64Data = matches[2]; 
                data= Buffer.from(base64Data, 'base64'); // Convert base64 string to buffer     
            } 

            const createdMessage = db.Message.create({
                from: user.email,
                senderName: user.username,
                to: receiverEmail,
                receiverName: receiver.username,
                conversation_id: conversationIdInt,
                message,
                fileName,
                data
            });

            if (conversation.user1_email === user.email) {
                const numberOfNewMessages = conversation.user2_new_messages + 1;
                conversation.update({ last_message_time: createdMessage.createdAt, user2_new_messages: numberOfNewMessages });
            } else if (conversation.user2_email === user.email) {
                const numberOfNewMessages = conversation.user1_new_messages + 1;
                conversation.update({ last_message_time: createdMessage.createdAt, user1_new_messages: numberOfNewMessages });
            }

            // Emit the message to the others in conversation room
            socket.broadcast.to(conversationIdInt).emit("newMessage", {
                from: user.email,
                senderName: user.username,
                to: receiverEmail,
                receiverName: receiver.username,
                conversation_id: conversationIdInt,
                message,
                fileName,
                data
            });

            await createdMessage;
            socket.emit("messageDelivered", {
                id: createdMessage.id,
                receiver: receiver.username,
                message
            });

            console.log(`Message sent in conversation ${conversationIdInt}`);
        });

        socket.on("markRead", async (messageId) => {
            const user = socket.user;
            const conversation = socket.conversation;

            if (!messageId) {
                socket.emit("error", { message: "Message ID is required" });
                return;
            }
            const messageIdInt = parseInt(messageId, 10);
            const message = await db.Message.findOne({ where: { id: messageIdInt } });

            if (!message) {
                socket.emit("error", { message: "Message not found with the given id" });
                return;
            }
            if (message.to !== user.email) {
                socket.emit("error", { message: "You are not the recipient of this message" });
                return;
            }
            if (message.conversation_id !== conversation.id) {
                socket.emit("error", { message: "Message does not belong to this conversation" });
                return;
            }

            socket.broadcast.to(conversation.id).emit("messageRead", { messageId });
            await message.update({ is_read: true });
            
            // Emit the marking read event to the sender of the message
            socket.emit("MarkingReadissued", {messageId});
        });

        // receiver can't delete the message. only sender can delete the message.
        socket.on("deleteMessage", async (messageId) => {
            const user = socket.user;
            const conversation = socket.conversation;

            if (!messageId) {
                socket.emit("error", { message: "Message ID is required" });
                return;
            }
            const messageIdInt = parseInt(messageId, 10);
            const message = await db.Message.findOne({ where: { id: messageIdInt } });

            if (!message) {
                socket.emit("error", { message: "Message not found with the given id" });
                return;
            }
            if (message.from !== user.email) {
                socket.emit("error", { message: "You are not the sender of this message" });
                return;
            }
            if (message.conversation_id !== conversation.id) {
                socket.emit("error", { message: "Message does not belong to this conversation" });
                return;
            }

            if(message.is_read===false) {
                if (conversation.user1_email === user.email) {
                    const numberOfNewMessages = conversation.user2_new_messages - 1;
                    conversation.update({ user2_new_messages: numberOfNewMessages });
                } else if (conversation.user2_email === user.email) {
                    const numberOfNewMessages = conversation.user1_new_messages - 1;
                    conversation.update({ user1_new_messages: numberOfNewMessages });
                }
            }

            await message.destroy();
            
            // Emit the delete event to the other participant in the conversation
            socket.broadcast.to(conversation.id).emit("messageDeleted", { messageId });
            socket.emit("messageSuccesfullyDeleted", { deletedmessageId: messageId });
        });

        // Handle disconnect
        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.user.id}`);
        });
    });
}

module.exports = initializeSocketServer;

//rules for client:
// 1. Client should send the token and the conversationId in the handshake auth object when connecting to the socket server.
// 3. Client should listen for the "conversationMessages" event to receive the messages of the conversation after connecting.
// 4. Client should listen for the "newMessage" event to receive new messages sent to the conversation after connecting.
// 5. Client should send the "sendMessage" event with the message, file, and fileName when sending a new message.
// 6. Client should handle the "error" event to receive any errors that occur during the socket connection or message sending process.
// 7. Client should handle the "disconnect" event to know when the socket connection is closed. it should open reconnection : true in socket.io client options.
// 8. Client should handle the "connect" event to know when the socket connection is established successfully.
// 9. Client should handle the "connect_error" event to know when there is an error in establishing the socket connection.
