const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('StudentSkill', {
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'StudentProfile',
        key: 'studentId'
      }
    },
    skillId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'Skill',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'StudentSkill',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "studentId" },
          { name: "skillId" },
        ]
      },
      {
        name: "skillId",
        using: "BTREE",
        fields: [
          { name: "skillId" },
        ]
      },
    ]
  });
};
