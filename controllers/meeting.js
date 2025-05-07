const { Op } = require("sequelize");
const asyncWrapper = require("../middlewares/async");
const { Meeting } = require("../models/meeting");
const { Profile } = require("../models/user");
const {
  _getAvailabilityById,
  _updateAvailabilityState,
  _getAvailabilityByBody,
} = require("./availability");
const { NOT_FOUND, UNPROCESSABLE_DATA } = require("../constants/errorCodes");
const {
  createEvent,
  createMeeting,
  deleteEvent,
} = require("../helpers/meeting");
const { WorkExperience } = require("../models/workExperience");
const MIXPANEL_TRACK = require("../helpers/mixpanel");

const _getUserProfile = async (userId) => {
  const found = await Profile.findByPk(userId);
  return found;
};

const _getUsersLastMeeting = async (userId) => {
  const today = new Date().getTime();

  const data = await Meeting.findOne({
    where: {
      [Op.and]: [
        {
          [Op.or]: [{ initiator: userId }, { acceptor: userId }],
        },
        {
          dayHour: {
            [Op.lte]: today,
          },
        },
      ],
    },
    order: [["dayHour", "DESC"]],
    limit: 1,
  });
  return data;
};

const getAllMeetingData = asyncWrapper(async (req, res) => {
  const data = await Meeting.findAll();
  res.success(data);
});

const getUsersMeetingData = asyncWrapper(async (req, res) => {
  const { userId } = req.params;
  const data = await Meeting.findAll({
    where: {
      [Op.and]: [
        {
          [Op.or]: [{ initiator: userId }, { acceptor: userId }],
        },
      ],
    },
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
    order: [["dayHour", "ASC"]],
  });
  res.success(data);
});

const createMeetingData = asyncWrapper(async (req, res) => {
  const { availabilityId, acceptorId } = req.body;
  const availabilityData = await _getAvailabilityById(availabilityId);
  if (!availabilityData)
    return res.fail("Availability data not found with this ID", NOT_FOUND);

  const acceptorProfile = await _getUserProfile(acceptorId);
  const initiatorProfile = await _getUserProfile(availabilityData.userId);

  const meetingData = await createMeeting();

  if (meetingData.error)
    return res.fail(`Meeting creation error: ${meetingData.error}`);

  // const meetingProps = {
  //   meetingLink: meetingData.meeting,
  //   initiatorUserName: initiatorProfile.dataValues.userName,
  //   initiatorUserId: initiatorProfile.dataValues.id,
  //   acceptorUserName: acceptorProfile.dataValues.userName,
  //   acceptorUserId: acceptorProfile.dataValues.id,
  // };

  // const createdEvent = await createEvent(
  //   initiatorProfile.dataValues.email,
  //   acceptorProfile.dataValues.email,
  //   availabilityData.dataValues,
  //   meetingProps
  // );

  // console.log("created event: ", createEvent);

  // if (!createdEvent.created) {
  //   if (createdEvent.redirect) {
  //     return res.fail(createdEvent.redirectUrl);
  //   } else {
  //     return res.fail(createdEvent.message);
  //   }
  // }

  const model = {
    initiator: availabilityData.userId,
    acceptor: acceptorId,
    dayHour: parseInt(availabilityData.dayHour),
    dayHourUTC: availabilityData.dayHourUTC,
    // event: createdEvent.eventLink,
    // eventId: createdEvent.eventId,
    meet: meetingData.meeting,
    practiceAreas: availabilityData.practiceAreas,
    interviewNote: availabilityData.interviewNote,
  };
  const meetingCreated = await Meeting.create(model);
  if (!meetingCreated)
    return res.fail("Meeting could not be created for this user");

  MIXPANEL_TRACK({
    name: "Interview Scheduled",
    data: {
      initiatorId: availabilityData.userId,
      acceptorId,
      interviewTime: availabilityData.dayHourUTC,
    },
    id: acceptorId,
  });

  const updated = await _updateAvailabilityState(availabilityId, "BOOKED");
  if (!updated)
    return res.fail(
      "Availability state could not be updated",
      UNPROCESSABLE_DATA
    );
  res.success({ ...meetingCreated.dataValues, initiatorProfile });
});

const cancelMeeting = asyncWrapper(async (req, res) => {
  const { meetingId, userId } = req.body;
  const found = await Meeting.findByPk(meetingId);
  if (!found) res.fail("Meeting data not found");
  const deletedEvent = await deleteEvent(found.eventId);
  if (!(deletedEvent && deletedEvent.removed))
    return res.fail("Meeting could not be deleted");
  await Meeting.destroy({ where: { id: meetingId } });
  if (userId === found.acceptor || userId === found.initiator) {
    const availability = await _getAvailabilityByBody({
      userId: found.initiator,
      dayHour: found.dayHour,
    });
    if (!availability) res.fail("Availability data not found");
    const updated = await _updateAvailabilityState(availability.id, "OPEN");
    if (!updated)
      res.fail("Availability state could not be updated", UNPROCESSABLE_DATA);
    found.destroy();
    res.success("Meeting cancelled");
  } else {
    res.fail("This meeting does not belong to you");
  }
});

const getSingleMeetingData = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const data = await Meeting.findOne({
    where: { id },
    include: [
      { model: Profile, as: "initiatorProfile", foreignKey: "initiator" },
      { model: Profile, as: "acceptorProfile", foreignKey: "acceptor" },
    ],
  });

  if (!data) res.fail("Meeting data not found");
  res.success(data);
});

const updateMeetingData = asyncWrapper(async (req, res) => {
  const { id, ...updatedFields } = req.body;

  if (Object.keys(updatedFields).length === 0)
    res.fail("No fields provided for update");

  const item = await Meeting.findByPk(id);
  if (!item) res.fail("Meeting data not found");

  const data = await item.update(updatedFields);
  if (!data) res.fail("Profession update failed");

  res.success(data);
});

const deleteSingleMeetingData = asyncWrapper(async (req, res) => {
  await Meeting.destroy({ where: { id: req.body.id } });
  res.success("Meeting data deleted");
});

const deleteAllMeetingData = asyncWrapper(async (req, res) => {
  await Meeting.destroy({ where: {} });
  res.success("Meeting table cleared");
});

module.exports = {
  _getUsersLastMeeting,
  getAllMeetingData,
  getUsersMeetingData,
  createMeetingData,
  getSingleMeetingData,
  updateMeetingData,
  cancelMeeting,
  deleteSingleMeetingData,
  deleteAllMeetingData,
};
