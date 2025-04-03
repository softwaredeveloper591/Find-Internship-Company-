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
      allowNull: false
    },
    department: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    studentNo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: "studentNo_UNIQUE"
    },
    tc: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    studentPhone: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    relativePhone: {
      type: DataTypes.BIGINT,
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
