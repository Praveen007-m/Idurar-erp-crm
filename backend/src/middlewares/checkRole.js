const checkRole = (roles) => {
  return (req, res, next) => {
    // req.admin holds the authenticated admin user
    if (!req.admin || !roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: insufficient role privileges',
      });
    }
    next();
  };
};

module.exports = checkRole;
