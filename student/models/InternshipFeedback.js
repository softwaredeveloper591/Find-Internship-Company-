const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('InternshipFeedback', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    internshipId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Internship',
        key: 'id'
      }
    },
    author: {
      type: DataTypes.ENUM('admin','company'),
      allowNull: false
    },
    target: {
      type: DataTypes.ENUM('student','company'),
      allowNull: false
    },
    context: {
      type: DataTypes.ENUM('Report','Survey','Both','ReportMissing','SurveyMissing','ReportAfterAdmin','CompanyForm','MissingCompanyForm'),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    cycleId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'InternshipFeedback',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "internshipId",
        using: "BTREE",
        fields: [
          { name: "internshipId" },
        ]
      },
    ]
  });
};
