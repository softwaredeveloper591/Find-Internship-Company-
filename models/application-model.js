const { DataTypes}= require("sequelize");
const sequelize=require("../data/db");

const Application = sequelize.define('application', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    announcementId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    isApprovedByCompany: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false 
    },
    isApprovedByDIC: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false 
    }
  }, {
    tableName: 'application',
    timestamps: false
  });

  module.exports=Application;