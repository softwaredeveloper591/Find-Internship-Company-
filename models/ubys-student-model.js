const { DataTypes}= require("sequelize");
const sequelize=require("../data/db");

const ubysStudent= sequelize.define('ubysStudent', {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
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
	  department: {
        type: DataTypes.STRING(45),
        allowNull: false,
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: false,
      }
    }, {
      tableName: 'ubys_student',
      timestamps: false 
    });
    
    module.exports = ubysStudent;