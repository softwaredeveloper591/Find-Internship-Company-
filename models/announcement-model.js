const { DataTypes}= require("sequelize");
const sequelize=require("../data/db");
const Application = require('./application-model');

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
	duration: {
		type: DataTypes.INTEGER,
      	allowNull: false
	},
	image: {
		type: DataTypes.STRING(100),
	},
	approvedAt: {
		type: DataTypes.DATE,
        allowNull: true,
	}
  }, {
    tableName: 'announcement',
    timestamps: false
  });

Application.belongsTo(Announcement, { foreignKey: 'announcementId' });
Announcement.hasMany(Application, { foreignKey: 'announcementId' });

module.exports=Announcement;