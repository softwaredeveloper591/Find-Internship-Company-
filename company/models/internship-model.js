module.exports = (sequelize, DataTypes) => {
const Internship = sequelize.define('Internship', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    status: {
      type: DataTypes.STRING(45),
      allowNull: false,
	  defaultValue: 'started'
    },
    applicationId:{
      type: DataTypes.INTEGER,
      allowNull: false
    },
    score: {
		type: DataTypes.STRING(45),
		defaultValue: null
	},
    studentName: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
	isApproved: {
	  type: DataTypes.STRING(45),
      allowNull: false,
	  defaultValue: 0
	},
	studentId: {
		type: DataTypes.INTEGER,
	},
  startDate: {
		type: DataTypes.DATE,
		allowNull: false
	},
	endDate: {
		type: DataTypes.DATE,
		allowNull: false
	},
  }, {
    tableName: 'internship',
    timestamps: false
  });

Internship.associate = (db) => {
  Internship.belongsTo(db.Application, {
    foreignKey: 'applicationId'});

  db.Application.hasOne(Internship, {
    foreignKey: 'applicationId'})};

  return Internship;
};

