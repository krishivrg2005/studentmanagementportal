const { readDb } = require("../lib/store");

function attachUser(req, res, next) {
  res.locals.currentUser = null;

  if (!req.session?.userId) {
    return next();
  }

  const db = readDb();
  const user = db.users.find((entry) => entry.id === req.session.userId);

  if (!user) {
    req.session.destroy(() => next());
    return;
  }

  req.currentUser = user;
  res.locals.currentUser = user;
  next();
}

function requireAuth(req, res, next) {
  if (!req.currentUser) {
    req.session.flash = { type: "error", text: "Please log in to continue." };
    return res.redirect("/login");
  }

  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.currentUser) {
      req.session.flash = { type: "error", text: "Please log in to continue." };
      return res.redirect("/login");
    }

    if (req.currentUser.role !== role) {
      req.session.flash = { type: "error", text: "You do not have access to that page." };
      return res.redirect("/dashboard");
    }

    next();
  };
}

module.exports = {
  attachUser,
  requireAuth,
  requireRole
};
