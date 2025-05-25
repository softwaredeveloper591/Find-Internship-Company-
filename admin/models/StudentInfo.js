const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('StudentInfo', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Student',
        key: 'id'
      },
      unique: "fk_studentInfo_student"
    },
    faculty: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    department: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    studentNo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: "studentNo_UNIQUE"
    },
    tc: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    studentPhone: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    relativePhone: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    formEmail: {
      type: DataTypes.STRING(45),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'StudentInfo',
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
        name: "id_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "studentId_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "studentId" },
        ]
      },
      {
        name: "studentNo_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "studentNo" },
        ]
      },
    ]
  });
};
