const { DataTypes}= require("sequelize");
const sequelize=require("../data/db");

const Admin = sequelize.define('Admin', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(45),
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING(250),
      allowNull: false,
      unique: true
    }
  }, {
    tableName: 'admin', 
    timestamps: false 
  });
  
  module.exports = Admin;