const { DataTypes} = require("sequelize");
const sequelize = require("../data/db");

const Message = sequelize.define('Message', {
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
	topic: {
	  	type: DataTypes.STRING(45),
	  	allowNull: false,
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
  	  	timestamps: false
  	});

module.exports = Message;