const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Company', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: false,
      unique: "name_5"
    },
    username: {
      type: DataTypes.STRING(45),
      allowNull: false,
      unique: "username_5"
    },
    email: {
      type: DataTypes.STRING(45),
      allowNull: false,
      unique: "email_5"
    },
    password: {
      type: DataTypes.STRING(250),
      allowNull: false,
      unique: "password_5"
    },
    statusByDIC: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    address: {
      type: DataTypes.STRING(200),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'Company',
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
        name: "email",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "name",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "name" },
        ]
      },
      {
        name: "username",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "username" },
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
        name: "name_2",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "name" },
        ]
      },
      {
        name: "username_2",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "username" },
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
        name: "name_3",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "name" },
        ]
      },
      {
        name: "username_3",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "username" },
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
        name: "name_4",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "name" },
        ]
      },
      {
        name: "username_4",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "username" },
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
      {
        name: "name_5",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "name" },
        ]
      },
      {
        name: "username_5",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "username" },
        ]
      },
      {
        name: "email_5",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "password_5",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "password" },
        ]
      },
    ]
  });
};
