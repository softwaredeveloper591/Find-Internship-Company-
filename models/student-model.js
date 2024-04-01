const { DataTypes}= require("sequelize");
const sequelize=require("../data/db");

const Student= sequelize.define('Student', {
    id: {
        type: DataTypes.STRING(45),
        allowNull: false,
        primaryKey: true
      },
      username: {
        type: DataTypes.STRING(45),
        allowNull: false
      },
      email: {
        type: DataTypes.STRING(45),
        allowNull: false
      },
      password: {
        type: DataTypes.STRING(45),
        allowNull: false
      }
    }, {
      tableName: 'student',
      timestamps: false 
    });
    
    module.exports = Student;