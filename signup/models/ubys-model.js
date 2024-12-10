const { DataTypes}= require("sequelize");
const sequelize=require("../data/db");

const Ubys= sequelize.define('ubys_student', {
      id:{
		primaryKey: true,
        type: DataTypes.INTEGER,
        allowNull: false
      },
      student_name: {
        type: DataTypes.STRING(45),
        allowNull: false
      },
      email: {
        type: DataTypes.STRING(45),
        allowNull: false,
        unique: true
      },
	  department:{
        type: DataTypes.STRING(45),
        allowNull: false,
      },
      year:{
        type: DataTypes.INTEGER,
        allowNull: false,
      },
	  tc:{
        type: DataTypes.STRING(40),
        allowNull: false,
      }
      
    }, {
      tableName: 'ubys_student',
      timestamps: false 
    });

module.exports = Ubys;