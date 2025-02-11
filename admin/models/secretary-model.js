const { DataTypes } = require("sequelize");
const sequelize=require("../data/db");

const Secretary = sequelize.define('Secretary', {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
    username: {
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
    tableName: 'secretary', 
    timestamps: false 
  });
  
module.exports = Secretary;