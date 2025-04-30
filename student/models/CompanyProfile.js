const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('CompanyProfile', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Company',
        key: 'id'
      },
      unique: "CompanyProfile_ibfk_1"
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    industry: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    contactPhone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    contactEmail: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    website: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    socialMediaLinks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    companyLogo: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    bannerImage: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    about: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'CompanyProfile',
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
        name: "companyId_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "companyId" },
        ]
      },
    ]
  });
};
