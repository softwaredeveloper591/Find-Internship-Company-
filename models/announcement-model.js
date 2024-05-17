const { DataTypes}= require("sequelize");
const sequelize=require("../data/db");

const Announcement = sequelize.define('announcement', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
      announcementName: { 
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    statusByDIC: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    image: {
      type: DataTypes.STRING(100),
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true 
    }
  }, {
    tableName: 'announcement',
    timestamps: false
  });

  module.exports=Announcement;
  