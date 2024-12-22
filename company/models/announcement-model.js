module.exports = (sequelize, DataTypes) => {
const Announcement = sequelize.define('Announcement', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    announcementName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
	image: {
		type: DataTypes.STRING(100),
		defaultValue: null
	},
	startDate: {
		type: DataTypes.DATE,
		allowNull: false
	},
	endDate: {
		type: DataTypes.DATE,
		allowNull: false
	},
	status: {
		type: DataTypes.STRING(40),
        allowNull: false,
		defaultValue: "pending"
	}
  }, {
    tableName: 'announcement',
    timestamps: false
  });

Announcement.associate = (db) => {
  Announcement.hasMany(db.Application, {
    foreignKey: 'announcementId'});

  db.Application.belongsTo(Announcement, {
    foreignKey: 'announcementId'})};

  return Announcement;
};

