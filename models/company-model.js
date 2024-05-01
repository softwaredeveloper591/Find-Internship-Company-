const { DataTypes}= require("sequelize");
const sequelize=require("../data/db");

const Company = sequelize.define('Company', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: false,
      unique: true
    },
    username: {
      type: DataTypes.STRING(45),
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING(45),
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    statusByDIC: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    address:{
      type: DataTypes.STRING(200),
      allowNull: false,
    }
  }, {
    tableName: 'company', // MySQL tablosunun adı
    timestamps: false // createdAt ve updatedAt alanlarını otomatik olarak eklememek için
  });
  
  module.exports = Company;