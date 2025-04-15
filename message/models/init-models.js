var DataTypes = require("sequelize").DataTypes;
var _Admin = require("./Admin");
var _Company = require("./Company");
var _Conversations = require("./Conversations");
var _Message = require("./Message");
var _Secretary = require("./Secretary");
var _Student = require("./Student");

function initModels(sequelize) {
  var Admin = _Admin(sequelize, DataTypes);
  var Company = _Company(sequelize, DataTypes);
  var Conversations = _Conversations(sequelize, DataTypes);
  var Message = _Message(sequelize, DataTypes);
  var Secretary = _Secretary(sequelize, DataTypes);
  var Student = _Student(sequelize, DataTypes);

  Message.belongsTo(Conversations, { foreignKey: "conversation_id"});
  Conversations.hasMany(Message, { foreignKey: "conversation_id"});

  return {
    Admin,
    Company,
    Conversations,
    Message,
    Secretary,
    Student
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
