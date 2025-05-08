const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Internship', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    applicationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Application',
        key: 'id'
      },
      unique: "Internship_ibfk_1"
    },
    manualApplicationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'ManualApplication',
        key: 'id'
      },
      unique: "Internship_ibfk_2"
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Student',
        key: 'id'
      },
      unique: "Internship_ibfk_3"
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    isApprovedByCompany: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    isApprovedByDIC: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'Internship',
    timestamps: false,
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
        name: "studentId",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "studentId" },
        ]
      },
      {
        name: "applicationId",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "applicationId" },
        ]
      },
      {
        name: "manualApplicationId",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "manualApplicationId" },
        ]
      },
    ]
  });
};
