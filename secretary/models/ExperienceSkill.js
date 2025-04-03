const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('ExperienceSkill', {
    experienceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'Experience',
        key: 'id'
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
    tableName: 'ExperienceSkill',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "experienceId" },
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
