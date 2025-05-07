const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Document', {
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
      }
    },
    manualApplicationId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      references: {
        model: 'ManualApplication',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    fileType: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    username: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    userId: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    data: {
      type: DataTypes.BLOB,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(45),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'Document',
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
        name: "Document_ibfk_1",
        using: "BTREE",
        fields: [
          { name: "applicationId" },
        ]
      },
      {
        name: "fk_manual_application",
        using: "BTREE",
        fields: [
          { name: "manualApplicationId" },
        ]
      },
    ]
  });
};
