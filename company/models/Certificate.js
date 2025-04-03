const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Certificate', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'StudentProfile',
        key: 'studentId'
      }
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    issuingOrganization: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    issueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    expirationDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    credentialID: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    credentialURL: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'Certificate',
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
    ]
  });
};
