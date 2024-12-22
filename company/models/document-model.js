module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true
  },
    applicationId: {
    type: DataTypes.INTEGER,
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
	defaultValue: null
  },
  data: {
    type: DataTypes.BLOB('medium'),
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(45),
	defaultValue: null
  }
}, {
  tableName: 'document',
  timestamps: false
});
  
Document.associate = (db) => {
  Document.belongsTo(db.Application,
    { foreignKey: 'applicationId' })};

return Document;
};
