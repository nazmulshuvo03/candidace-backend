const { DataTypes, Sequelize, Deferrable } = require("sequelize");
const sequelize = require("../db");
const { Profession } = require("./profession");

const User = sequelize.define("user", {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: true },
  type: {
    type: DataTypes.ENUM("BASIC", "AUTHOR", "ADMIN"),
    defaultValue: "BASIC",
  },
});

const Profile = sequelize.define("profile", {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
    references: {
      model: User,
      key: "id",
      deferrable: Deferrable.INITIALLY_IMMEDIATE,
    },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  timezone: {
    type: DataTypes.STRING,
    defaultValue: "America/New_York",
  },
  authMedium: {
    type: DataTypes.ENUM("EMAIL", "GOOGLE", "LINKEDIN"),
    defaultValue: "EMAIL",
  },
  googleId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  },
  userName: DataTypes.STRING,
  firstName: DataTypes.STRING,
  lastName: DataTypes.STRING,
  photoURL: {
    type: DataTypes.STRING,
    defaultValue:
      "https://candidace-public-storage.s3.ap-south-1.amazonaws.com/default.png",
  },
  linkedInProfile: DataTypes.STRING,
  profileHeadline: DataTypes.TEXT,
  country: DataTypes.STRING,
  language: DataTypes.STRING,
  targetProfessionId: { type: DataTypes.UUID },
  focusAreas: { type: DataTypes.ARRAY(DataTypes.UUID), defaultValue: [] },
  typesOfExperience: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: [],
  },
  experienceLevel: DataTypes.INTEGER,
  preparationStage: DataTypes.INTEGER,
  companiesOfInterest: DataTypes.ARRAY(DataTypes.INTEGER),
  unsubscribed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  lastVisit: DataTypes.DATE,
});

const Verification = sequelize.define("verification", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: { type: DataTypes.UUID, allowNull: false },
  verificationType: {
    type: DataTypes.ENUM("EMAIL_VERIFICATION", "FORGET_PASSWORD"),
    allowNull: false,
    defaultValue: "EMAIL_VERIFICATION",
  },
  token: DataTypes.STRING,
});

Profile.belongsTo(User, { foreignKey: "id", onDelete: "CASCADE" });
User.hasOne(Profile, { foreignKey: "id", onDelete: "CASCADE" });

Profile.belongsTo(Profession, {
  foreignKey: "targetProfessionId",
  as: "targetProfession",
  onDelete: "SET NULL",
});

Verification.belongsTo(Profile, {
  foreignKey: "userId",
  targetKey: "id",
  onDelete: "CASCADE",
});

// Hook to update the email in the Profile table before updating a User
User.beforeUpdate(async (user, options) => {
  try {
    await Profile.update({ email: user.email }, { where: { id: user.id } });
  } catch (error) {
    console.error("Error updating Profile:", error);
    throw new Error("Failed to update Profile during user update.");
  }
});

// Hook to create profile table with same user id after creating user table
User.afterCreate(async (user, options) => {
  try {
    await Profile.create({ id: user.id, email: user.email });
  } catch (error) {
    console.error("Error creating Profile:", error);
  }
});

// Hook to check if the new email in the Profile table matches the existing email in the User table
Profile.beforeUpdate(async (profile, options) => {
  try {
    const user = await User.findOne({ where: { id: profile.id } });

    if (profile.email !== user.email) {
      throw new Error("Email should be updated in User table only");
    }
  } catch (error) {
    console.error("Error checking email update:", error);
    throw new Error("Failed to check email update.");
  }
});

module.exports = {
  User,
  Profile,
  Verification,
};
