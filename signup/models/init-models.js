var DataTypes = require("sequelize").DataTypes;
var _Company = require("./Company");
var _Student = require("./Student");
var _Ubys_Student = require("./ubys_student");

function initModels(sequelize) {
  var Company = _Company(sequelize, DataTypes);
  var Student = _Student(sequelize, DataTypes);
  var Ubys_Student = _Ubys_Student(sequelize, DataTypes);

  return {
    Company,
    Student,
	Ubys_Student,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
