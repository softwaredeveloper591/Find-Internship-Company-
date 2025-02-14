const { DataTypes} = require("sequelize");
const sequelize = require("../data/db");
const conversation = require("./conversation-model");

const message = sequelize.define('message', {
	id: {
		type: DataTypes.INTEGER,
      	primaryKey: true,
		autoIncrement: true
	},
    from: {
      	type: DataTypes.STRING(45),
      	allowNull: false,
    },
    senderName: {
      	type: DataTypes.STRING(45),
	  	allowNull: false,
    },
    to: {
      	type: DataTypes.STRING(45),
	  	allowNull: false,
    },
    receiverName: {
      	type: DataTypes.STRING(45),
	  	allowNull: false,
    },
	conversation_id:{
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'conversations',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
	message: {
		type: DataTypes.TEXT,
		allowNull: false,
	},
	fileName: {
		type: DataTypes.STRING(45),
		defaultValue: null
	},
	data: {
		type: DataTypes.BLOB('medium'),
		defaultValue: null
	},
	status: {
		type: DataTypes.STRING(45),
		defaultValue: null
	}
  	}, {
  	  	tableName: 'message',
  	  	timestamps: true
  	});

conversation.hasMany(message, { foreignKey: 'conversation_id', onDelete: 'CASCADE' });
message.belongsTo(conversation, { foreignKey: 'conversation_id' });
module.exports = message;
