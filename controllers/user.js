const { Op } = require("sequelize");
const { BAD_REQUEST, NOT_FOUND } = require("../constants/errorCodes");
const asyncWrapper = require("../middlewares/async");
const {
  Availability,
  RecurrentAvailability,
} = require("../models/availability");
const { Profession } = require("../models/profession");
const { User, Profile } = require("../models/user");
const { WorkExperience } = require("../models/workExperience");
const { Education } = require("../models/education");
const { InterviewExperience } = require("../models/interviewExperience");
const { profileQueryOptions } = require("../helpers/queries/profile");
const { _getUsersLastMeeting } = require("./meeting");
const { profileCompletionStatus } = require("../helpers/user");
const { SelfAssessment, Review } = require("../models/review");
const { Skill } = require("../models/skill");
const { Meeting } = require("../models/meeting");
const MIXPANEL_TRACK = require("../helpers/mixpanel");

const _getUserProfile = async (userId) => {
  const today = new Date().getTime();

  const user = await Profile.findOne({
    where: { id: userId },
    include: [
      {
        model: Profession,
        as: "targetProfession",
        foreignKey: "targetProfessionId",
      },
      {
        model: WorkExperience,
      },
      Education,
      InterviewExperience,
      {
        model: Availability,
        required: false,
        where: {
          dayHour: {
            [Op.gte]: today,
          },
        },
      },
      {
        model: RecurrentAvailability,
        required: false,
      },
      {
        model: Review,
        required: false,
        foreignKey: "interviewerId",
        include: [
          {
            model: Profile,
            as: "reviewerProfile",
            foreignKey: "reviewerId",
            include: [
              {
                model: WorkExperience,
                required: false,
                where: { currentCompany: true },
              },
            ],
          },
          {
            model: Meeting,
            as: "meeting",
            foreignKey: "meetingId",
          },
        ],
      },
    ],
    order: [
      ["availabilities", "dayHourUTC", "ASC"],
      ["workExperiences", "startDate", "DESC"],
      ["education", "year_of_graduation", "DESC"],
    ],
  });
  return user;
};

const _getUserType = async (userId) => {
  const user = await User.findOne({
    where: { id: userId },
    attributes: ["type"],
  });
  if (!user) return null;
  return user;
};

const _updateUserProfile = async (res, userId, updatedFields) => {
  if (Object.keys(updatedFields).length === 0)
    return res.fail("No fields provided for update", BAD_REQUEST);

  const user = await Profile.findByPk(userId);
  if (!user) return res.fail("User data not found", NOT_FOUND);

  const updatedUser = await user.update(updatedFields);
  if (!updatedUser) return res.fail("User data update failed");
  if (
    user.dataValues.companiesOfInterest &&
    user.dataValues.companiesOfInterest.length === 0 &&
    updatedFields.companies &&
    updatedFields.companiesOfInterest.length >= 1
  ) {
    MIXPANEL_TRACK({
      name: "First Target Company Adeed",
      data: { companies: updatedFields.companiesOfInterest },
      id: user.dataValues.id,
    });
  }

  return updatedUser;
};

const _checkIfUserUnsubscribed = async (userId) => {
  const found = await Profile.findByPk(userId);
  if (!found) return false;
  return found.unsubscribed;
};

const getAllUserData = asyncWrapper(async (req, res) => {
  const userList = await User.findAll();
  res.success(userList);
});

const createUser = asyncWrapper(async (req, res) => {
  const model = {
    ...req.body,
  };
  const pf = await User.create(model);
  if (!pf) return res.fail("User data not created");

  res.success(pf);
});

const getAllUserProfiles = asyncWrapper(async (req, res) => {
  const userList = await Profile.findAll({
    order: [["createdAt", "DESC"]],
  });
  for (let user of userList) {
    user.dataValues.completionStatus = await profileCompletionStatus(user.id);
  }
  res.success(userList);
});

