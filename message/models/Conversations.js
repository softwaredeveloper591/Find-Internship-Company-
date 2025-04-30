module.exports = function(sequelize, DataTypes) {
  return sequelize.define('conversations', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
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
      allowNull: true,
      defaultValue: 0
    },
    isDeletedByUser2: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 0
    },
    user1_new_messages: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    user2_new_messages: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    last_message_time: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'Conversations',
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
        name: "conversations_user1_email_user2_email",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "user1_email" },
          { name: "user2_email" },
        ]
      },
    ]
  });
};
