const { DataTypes}= require("sequelize");
const sequelize=require("../data/db");

const Ubys= sequelize.define('ubys', {
    tc: {
      type: DataTypes.BIGINT(10),
        allowNull: false,
        primaryKey: true,
      },
      id:{
        type: DataTypes.INTEGER,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING(45),
        allowNull: false
      },
      mail: {
        type: DataTypes.STRING(45),
        allowNull: false,
        unique: true
      },
      year:{
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      department:{
        type: DataTypes.STRING(45),
        allowNull: false,
      }
    }, {
      tableName: 'ubys',
      timestamps: false 
    });

module.exports = Ubys;