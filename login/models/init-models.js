var DataTypes = require("sequelize").DataTypes;
var _Admin = require("./Admin");
var _Company = require("./Company");
var _Secretary = require("./Secretary");
var _Student = require("./Student");

function initModels(sequelize) {
  var Admin = _Admin(sequelize, DataTypes);
  var Company = _Company(sequelize, DataTypes);
  var Secretary = _Secretary(sequelize, DataTypes);
  var Student = _Student(sequelize, DataTypes);

  return {
    Admin,
    Company,
    Secretary,
    Student,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
