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
    type: DataTypes.STRING(100),
	allowNull: true,
    references: {
      model: 'Application',
      key: 'id'
    },
	defaultValue: null
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
    allowNull: false,
	defaultValue: null
  },
  data: {
    type: DataTypes.BLOB('medium'),
    allowNull: false
  },
  status: {
    type: DataTypes.BLOB('medium'),
	defaultValue: null
  }
}, {
  tableName: 'document',
  timestamps: false
});

module.exports = Document;