const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Internship', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    status: {
      type: DataTypes.STRING(45),
      allowNull: false,
      defaultValue: "started"
    },
    score: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    studentName: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    isApproved: {
      type: DataTypes.STRING(45),
      allowNull: false,
      defaultValue: "0"
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Student',
        key: 'id'
      }
    },
    applicationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Application',
        key: 'id'
      }
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
        using: "BTREE",
        fields: [
          { name: "studentId" },
        ]
      },
      {
        name: "applicationId",
        using: "BTREE",
        fields: [
          { name: "applicationId" },
        ]
      },
    ]
  });
};
