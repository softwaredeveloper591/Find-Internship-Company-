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
      allowNull: false,
      references: {
        model: 'Application',
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
        name: "applicationId",
        using: "BTREE",
        fields: [
          { name: "applicationId" },
        ]
      },
    ]
  });
};
