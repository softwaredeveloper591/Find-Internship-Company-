module.exports = (sequelize, DataTypes) => {
const Application = sequelize.define('Application', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    announcementId: {
      type: DataTypes.INTEGER
    },
    status: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    isApprovedByCompany: {
      type: DataTypes.BOOLEAN,
      defaultValue: null
    },
    isApprovedByDIC: {
      type: DataTypes.BOOLEAN,
      defaultValue: null
    },
	isSentBySecretary: {
		type: DataTypes.BOOLEAN,
		defaultValue: false
	},
  applyDate: {
		type: DataTypes.DATE,
		allowNull: true,
	},
  statusUpdateDate: {
		type: DataTypes.DATE,
		allowNull: true
	}
  }, {
    tableName: 'application',
    timestamps: false
  });

  Application.associate = (db) => {
    Application.hasMany(db.Document,
      { foreignKey: 'applicationId' })};
  
  return Application;
};