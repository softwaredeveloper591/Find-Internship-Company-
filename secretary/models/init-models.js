var DataTypes = require("sequelize").DataTypes;
var _Admin = require("./Admin");
var _Announcement = require("./Announcement");
var _AnnouncementSkill = require("./AnnouncementSkill");
var _Application = require("./Application");
var _Certificate = require("./Certificate");
var _Company = require("./Company");
var _Conversations = require("./Conversations");
var _Document = require("./Document");
var _Experience = require("./Experience");
var _ExperienceSkill = require("./ExperienceSkill");
var _Internship = require("./Internship");
var _Message = require("./Message");
var _Secretary = require("./Secretary");
var _Skill = require("./Skill");
var _Student = require("./Student");
var _StudentInfo = require("./StudentInfo");
var _StudentProfile = require("./StudentProfile");
var _StudentSkill = require("./StudentSkill");
var _ubys_student = require("./ubys_student");

function initModels(sequelize) {
  var Admin = _Admin(sequelize, DataTypes);
  var Announcement = _Announcement(sequelize, DataTypes);
  var AnnouncementSkill = _AnnouncementSkill(sequelize, DataTypes);
  var Application = _Application(sequelize, DataTypes);
  var Certificate = _Certificate(sequelize, DataTypes);
  var Company = _Company(sequelize, DataTypes);
  var Conversations = _Conversations(sequelize, DataTypes);
  var Document = _Document(sequelize, DataTypes);
  var Experience = _Experience(sequelize, DataTypes);
  var ExperienceSkill = _ExperienceSkill(sequelize, DataTypes);
  var Internship = _Internship(sequelize, DataTypes);
  var Message = _Message(sequelize, DataTypes);
  var Secretary = _Secretary(sequelize, DataTypes);
  var Skill = _Skill(sequelize, DataTypes);
  var Student = _Student(sequelize, DataTypes);
  var StudentInfo = _StudentInfo(sequelize, DataTypes);
  var StudentProfile = _StudentProfile(sequelize, DataTypes);
  var StudentSkill = _StudentSkill(sequelize, DataTypes);
  var ubys_student = _ubys_student(sequelize, DataTypes);

  Announcement.belongsToMany(Skill, { as: 'skillId_Skills', through: AnnouncementSkill, foreignKey: "announcementId", otherKey: "skillId" });
  Experience.belongsToMany(Skill, { as: 'skillId_Skill_ExperienceSkills', through: ExperienceSkill, foreignKey: "experienceId", otherKey: "skillId" });
  Skill.belongsToMany(Announcement, { as: 'announcementId_Announcements', through: AnnouncementSkill, foreignKey: "skillId", otherKey: "announcementId" });
  Skill.belongsToMany(Experience, { as: 'experienceId_Experiences', through: ExperienceSkill, foreignKey: "skillId", otherKey: "experienceId" });
  Skill.belongsToMany(StudentProfile, { as: 'studentId_StudentProfiles', through: StudentSkill, foreignKey: "skillId", otherKey: "studentId" });
  StudentProfile.belongsToMany(Skill, { as: 'skillId_Skill_StudentSkills', through: StudentSkill, foreignKey: "studentId", otherKey: "skillId" });
  AnnouncementSkill.belongsTo(Announcement, { foreignKey: "announcementId"});
  Announcement.hasMany(AnnouncementSkill, { foreignKey: "announcementId"});
  Application.belongsTo(Announcement, { foreignKey: "announcementId"});
  Announcement.hasMany(Application, { foreignKey: "announcementId"});
  Document.belongsTo(Application, { foreignKey: "applicationId"});
  Application.hasMany(Document, { foreignKey: "applicationId"});
  Internship.belongsTo(Application, { foreignKey: "applicationId"});
  Application.hasMany(Internship, { foreignKey: "applicationId"});
  Announcement.belongsTo(Company, { foreignKey: "companyId"});
  Company.hasMany(Announcement, { foreignKey: "companyId"});
  Message.belongsTo(Conversations, { foreignKey: "conversation_id"});
  Conversations.hasMany(Message, { foreignKey: "conversation_id"});
  ExperienceSkill.belongsTo(Experience, { foreignKey: "experienceId"});
  Experience.hasMany(ExperienceSkill, { foreignKey: "experienceId"});
  AnnouncementSkill.belongsTo(Skill, { foreignKey: "skillId"});
  Skill.hasMany(AnnouncementSkill, { foreignKey: "skillId"});
  ExperienceSkill.belongsTo(Skill, { foreignKey: "skillId"});
  Skill.hasMany(ExperienceSkill, { foreignKey: "skillId"});
  StudentSkill.belongsTo(Skill, { foreignKey: "skillId"});
  Skill.hasMany(StudentSkill, { foreignKey: "skillId"});
  Application.belongsTo(Student, { foreignKey: "studentId"});
  Student.hasMany(Application, { foreignKey: "studentId"});
  Internship.belongsTo(Student, { foreignKey: "studentId"});
  Student.hasMany(Internship, { foreignKey: "studentId"});
  StudentInfo.belongsTo(Student, { foreignKey: "studentId"});
  Student.hasOne(StudentInfo, { foreignKey: "studentId"});
  StudentProfile.belongsTo(Student, { foreignKey: "studentId"});
  Student.hasOne(StudentProfile, { foreignKey: "studentId"});
  Certificate.belongsTo(StudentProfile, { foreignKey: "studentId"});
  StudentProfile.hasMany(Certificate, { foreignKey: "studentId"});
  Experience.belongsTo(StudentProfile, { foreignKey: "studentId"});
  StudentProfile.hasMany(Experience, { foreignKey: "studentId"});
  StudentSkill.belongsTo(StudentProfile, { foreignKey: "studentId"});
  StudentProfile.hasMany(StudentSkill, { foreignKey: "studentId"});

  return {
    Admin,
    Announcement,
    AnnouncementSkill,
    Application,
    Certificate,
    Company,
    Conversations,
    Document,
    Experience,
    ExperienceSkill,
    Internship,
    Message,
    Secretary,
    Skill,
    Student,
    StudentInfo,
    StudentProfile,
    StudentSkill,
    ubys_student,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
