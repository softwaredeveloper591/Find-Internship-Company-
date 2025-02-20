const { DataTypes } = require('sequelize');
const sequelize = require("../data/db"); 

const conversation = sequelize.define('Conversation', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user1_email: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    user1_name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    user2_email: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    user2_name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    isDeletedByUser1: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isDeletedByUser2: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    user1_new_messages: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            validate: {
                min: 0 
            }
        },
    user2_new_messages: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
            min: 0 
        }
    },
    last_message_time: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: true, // Enable timestamps
    tableName: 'conversations',
    updatedAt: false, // Disable updatedAt
    indexes: [
        {
            unique: true,
            fields: ['user1_email', 'user2_email']
        }
    ]
});

module.exports = conversation;
