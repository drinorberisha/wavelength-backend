// This middleware attaches the Socket.IO server instance to the request object
module.exports = (io) => (req, res, next) => {
    req.io = io;
    next();
  };
  