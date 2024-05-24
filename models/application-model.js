const { DataTypes}= require("sequelize");
const sequelize=require("../data/db");
const Document = require('./document-model');

const Application = sequelize.define('Application', {
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
      defaultValue: null
    },
    isApprovedByDIC: {
      type: DataTypes.BOOLEAN,
      defaultValue: null
    }
  }, {
    tableName: 'application',
    timestamps: false
  });

Document.belongsTo(Application, { foreignKey: 'applicationId' });
Application.hasMany(Document, { foreignKey: 'applicationId' });

  module.exports=Application;