const { DataTypes}= require("sequelize");
const sequelize=require("../data/db");
const Application = require('./application-model');

const Internship = sequelize.define('Internship', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    status: {
      type: DataTypes.STRING(45),
      allowNull: false,
	  defaultValue: 'started'
    },
    score: {
      type: DataTypes.STRING(45),
      allowNull: false,
	  defaultValue: '0'
    },
    studentName: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
	isApproved: {
	  type: DataTypes.STRING(45),
      allowNull: false,
	  defaultValue: 0
	}
  }, {
    tableName: 'internship',
    timestamps: false
  });

Application.belongsTo(Internship, { foreignKey: 'id' });
Internship.hasOne(Application, { foreignKey: 'id' });

module.exports = Internship;