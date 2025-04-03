const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('AnnouncementSkill', {
    announcementId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'Announcement',
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
    tableName: 'AnnouncementSkill',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "announcementId" },
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
