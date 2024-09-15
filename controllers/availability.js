const { Op } = require("sequelize");
const asyncWrapper = require("../middlewares/async");
const {
  Availability,
  RecurrentAvailability,
} = require("../models/availability");
const { profileCompletionStatus } = require("../helpers/user");
const MIXPANEL_TRACK = require("../helpers/mixpanel");
const { getDateOfIndexDay } = require("../helpers/timeDate");
const { BAD_REQUEST } = require("../constants/errorCodes");

const _getAvailabilityById = async (id) => {
  const found = await Availability.findByPk(id);
  return found;
};

const _getAvailabilityByBody = async (body) => {
  const found = await Availability.findOne({ where: { ...body } });
  return found;
};

const _updateAvailabilityState = async (avaiabilityId, state) => {
  const found = await Availability.findOne({
    where: {
      id: avaiabilityId,
    },
  });
  return found.update({ state });
};

const _createAvailability = async (data, sendFailMessage = false) => {
  let error = { type: "error", message: "" };
  const found = await Availability.findOne({
    where: {
      userId: data.userId,
      dayHour: data.dayHour,
    },
  });
  if (found && sendFailMessage) {
    error.message = "Already added";
  }
  if (!found) {
    const created = await Availability.create(data);
    if (!created)
      error.message = "Availability data could not be created for this user";
    MIXPANEL_TRACK({
      name: "Availability Added",
      data: { avaiabilityId: created.id, availableTime: created.dayHourUTC },
      id: data.userId,
    });
    created.dataValues.completionStatus = await profileCompletionStatus(
      data.userId,
    );
    return created;
  } else return error;
};

const getAllAvailabilityData = asyncWrapper(async (req, res) => {
  const data = await Availability.findAll();
  res.success(data);
});

const getUserAvailability = asyncWrapper(async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.fail("Invalid user ID", BAD_REQUEST);
  const today = new Date().getTime();
  const data = await Availability.findAll({
    where: {
      userId,
      dayHour: {
        [Op.gte]: today,
      },
    },
    order: [["dayHour", "ASC"]],
  });
  // if (!data) res.fail("User availability data not found", NOT_FOUND);
  res.success(data);
});

const createAvailabilityData = asyncWrapper(async (req, res) => {
  const { userId, dayHourUTC, practiceAreas, interviewNote } = req.body;
  const dayHour = new Date(dayHourUTC).getTime();
  const model = {
    userId,
    dayHour,
    dayHourUTC,
    practiceAreas,
    interviewNote,
  };
  const created = await _createAvailability(model, true);
  if (created.type && created.type === "error") {
    res.fail(created.message);
  } else res.success(created);
});

const deleteAvailabilityData = asyncWrapper(async (req, res) => {
  const { avaiabilityId } = req.params;
  if (!avaiabilityId) return res.fail("Invalid availability ID", BAD_REQUEST);
  const found = await Availability.findOne({ where: { id: avaiabilityId } });
  found.destroy();
  MIXPANEL_TRACK({
    name: "Availability Deleted",
    data: { avaiabilityId },
    id: found.dataValues.userId,
  });
  const completionStatus = await profileCompletionStatus(found.userId);
  res.success(completionStatus);
});

const deleteAllAvailabilityData = asyncWrapper(async (req, res) => {
  await Availability.destroy({ where: {} });
  res.success("Availability table cleared");
});

const createRecurrentData = asyncWrapper(async (req, res) => {
  const { weekday, hour, practiceAreas, interviewNote, timezone } = req.body;
  const model = {
    weekday,
    hour,
    userId: res.locals.user.id,
    practiceAreas,
    interviewNote,
    timezone,
  };
  const createdRec = await RecurrentAvailability.create(model);
  if (!createdRec)
    return res.fail(
      "Recurrent Availability data could not be created for this user",
    );

  const dayHourUTC = getDateOfIndexDay(weekday, hour, timezone);
  const dayHour = dayHourUTC.getTime();
  const avlModel = {
    userId: res.locals.user.id,
    dayHour,
    dayHourUTC,
    practiceAreas,
    interviewNote,
    isRecurring: true,
  };
  const createdAvl = await _createAvailability(avlModel);
  if (createdAvl.type && createdAvl.type === "error") {
    res.fail(createdAvl.message);
  } else {
    res.success({
      recurrent: createdRec,
      availablity: createdAvl,
    });
  }
});

const getRecurrentData = asyncWrapper(async (req, res) => {
  const userId = res.locals.user.id;
  const data = await RecurrentAvailability.findAll({ where: { userId } });
  res.success(data);
});

const deleteRecurrentData = asyncWrapper(async (req, res) => {
  const { recurrentId } = req.params;
  if (!recurrentId) return res.fail("Invalid content ID", BAD_REQUEST);
  const found = await RecurrentAvailability.findOne({
    where: { id: recurrentId },
  });
  found.destroy();
  res.success("Deleted");
});

const generateAvailabilityFromRecurrent = async () => {
  const recurrents = await RecurrentAvailability.findAll();
  for (let occurence of recurrents) {
    const { userId, weekday, hour, practiceAreas, interviewNote, timezone } =
      occurence;
    const dayHourUTC = getDateOfIndexDay(weekday, hour, timezone);
    const dayHour = dayHourUTC.getTime();
    const model = {
      userId,
      dayHour,
      dayHourUTC,
      practiceAreas,
      interviewNote,
      isRecurring: true,
    };
    await _createAvailability(model);
  }
};

module.exports = {
  _getAvailabilityById,
  _getAvailabilityByBody,
  _updateAvailabilityState,
  getAllAvailabilityData,
  getUserAvailability,
  createAvailabilityData,
  deleteAvailabilityData,
  deleteAllAvailabilityData,
  createRecurrentData,
  getRecurrentData,
  deleteRecurrentData,
  generateAvailabilityFromRecurrent,
};
