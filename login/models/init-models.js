var DataTypes = require("sequelize").DataTypes;
var _Admin = require("./Admin");
var _Company = require("./Company");
var _Secretary = require("./Secretary");
var _Student = require("./Student");
var _Ubys_Student = require("./ubys_student");

function initModels(sequelize) {
  var Admin = _Admin(sequelize, DataTypes);
  var Company = _Company(sequelize, DataTypes);
  var Secretary = _Secretary(sequelize, DataTypes);
  var Student = _Student(sequelize, DataTypes);
  var Ubys_Student = _Ubys_Student(sequelize, DataTypes);

  return {
    Admin,
    Company,
    Secretary,
    Student,
    Ubys_Student,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
