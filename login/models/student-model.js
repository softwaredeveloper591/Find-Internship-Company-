const { DataTypes}= require("sequelize");
const sequelize=require("../data/db");

const Student = sequelize.define('Student', {
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
      tc:{
        type: DataTypes.BIGINT,
        allowNull: false
      },
      year:{
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      department:{
        type: DataTypes.STRING(45),
        allowNull: false,
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