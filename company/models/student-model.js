module.exports = (sequelize, DataTypes) => {
const Student = sequelize.define('Student', {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING(45),
        allowNull: false
      },
      email: {
        type: DataTypes.STRING(45),
        allowNull: false,
        unique: true
      },
      tc:{
        type: DataTypes.BIGINT,
        allowNull: false
      },
      year:{
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      department:{
        type: DataTypes.STRING(45),
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      }
    }, {
      tableName: 'student',
      timestamps: false 
    });

Student.associate = (db) => {
  Student.hasMany(db.Application, {foreignKey: 'studentId'});
  db.Application.belongsTo(Student, {foreignKey: 'studentId'});

  Student.hasOne(db.Internship, {foreignKey: 'studentId'});
  db.Internship.belongsTo(Student, {foreignKey: 'studentId'});
};
  return Student;
};