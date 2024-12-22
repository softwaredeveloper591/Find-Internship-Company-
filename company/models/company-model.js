module.exports = (sequelize, DataTypes) => {
const Company = sequelize.define('Company', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: false,
      unique: true
    },
    username: {
      type: DataTypes.STRING(45),
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING(45),
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING(250),
      allowNull: false,
      unique: true
    },
    statusByDIC: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    address:{
      type: DataTypes.STRING(200),
      allowNull: false,
    }
  }, {
    tableName: 'company', 
    timestamps: false 
  });

Company.associate = (db) => {
  Company.hasMany(db.Announcement, {foreignKey: 'companyId'});
  db.Announcement.belongsTo(Company,{foreignKey: 'companyId'})};
  
  return Company;
};