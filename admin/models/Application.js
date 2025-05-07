const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Application', {
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
        model: 'Student',
        key: 'id'
      }
    },
    announcementId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Announcement',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    isApprovedByCompany: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    isApprovedByDIC: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    isSentBySecretary: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    applyDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    statusUpdateDate: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'Application',
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
        name: "announcementId",
        using: "BTREE",
        fields: [
          { name: "announcementId" },
        ]
      },
    ]
  });
};
