const { DataTypes } = require("sequelize");
const sequelize = require("../data/db");

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true
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
  data: {
    type: DataTypes.BLOB('medium'),
    allowNull: false
  }
}, {
  tableName: 'document',
  timestamps: false
});

module.exports = Document;