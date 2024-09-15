const { SERVER_ERROR } = require("../constants/errorCodes");

class Response {
  constructor(data, statusCode = 200) {
    this.data = data;
    this.statusCode = statusCode;
    this.success = statusCode >= 200 && statusCode < 300;
  }
}

const successResponse = (res, data = {}, statusCode = 200) => {
  const response = new Response(data, statusCode);
  res.status(statusCode).json(response);
};

const failResponse = (
  res,
  data = "Internal Server Error",
  statusCode = SERVER_ERROR,
) => {
  const response = new Response(data, statusCode);
  res.status(statusCode).json(response);
};

const responseMiddleware = (req, res, next) => {
  res.success = (data, statusCode) => successResponse(res, data, statusCode);
  res.fail = (data, statusCode) => failResponse(res, data, statusCode);

  next();
};

module.exports = { responseMiddleware };
