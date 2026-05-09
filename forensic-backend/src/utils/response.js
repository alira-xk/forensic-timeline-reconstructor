const successResponse = (res, message, data = null, statusCode = 200) => {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(response);
};

const errorResponse = (res, message, statusCode = 500, code = null) => {
  const response = {
    success: false,
    message,
    data: null,
    timestamp: new Date().toISOString(),
  };
  if (code) response.code = code;
  return res.status(statusCode).json(response);
};

const paginatedResponse = (res, message, data, pagination) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination,
    timestamp: new Date().toISOString(),
  });
};

module.exports = { successResponse, errorResponse, paginatedResponse };