const getDashboardProfiles = asyncWrapper(async (req, res) => {
  const userProfile = res.locals.user;
  const queryParameters = req.query;
  const queryOptions = profileQueryOptions(queryParameters, userProfile);
  const today = new Date().getTime();
  const userList = await Profile.findAll({
    ...queryOptions,
    include: [
      {
        model: Availability,
        required: false,
        where: {
          dayHour: {
            [Op.gte]: today,
          },
        },
        order: [["availabilities", "dayHour", "ASC"]],
      },
      WorkExperience,
      InterviewExperience,
      {
        model: Review,
        required: false,
        foreignKey: "interviewerId",
      },
    ],
  });
  for (let user of userList) {
    const lastMeeting = await _getUsersLastMeeting(user.id);
    user.dataValues.lastMeeting = lastMeeting;
  }
  res.success(userList);
});

const getSingleUserProfile = asyncWrapper(async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.fail("Invalid user ID", BAD_REQUEST);

  const user = await _getUserProfile(userId);
  if (!user) return res.fail("User data not found", NOT_FOUND);

  const completionStatus = await profileCompletionStatus(userId);

  res.success({ ...user.dataValues, completionStatus });
});

const updateUserProfile = asyncWrapper(async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.fail("Invalid user ID", BAD_REQUEST);
  let updatedUser = await _updateUserProfile(res, userId, req.body);
  if (updatedUser) {
    updatedUser.dataValues.completionStatus = await profileCompletionStatus(
      updatedUser.id,
    );
    res.success(updatedUser);
  }
});

const deleteUser = asyncWrapper(async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.fail("Invalid user ID", BAD_REQUEST);
  await User.destroy({
    where: { id: userId },
  });
  res.success("User Deleted");
});

const deleteAllUser = asyncWrapper(async (req, res) => {
  await User.destroy({ where: {} });
  res.success("User table cleared");
});

const checkProperty = asyncWrapper(async (req, res) => {
  const obj = req.body;
  const found = await Profile.findOne({ where: obj });
  if (found) {
    return res.success({ exists: true });
  }
  res.success({ exists: false });
});

const getProgress = asyncWrapper(async (req, res) => {
  const userProfile = res.locals.user;
  if (!userProfile) return res.fail("User not found or not logged in", 404);
  const formattedProgress = await Skill.findAll({
    where: {
      profession_id: userProfile.targetProfessionId,
    },
  });
  for (let skill of formattedProgress) {
    const saData = await SelfAssessment.findAll({
      where: {
        userId: userProfile.id,
        skillId: skill.id,
      },
      include: [
        {
          model: Meeting,
          as: "meeting",
          foreignKey: "meetingId",
          include: [
            {
              model: Profile,
              as: "initiatorProfile",
              foreignKey: "initiator",
              include: [
                {
                  model: WorkExperience,
                  required: false,
                  where: { currentCompany: true },
                },
              ],
            },
            {
              model: Profile,
              as: "acceptorProfile",
              foreignKey: "acceptor",
              include: [
                {
                  model: WorkExperience,
                  required: false,
                  where: { currentCompany: true },
                },
              ],
            },
          ],
        },
      ],
    });
    skill.dataValues.notes = saData;
    totalPoint = 0;
    for (let data of saData) {
      totalPoint += data.points;
    }
    skill.dataValues.totalPoint = totalPoint;
    skill.dataValues.averagePoint = saData.length
      ? totalPoint / saData.length
      : 0;
  }
  res.success(formattedProgress);
});

const switchEmailSubscription = asyncWrapper(async (req, res) => {
  const userProfile = res.locals.user;
  const { userId, status = true } = req.body;
  if (userId !== userProfile.id)
    return res.fail("You are not authorized for this profile");
  const found = await Profile.findByPk(userId);
  found.update({ unsubscribed: status });
  res.success(found);
});

const updateUserLastVisit = asyncWrapper(async (req, res) => {
  const userProfile = res.locals.user;
  const { lastVisit } = req.body;
  userProfile.update({ lastVisit });
  res.success("Success");
});

module.exports = {
  _getUserProfile,
  _getUserType,
  _updateUserProfile,
  _checkIfUserUnsubscribed,
  getAllUserData,
  getAllUserProfiles,
  getDashboardProfiles,
  createUser,
  getSingleUserProfile,
  updateUserProfile,
  deleteUser,
  deleteAllUser,
  checkProperty,
  getProgress,
  switchEmailSubscription,
  updateUserLastVisit,
};
