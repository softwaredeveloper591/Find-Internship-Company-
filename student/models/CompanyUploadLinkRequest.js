const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('CompanyUploadLinkRequest', {
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
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Student',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('Pending','Approved','Rejected'),
      allowNull: true,
      defaultValue: "Pending"
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    companyEmail: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    companyName: {
      type: DataTypes.STRING(45),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'CompanyUploadLinkRequest',
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
