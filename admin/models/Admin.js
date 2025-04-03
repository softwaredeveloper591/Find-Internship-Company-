const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Admin', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(45),
      allowNull: false,
      unique: "email_4"
    },
    password: {
      type: DataTypes.STRING(250),
      allowNull: false,
      unique: "password_4"
    }
  }, {
    sequelize,
    tableName: 'Admin',
    timestamps: false,
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
        name: "id",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "email",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "password",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "password" },
        ]
      },
      {
        name: "email_2",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "password_2",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "password" },
        ]
      },
      {
        name: "email_3",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "password_3",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "password" },
        ]
      },
      {
        name: "email_4",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "password_4",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "password" },
        ]
      },
    ]
  });
};
