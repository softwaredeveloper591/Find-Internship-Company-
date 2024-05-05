const { DataTypes}= require("sequelize");
const sequelize=require("../data/db");

const Student= sequelize.define('Student', {
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
      email: {
        type: DataTypes.STRING(45),
        allowNull: false,
        unique: true
      },
      password: {
        type: DataTypes.STRING(45),
        allowNull: false,
        unique: true
      }
    }, {
      tableName: 'student',
      timestamps: false 
    });
    
    module.exports = Student;