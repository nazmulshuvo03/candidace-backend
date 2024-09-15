const { DataTypes, Sequelize } = require("sequelize");
const sequelize = require("../db");

const JobBoard = sequelize.define("jobBoard", {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  source: {
    type: DataTypes.STRING,
  },
  jobTitle: {
    type: DataTypes.STRING,
  },
  companyName: {
    type: DataTypes.STRING,
  },
  location: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  datePosted: { type: DataTypes.DATE },
  applyUrl: {
    type: DataTypes.STRING,
  },
  imageUrl: {
    type: DataTypes.STRING,
  },
  tags: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
});

module.exports = {
  JobBoard,
};
