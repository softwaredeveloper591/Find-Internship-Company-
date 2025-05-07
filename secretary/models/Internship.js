const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Internship', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: "studentId_UNIQUE"
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
      type: DataTypes.STRING(50),
      allowNull: true,
      references: {
        model: 'ManualApplication',
        key: 'id'
      },
      unique: "Internship_ibfk_2"
    },
    status: {
      type: DataTypes.ENUM('Started','Finished','Rejected','Approved'),
      allowNull: false,
      defaultValue: "Started"
    },
    score: {
      type: DataTypes.INTEGER,
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
        name: "studentId_UNIQUE",
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
