const path = require("path");
const express = require("express");
const session = require("express-session");
const { hashPassword, verifyPassword } = require("./lib/auth");
const { readDb, writeDb, nextId, ensureDb } = require("./lib/store");
const { attachUser, requireAuth, requireRole } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;
const TODAY = new Date().toISOString().slice(0, 10);

ensureDb();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "student-portal-demo-secret",
    resave: false,
    saveUninitialized: false
  })
);
app.use((req, res, next) => {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.portalName = "Student Management Portal";
  next();
});
app.use(attachUser);

function setFlash(req, type, text) {
  req.session.flash = { type, text };
}

function getDashboardPath(user) {
  if (!user) return "/login";
  if (user.role === "admin") return "/admin/dashboard";
  if (user.role === "faculty") return "/faculty/dashboard";
  return "/student/dashboard";
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function computeLetterGrade(marks) {
  const score = Number(marks);
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  if (score >= 50) return "E";
  return "F";
}

function getStudentMetrics(db, studentId) {
  const enrollments = db.enrollments.filter((entry) => entry.studentId === studentId);
  const studentAttendance = db.attendance.filter((entry) => entry.studentId === studentId);
  const studentGrades = db.grades.filter((entry) => entry.studentId === studentId);
  const studentPayments = db.payments.filter((entry) => entry.studentId === studentId);
  const presentCount = studentAttendance.filter((entry) => entry.status === "Present").length;
  const attendanceRate = studentAttendance.length
    ? Math.round((presentCount / studentAttendance.length) * 100)
    : 0;
  const averageMarks = studentGrades.length
    ? Math.round(
        studentGrades.reduce((sum, entry) => sum + Number(entry.marks || 0), 0) / studentGrades.length
      )
    : 0;
  const pendingFees = studentPayments
    .filter((entry) => entry.status !== "Paid")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  return {
    enrolledCourses: enrollments.length,
    attendanceRate,
    averageMarks,
    pendingFees
  };
}

function enrichStudentCourses(db, studentId) {
  const courseMap = new Map(db.courses.map((course) => [course.id, course]));
  const facultyMap = new Map(db.faculty.map((member) => [member.id, member]));
  const grades = db.grades.filter((entry) => entry.studentId === studentId);
  const attendance = db.attendance.filter((entry) => entry.studentId === studentId);

  return db.enrollments
    .filter((entry) => entry.studentId === studentId)
    .map((entry) => {
      const course = courseMap.get(entry.courseId);
      const faculty = facultyMap.get(course?.facultyId);
      const courseGrades = grades.filter((grade) => grade.courseId === entry.courseId);
      const courseAttendance = attendance.filter((record) => record.courseId === entry.courseId);
      const presentCount = courseAttendance.filter((record) => record.status === "Present").length;

      return {
        ...entry,
        course,
        faculty,
        attendanceRate: courseAttendance.length
          ? Math.round((presentCount / courseAttendance.length) * 100)
          : 0,
        gradeAverage: courseGrades.length
          ? Math.round(
              courseGrades.reduce((sum, grade) => sum + Number(grade.marks || 0), 0) / courseGrades.length
            )
          : null,
        latestAssessment: courseGrades.sort((a, b) => b.updatedOn.localeCompare(a.updatedOn))[0] || null
      };
    })
    .sort((a, b) => a.course.code.localeCompare(b.course.code));
}

function buildAdminViewModel(db) {
  const facultyMap = new Map(db.faculty.map((member) => [member.id, member]));
  const studentMap = new Map(db.students.map((student) => [student.id, student]));

  const courses = db.courses
    .map((course) => ({
      ...course,
      facultyName: facultyMap.get(course.facultyId)?.name || "Unassigned",
      enrolledCount: db.enrollments.filter((entry) => entry.courseId === course.id).length
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const recentStudents = [...db.students]
    .sort((a, b) => b.joinedOn.localeCompare(a.joinedOn))
    .slice(0, 6);

  const payments = [...db.payments]
    .map((payment) => ({
      ...payment,
      studentName: studentMap.get(payment.studentId)?.name || "Unknown student",
      amountLabel: formatCurrency(payment.amount)
    }))
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
    .slice(0, 8);

  const stats = [
    { label: "Students", value: db.students.length, tone: "teal" },
    { label: "Faculty", value: db.faculty.length, tone: "amber" },
    { label: "Courses", value: db.courses.length, tone: "slate" },
    {
      label: "Pending Fees",
      value: formatCurrency(
        db.payments
          .filter((entry) => entry.status !== "Paid")
          .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
      ),
      tone: "rose"
    }
  ];

  return { stats, courses, recentStudents, payments };
}

function buildFacultyViewModel(db, facultyId) {
  const studentMap = new Map(db.students.map((student) => [student.id, student]));
  const courses = db.courses.filter((course) => course.facultyId === facultyId);

  const courseBundles = courses.map((course) => {
    const enrollments = db.enrollments.filter((entry) => entry.courseId === course.id);
    const students = enrollments.map((entry) => {
      const student = studentMap.get(entry.studentId);
      const attendanceRecords = db.attendance.filter(
        (record) => record.courseId === course.id && record.studentId === entry.studentId
      );
      const gradeRecords = db.grades.filter(
        (record) => record.courseId === course.id && record.studentId === entry.studentId
      );
      const presentCount = attendanceRecords.filter((record) => record.status === "Present").length;

      return {
        enrollmentId: entry.id,
        student,
        attendanceRate: attendanceRecords.length
          ? Math.round((presentCount / attendanceRecords.length) * 100)
          : 0,
        latestAttendance: attendanceRecords.sort((a, b) => b.date.localeCompare(a.date))[0] || null,
        latestGrade: gradeRecords.sort((a, b) => b.updatedOn.localeCompare(a.updatedOn))[0] || null
      };
    });

    return {
      ...course,
      students
    };
  });

  const allStudents = courseBundles.flatMap((bundle) => bundle.students);
  const recentGrades = [...db.grades]
    .filter((entry) => courses.some((course) => course.id === entry.courseId))
    .sort((a, b) => b.updatedOn.localeCompare(a.updatedOn))
    .slice(0, 5)
    .map((entry) => ({
      ...entry,
      studentName: studentMap.get(entry.studentId)?.name || "Unknown student",
      courseCode: courses.find((course) => course.id === entry.courseId)?.code || "Course"
    }));

  return {
    stats: [
      { label: "Assigned Courses", value: courses.length, tone: "teal" },
      { label: "Total Learners", value: allStudents.length, tone: "amber" },
      {
        label: "Avg. Attendance",
        value: allStudents.length
          ? `${Math.round(allStudents.reduce((sum, entry) => sum + entry.attendanceRate, 0) / allStudents.length)}%`
          : "0%",
        tone: "slate"
      }
    ],
    courseBundles,
    recentGrades
  };
}

function getFacultyByUserId(db, userId) {
  return db.faculty.find((entry) => entry.userId === userId);
}

function buildFacultyAttendanceRoster(db, facultyId, courseId, attendanceDate) {
  const course = db.courses.find((entry) => entry.id === courseId && entry.facultyId === facultyId);

  if (!course) {
    return null;
  }

  const studentMap = new Map(db.students.map((student) => [student.id, student]));
  const roster = db.enrollments
    .filter((entry) => entry.courseId === course.id)
    .map((entry) => {
      const student = studentMap.get(entry.studentId);
      const attendanceRecords = db.attendance.filter(
        (record) => record.courseId === course.id && record.studentId === entry.studentId
      );
      const attendanceForDate =
        attendanceRecords.find((record) => record.date === attendanceDate) || null;
      const presentCount = attendanceRecords.filter((record) => record.status === "Present").length;

      return {
        enrollmentId: entry.id,
        studentId: entry.studentId,
        student,
        registrationNumber: student?.rollNumber || "Not assigned",
        attendanceRate: attendanceRecords.length
          ? Math.round((presentCount / attendanceRecords.length) * 100)
          : 0,
        latestAttendance: [...attendanceRecords].sort((a, b) => b.date.localeCompare(a.date))[0] || null,
        hasRecordedAttendance: Boolean(attendanceForDate),
        selectedStatus: attendanceForDate?.status === "Absent" ? "Absent" : "Present"
      };
    })
    .sort((a, b) => (a.student?.name || "").localeCompare(b.student?.name || ""));

  const recordedToday = db.attendance.filter(
    (record) => record.courseId === course.id && record.date === attendanceDate
  );

  return {
    course,
    roster,
    dailySummary: {
      recordedCount: recordedToday.length,
      presentCount: recordedToday.filter((record) => record.status !== "Absent").length,
      absentCount: recordedToday.filter((record) => record.status === "Absent").length
    }
  };
}

app.get("/", (req, res) => {
  if (!req.currentUser) {
    return res.redirect("/login");
  }

  res.redirect(getDashboardPath(req.currentUser));
});

app.get("/login", (req, res) => {
  if (req.currentUser) {
    return res.redirect(getDashboardPath(req.currentUser));
  }

  res.render("login", {
    title: "Login",
    bodyClass: "auth-page"
  });
});

app.post("/login", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const db = readDb();
  const user = db.users.find((entry) => entry.email === email);

  if (!user || !verifyPassword(password, user)) {
    setFlash(req, "error", "Invalid email or password.");
    return res.redirect("/login");
  }

  req.session.userId = user.id;
  setFlash(req, "success", `Welcome back, ${user.name}.`);
  res.redirect(getDashboardPath(user));
});

app.get("/register", (req, res) => {
  res.render("register", {
    title: "Student Registration",
    bodyClass: "auth-page"
  });
});

app.post("/register", (req, res) => {
  const db = readDb();
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const rollNumber = String(req.body.rollNumber || "").trim();

  if (!name || !email || !password || !rollNumber) {
    setFlash(req, "error", "Name, email, password, and registration number are required.");
    return res.redirect("/register");
  }

  if (db.users.some((entry) => entry.email === email)) {
    setFlash(req, "error", "An account with that email already exists.");
    return res.redirect("/register");
  }

  const userId = nextId(db.users, "USR");
  const studentId = nextId(db.students, "STU");
  const { salt, passwordHash } = hashPassword(password);

  db.users.push({
    id: userId,
    name,
    email,
    role: "student",
    salt,
    passwordHash,
    linkedStudentId: studentId,
    createdAt: TODAY
  });

  db.students.push({
    id: studentId,
    userId,
    rollNumber,
    name,
    email,
    department: String(req.body.department || "General Studies").trim(),
    year: String(req.body.year || "1").trim(),
    phone: String(req.body.phone || "").trim(),
    guardianName: String(req.body.guardianName || "").trim(),
    joinedOn: TODAY
  });

  db.payments.push({
    id: nextId(db.payments, "PAY"),
    studentId,
    term: "Admission Fee",
    amount: 15000,
    status: "Pending",
    dueDate: TODAY,
    paidOn: "",
    method: "Pending",
    reference: ""
  });

  writeDb(db);
  setFlash(req, "success", "Registration completed. Please log in with your new student account.");
  res.redirect("/login");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

app.get("/dashboard", requireAuth, (req, res) => {
  res.redirect(getDashboardPath(req.currentUser));
});

app.get("/admin/dashboard", requireRole("admin"), (req, res) => {
  const db = readDb();
  const view = buildAdminViewModel(db);

  res.render("admin-dashboard", {
    title: "Admin Dashboard",
    bodyClass: "dashboard-page",
    ...view,
    facultyOptions: db.faculty,
    students: db.students
  });
});

app.post("/admin/faculty/create", requireRole("admin"), (req, res) => {
  const db = readDb();
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!name || !email || !password) {
    setFlash(req, "error", "Faculty name, email, and temporary password are required.");
    return res.redirect("/admin/dashboard");
  }

  if (db.users.some((entry) => entry.email === email)) {
    setFlash(req, "error", "A user with that email already exists.");
    return res.redirect("/admin/dashboard");
  }

  const userId = nextId(db.users, "USR");
  const facultyId = nextId(db.faculty, "FAC");
  const { salt, passwordHash } = hashPassword(password);

  db.users.push({
    id: userId,
    name,
    email,
    role: "faculty",
    linkedFacultyId: facultyId,
    salt,
    passwordHash,
    createdAt: TODAY
  });

  db.faculty.push({
    id: facultyId,
    userId,
    employeeId: String(req.body.employeeId || facultyId).trim(),
    name,
    email,
    department: String(req.body.department || "General").trim(),
    title: String(req.body.title || "Lecturer").trim()
  });

  writeDb(db);
  setFlash(req, "success", "Faculty member created successfully.");
  res.redirect("/admin/dashboard");
});

app.post("/admin/courses/create", requireRole("admin"), (req, res) => {
  const db = readDb();
  const code = String(req.body.code || "").trim().toUpperCase();
  const title = String(req.body.title || "").trim();

  if (!code || !title) {
    setFlash(req, "error", "Course code and title are required.");
    return res.redirect("/admin/dashboard");
  }

  if (db.courses.some((entry) => entry.code === code)) {
    setFlash(req, "error", "That course code already exists.");
    return res.redirect("/admin/dashboard");
  }

  db.courses.push({
    id: nextId(db.courses, "CRS"),
    code,
    title,
    department: String(req.body.department || "General").trim(),
    credits: Number(req.body.credits || 3),
    semester: String(req.body.semester || "Spring 2026").trim(),
    capacity: Number(req.body.capacity || 40),
    facultyId: String(req.body.facultyId || "").trim(),
    description: String(req.body.description || "").trim()
  });

  writeDb(db);
  setFlash(req, "success", "Course created and published.");
  res.redirect("/admin/dashboard");
});

app.post("/admin/payments/create", requireRole("admin"), (req, res) => {
  const db = readDb();
  const studentId = String(req.body.studentId || "").trim();

  if (!studentId || !db.students.some((student) => student.id === studentId)) {
    setFlash(req, "error", "Select a valid student for the fee record.");
    return res.redirect("/admin/dashboard");
  }

  db.payments.push({
    id: nextId(db.payments, "PAY"),
    studentId,
    term: String(req.body.term || "Fee Record").trim(),
    amount: Number(req.body.amount || 0),
    status: String(req.body.status || "Pending").trim(),
    dueDate: String(req.body.dueDate || TODAY).trim(),
    paidOn: String(req.body.paidOn || "").trim(),
    method: String(req.body.method || "Pending").trim(),
    reference: String(req.body.reference || "").trim()
  });

  writeDb(db);
  setFlash(req, "success", "Fee record saved.");
  res.redirect("/admin/dashboard");
});

app.post("/admin/payments/:paymentId/status", requireRole("admin"), (req, res) => {
  const db = readDb();
  const payment = db.payments.find((entry) => entry.id === req.params.paymentId);

  if (!payment) {
    setFlash(req, "error", "Fee record not found.");
    return res.redirect("/admin/dashboard");
  }

  payment.status = String(req.body.status || payment.status).trim();
  payment.paidOn = payment.status === "Paid" ? TODAY : "";
  payment.method = payment.status === "Paid" ? String(req.body.method || "Manual Update").trim() : "Pending";
  writeDb(db);
  setFlash(req, "success", "Fee status updated.");
  res.redirect("/admin/dashboard");
});

app.get("/faculty/dashboard", requireRole("faculty"), (req, res) => {
  const db = readDb();
  const faculty = getFacultyByUserId(db, req.currentUser.id);

  if (!faculty) {
    setFlash(req, "error", "Faculty profile not found.");
    return res.redirect("/logout");
  }

  res.render("faculty-dashboard", {
    title: "Faculty Dashboard",
    bodyClass: "dashboard-page",
    faculty,
    today: TODAY,
    ...buildFacultyViewModel(db, faculty.id)
  });
});

app.get("/faculty/courses/:courseId/attendance", requireRole("faculty"), (req, res) => {
  const db = readDb();
  const faculty = getFacultyByUserId(db, req.currentUser.id);
  const courseId = String(req.params.courseId || "").trim();
  const attendanceDate = String(req.query.date || TODAY).trim();

  if (!faculty) {
    setFlash(req, "error", "Faculty profile not found.");
    return res.redirect("/logout");
  }

  const rosterView = buildFacultyAttendanceRoster(db, faculty.id, courseId, attendanceDate);

  if (!rosterView) {
    setFlash(req, "error", "Attendance roster not found for that course.");
    return res.redirect("/faculty/dashboard");
  }

  res.render("faculty-attendance", {
    title: "Attendance Roster",
    bodyClass: "dashboard-page",
    faculty,
    attendanceDate,
    ...rosterView
  });
});

app.post("/faculty/courses/:courseId/attendance", requireRole("faculty"), (req, res) => {
  const db = readDb();
  const faculty = getFacultyByUserId(db, req.currentUser.id);
  const courseId = String(req.params.courseId || "").trim();
  const attendanceDate = String(req.body.date || TODAY).trim();

  if (!faculty) {
    setFlash(req, "error", "Faculty profile not found.");
    return res.redirect("/logout");
  }

  const course = db.courses.find((entry) => entry.id === courseId && entry.facultyId === faculty.id);

  if (!course) {
    setFlash(req, "error", "Unable to open attendance roster for that course.");
    return res.redirect("/faculty/dashboard");
  }

  const statuses = req.body.statuses && typeof req.body.statuses === "object" ? req.body.statuses : {};
  const enrollments = db.enrollments.filter((entry) => entry.courseId === courseId);

  enrollments.forEach((enrollment) => {
    const selectedStatus = String(statuses[enrollment.studentId] || "Absent").trim();
    const normalizedStatus = selectedStatus === "Absent" ? "Absent" : "Present";
    const existing = db.attendance.find(
      (entry) =>
        entry.courseId === courseId &&
        entry.studentId === enrollment.studentId &&
        entry.date === attendanceDate
    );

    if (existing) {
      existing.status = normalizedStatus;
      return;
    }

    db.attendance.push({
      id: nextId(db.attendance, "ATT"),
      enrollmentId: enrollment.id,
      courseId,
      studentId: enrollment.studentId,
      date: attendanceDate,
      status: normalizedStatus
    });
  });

  writeDb(db);
  setFlash(req, "success", "Attendance roster saved.");
  res.redirect(`/faculty/courses/${courseId}/attendance?date=${encodeURIComponent(attendanceDate)}`);
});

app.post("/faculty/attendance", requireRole("faculty"), (req, res) => {
  const db = readDb();
  const faculty = getFacultyByUserId(db, req.currentUser.id);
  const courseId = String(req.body.courseId || "").trim();
  const studentId = String(req.body.studentId || "").trim();
  const date = String(req.body.date || TODAY).trim();

  const course = db.courses.find((entry) => entry.id === courseId && entry.facultyId === faculty?.id);
  const enrollment = db.enrollments.find(
    (entry) => entry.courseId === courseId && entry.studentId === studentId
  );

  if (!course || !enrollment) {
    setFlash(req, "error", "Unable to record attendance for that student/course combination.");
    return res.redirect("/faculty/dashboard");
  }

  const existing = db.attendance.find(
    (entry) => entry.courseId === courseId && entry.studentId === studentId && entry.date === date
  );

  if (existing) {
    existing.status = String(req.body.status || existing.status).trim();
  } else {
    db.attendance.push({
      id: nextId(db.attendance, "ATT"),
      enrollmentId: enrollment.id,
      courseId,
      studentId,
      date,
      status: String(req.body.status || "Present").trim()
    });
  }

  writeDb(db);
  setFlash(req, "success", "Attendance updated.");
  res.redirect("/faculty/dashboard");
});

app.post("/faculty/grades", requireRole("faculty"), (req, res) => {
  const db = readDb();
  const faculty = getFacultyByUserId(db, req.currentUser.id);
  const courseId = String(req.body.courseId || "").trim();
  const studentId = String(req.body.studentId || "").trim();
  const assessment = String(req.body.assessment || "").trim();
  const marks = Number(req.body.marks || 0);

  const course = db.courses.find((entry) => entry.id === courseId && entry.facultyId === faculty?.id);
  const enrollment = db.enrollments.find(
    (entry) => entry.courseId === courseId && entry.studentId === studentId
  );

  if (!course || !enrollment || !assessment) {
    setFlash(req, "error", "Assessment name, course, and student are required.");
    return res.redirect("/faculty/dashboard");
  }

  const gradeLetter = computeLetterGrade(marks);
  const existing = db.grades.find(
    (entry) =>
      entry.courseId === courseId &&
      entry.studentId === studentId &&
      entry.assessment.toLowerCase() === assessment.toLowerCase()
  );

  if (existing) {
    existing.marks = marks;
    existing.gradeLetter = gradeLetter;
    existing.updatedOn = TODAY;
  } else {
    db.grades.push({
      id: nextId(db.grades, "GRD"),
      enrollmentId: enrollment.id,
      courseId,
      studentId,
      assessment,
      marks,
      gradeLetter,
      updatedOn: TODAY
    });
  }

  writeDb(db);
  setFlash(req, "success", "Grades saved.");
  res.redirect("/faculty/dashboard");
});

app.get("/student/dashboard", requireRole("student"), (req, res) => {
  const db = readDb();
  const student = db.students.find((entry) => entry.userId === req.currentUser.id);

  if (!student) {
    setFlash(req, "error", "Student profile not found.");
    return res.redirect("/logout");
  }

  const enrolledCourses = enrichStudentCourses(db, student.id);
  const enrolledCourseIds = new Set(enrolledCourses.map((entry) => entry.courseId));
  const facultyMap = new Map(db.faculty.map((member) => [member.id, member]));
  const availableCourses = db.courses
    .filter((course) => !enrolledCourseIds.has(course.id))
    .map((course) => ({
      ...course,
      facultyName: facultyMap.get(course.facultyId)?.name || "Unassigned",
      enrolledCount: db.enrollments.filter((entry) => entry.courseId === course.id).length
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const payments = [...db.payments]
    .filter((entry) => entry.studentId === student.id)
    .map((payment) => ({ ...payment, amountLabel: formatCurrency(payment.amount) }))
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate));

  res.render("student-dashboard", {
    title: "Student Dashboard",
    bodyClass: "dashboard-page",
    student,
    metrics: getStudentMetrics(db, student.id),
    enrolledCourses,
    availableCourses,
    payments
  });
});

app.post("/student/profile", requireRole("student"), (req, res) => {
  const db = readDb();
  const student = db.students.find((entry) => entry.userId === req.currentUser.id);

  if (!student) {
    setFlash(req, "error", "Student profile not found.");
    return res.redirect("/student/dashboard");
  }

  student.phone = String(req.body.phone || "").trim();
  student.guardianName = String(req.body.guardianName || "").trim();
  student.department = String(req.body.department || student.department).trim();
  student.year = String(req.body.year || student.year).trim();
  student.name = String(req.body.name || student.name).trim();

  const user = db.users.find((entry) => entry.id === req.currentUser.id);
  if (user) {
    user.name = student.name;
  }

  writeDb(db);
  setFlash(req, "success", "Profile updated.");
  res.redirect("/student/dashboard");
});

app.post("/student/enroll", requireRole("student"), (req, res) => {
  const db = readDb();
  const student = db.students.find((entry) => entry.userId === req.currentUser.id);
  const courseId = String(req.body.courseId || "").trim();
  const course = db.courses.find((entry) => entry.id === courseId);

  if (!student || !course) {
    setFlash(req, "error", "Course not found.");
    return res.redirect("/student/dashboard");
  }

  const alreadyEnrolled = db.enrollments.some(
    (entry) => entry.studentId === student.id && entry.courseId === courseId
  );
  const currentCount = db.enrollments.filter((entry) => entry.courseId === courseId).length;

  if (alreadyEnrolled) {
    setFlash(req, "error", "You are already enrolled in that course.");
    return res.redirect("/student/dashboard");
  }

  if (currentCount >= Number(course.capacity || 0)) {
    setFlash(req, "error", "That course is already at capacity.");
    return res.redirect("/student/dashboard");
  }

  db.enrollments.push({
    id: nextId(db.enrollments, "ENR"),
    studentId: student.id,
    courseId,
    status: "Enrolled",
    enrolledOn: TODAY
  });

  writeDb(db);
  setFlash(req, "success", `You have been enrolled in ${course.code}.`);
  res.redirect("/student/dashboard");
});

app.post("/student/withdraw", requireRole("student"), (req, res) => {
  const db = readDb();
  const student = db.students.find((entry) => entry.userId === req.currentUser.id);
  const courseId = String(req.body.courseId || "").trim();

  if (!student || !courseId) {
    setFlash(req, "error", "Course not found.");
    return res.redirect("/student/dashboard");
  }

  const enrollment = db.enrollments.find(
    (entry) => entry.studentId === student.id && entry.courseId === courseId
  );

  if (!enrollment) {
    setFlash(req, "error", "You are not enrolled in that course.");
    return res.redirect("/student/dashboard");
  }

  const course = db.courses.find((entry) => entry.id === courseId);

  db.enrollments = db.enrollments.filter((entry) => entry.id !== enrollment.id);
  db.attendance = db.attendance.filter((entry) => entry.enrollmentId !== enrollment.id);
  db.grades = db.grades.filter((entry) => entry.enrollmentId !== enrollment.id);

  writeDb(db);
  setFlash(req, "success", `You have withdrawn from ${course?.code || "the course"}.`);
  res.redirect("/student/dashboard");
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Student Management Portal is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
