module.exports = (sequelize, DataTypes) => {
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


Message.associate = (db) => {
	db.Conversation.hasMany(Message, {
	  foreignKey: 'conversation_id'});
  
	  Message.belongsTo(db.Conversation, {
	  foreignKey: 'conversation_id'})};

	return Message;
};
