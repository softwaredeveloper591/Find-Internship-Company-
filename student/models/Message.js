const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Message', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    from: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    to: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    receiverName: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    fileName: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    data: {
      type: DataTypes.BLOB,
      allowNull: true
    },
    conversation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Conversations',
        key: 'id'
      }
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 0
    },
    senderName: {
      type: DataTypes.STRING(45),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'Message',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "conversation_id",
        using: "BTREE",
        fields: [
          { name: "conversation_id" },
        ]
      },
    ]
  });
};
