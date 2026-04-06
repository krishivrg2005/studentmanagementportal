const fs = require("fs");
const path = require("path");
const { hashPassword } = require("../lib/auth");

const DB_PATH = path.join(__dirname, "db.json");

function createUser(id, name, email, role, password, extra = {}) {
  return {
    id,
    name,
    email: email.toLowerCase(),
    role,
    ...hashPassword(password),
    createdAt: "2026-03-01",
    ...extra
  };
}

function createSeedData() {
  const adminUser = createUser("USR001", "Aarav Mehta", "admin@studentportal.edu", "admin", "Admin@123");
  const facultyUserOne = createUser(
    "USR002",
    "Dr. Nisha Rao",
    "faculty@studentportal.edu",
    "faculty",
    "Faculty@123",
    { linkedFacultyId: "FAC001" }
  );
  const facultyUserTwo = createUser(
    "USR003",
    "Prof. Vikram Shah",
    "vikram.shah@studentportal.edu",
    "faculty",
    "Faculty@123",
    { linkedFacultyId: "FAC002" }
  );
  const facultyUserThree = createUser(
    "USR004",
    "Dr. Meera Iyer",
    "meera.iyer@studentportal.edu",
    "faculty",
    "Faculty@123",
    { linkedFacultyId: "FAC003" }
  );
  const studentUserOne = createUser(
    "USR005",
    "Aanya Verma",
    "student@studentportal.edu",
    "student",
    "Student@123",
    { linkedStudentId: "STU001" }
  );
  const studentUserTwo = createUser(
    "USR006",
    "Rohan Gupta",
    "rohan.gupta@studentportal.edu",
    "student",
    "Student@123",
    { linkedStudentId: "STU002" }
  );
  const studentUserThree = createUser(
    "USR007",
    "Neha Kapoor",
    "neha.kapoor@studentportal.edu",
    "student",
    "Student@123",
    { linkedStudentId: "STU003" }
  );
  const studentUserFour = createUser(
    "USR008",
    "Kunal Singh",
    "kunal.singh@studentportal.edu",
    "student",
    "Student@123",
    { linkedStudentId: "STU004" }
  );
  const studentUserFive = createUser(
    "USR009",
    "Ishita Nair",
    "ishita.nair@studentportal.edu",
    "student",
    "Student@123",
    { linkedStudentId: "STU005" }
  );

  return {
    meta: {
      universityName: "Student Management Portal",
      seededAt: new Date().toISOString()
    },
    users: [
      adminUser,
      facultyUserOne,
      facultyUserTwo,
      facultyUserThree,
      studentUserOne,
      studentUserTwo,
      studentUserThree,
      studentUserFour,
      studentUserFive
    ],
    students: [
      {
        id: "STU001",
        userId: "USR005",
        rollNumber: "24CSE101",
        name: "Aanya Verma",
        email: "student@studentportal.edu",
        department: "Computer Science and Engineering",
        year: "2",
        phone: "+91 98765 41011",
        guardianName: "Sonal Verma",
        joinedOn: "2024-07-15"
      },
      {
        id: "STU002",
        userId: "USR006",
        rollNumber: "23CSE058",
        name: "Rohan Gupta",
        email: "rohan.gupta@studentportal.edu",
        department: "Computer Science and Engineering",
        year: "3",
        phone: "+91 98989 11022",
        guardianName: "Madhav Gupta",
        joinedOn: "2023-07-18"
      },
      {
        id: "STU003",
        userId: "USR007",
        rollNumber: "24MBA032",
        name: "Neha Kapoor",
        email: "neha.kapoor@studentportal.edu",
        department: "Business Administration",
        year: "2",
        phone: "+91 98111 22334",
        guardianName: "Ritu Kapoor",
        joinedOn: "2024-08-01"
      },
      {
        id: "STU004",
        userId: "USR008",
        rollNumber: "25ECE017",
        name: "Kunal Singh",
        email: "kunal.singh@studentportal.edu",
        department: "Electronics and Communication",
        year: "1",
        phone: "+91 98222 33445",
        guardianName: "Ajay Singh",
        joinedOn: "2025-07-22"
      },
      {
        id: "STU005",
        userId: "USR009",
        rollNumber: "22DS044",
        name: "Ishita Nair",
        email: "ishita.nair@studentportal.edu",
        department: "Data Science",
        year: "4",
        phone: "+91 98333 44556",
        guardianName: "Latha Nair",
        joinedOn: "2022-07-11"
      }
    ],
    faculty: [
      {
        id: "FAC001",
        userId: "USR002",
        employeeId: "EMP-CS-110",
        name: "Dr. Nisha Rao",
        email: "faculty@studentportal.edu",
        department: "Computer Science",
        title: "Associate Professor"
      },
      {
        id: "FAC002",
        userId: "USR003",
        employeeId: "EMP-MG-204",
        name: "Prof. Vikram Shah",
        email: "vikram.shah@studentportal.edu",
        department: "Management",
        title: "Assistant Professor"
      },
      {
        id: "FAC003",
        userId: "USR004",
        employeeId: "EMP-EC-318",
        name: "Dr. Meera Iyer",
        email: "meera.iyer@studentportal.edu",
        department: "Electronics",
        title: "Associate Professor"
      }
    ],
    courses: [
      {
        id: "CRS001",
        code: "CS301",
        title: "Data Structures and Algorithms",
        department: "Computer Science",
        credits: 4,
        semester: "Spring 2026",
        capacity: 45,
        facultyId: "FAC001",
        description: "Core course covering advanced problem solving, trees, graphs, and dynamic programming."
      },
      {
        id: "CRS002",
        code: "CS325",
        title: "Web Engineering",
        department: "Computer Science",
        credits: 3,
        semester: "Spring 2026",
        capacity: 40,
        facultyId: "FAC001",
        description: "Frontend and backend web application development with deployment workflows."
      },
      {
        id: "CRS003",
        code: "BA210",
        title: "Financial Accounting",
        department: "Management",
        credits: 3,
        semester: "Spring 2026",
        capacity: 50,
        facultyId: "FAC002",
        description: "Foundational accounting principles, ledgers, statements, and reporting analysis."
      },
      {
        id: "CRS004",
        code: "EC220",
        title: "Digital Systems",
        department: "Electronics",
        credits: 4,
        semester: "Spring 2026",
        capacity: 48,
        facultyId: "FAC003",
        description: "Boolean algebra, combinational logic, sequential circuits, and system design."
      },
      {
        id: "CRS005",
        code: "DS401",
        title: "Machine Learning Lab",
        department: "Data Science",
        credits: 3,
        semester: "Spring 2026",
        capacity: 35,
        facultyId: "FAC001",
        description: "Applied machine learning workflows using Python, feature engineering, and model evaluation."
      }
    ],
    enrollments: [
      {
        id: "ENR001",
        studentId: "STU001",
        courseId: "CRS001",
        status: "Enrolled",
        enrolledOn: "2026-01-08"
      },
      {
        id: "ENR002",
        studentId: "STU001",
        courseId: "CRS002",
        status: "Enrolled",
        enrolledOn: "2026-01-08"
      },
      {
        id: "ENR003",
        studentId: "STU002",
        courseId: "CRS002",
        status: "Enrolled",
        enrolledOn: "2026-01-09"
      },
      {
        id: "ENR004",
        studentId: "STU003",
        courseId: "CRS003",
        status: "Enrolled",
        enrolledOn: "2026-01-10"
      },
      {
        id: "ENR005",
        studentId: "STU004",
        courseId: "CRS004",
        status: "Enrolled",
        enrolledOn: "2026-01-11"
      },
      {
        id: "ENR006",
        studentId: "STU005",
        courseId: "CRS001",
        status: "Enrolled",
        enrolledOn: "2026-01-08"
      },
      {
        id: "ENR007",
        studentId: "STU005",
        courseId: "CRS005",
        status: "Enrolled",
        enrolledOn: "2026-01-08"
      },
      {
        id: "ENR008",
        studentId: "STU002",
        courseId: "CRS005",
        status: "Enrolled",
        enrolledOn: "2026-01-12"
      }
    ],
    attendance: [
      {
        id: "ATT001",
        enrollmentId: "ENR001",
        courseId: "CRS001",
        studentId: "STU001",
        date: "2026-03-10",
        status: "Present"
      },
      {
        id: "ATT002",
        enrollmentId: "ENR001",
        courseId: "CRS001",
        studentId: "STU001",
        date: "2026-03-12",
        status: "Present"
      },
      {
        id: "ATT003",
        enrollmentId: "ENR002",
        courseId: "CRS002",
        studentId: "STU001",
        date: "2026-03-11",
        status: "Late"
      },
      {
        id: "ATT004",
        enrollmentId: "ENR003",
        courseId: "CRS002",
        studentId: "STU002",
        date: "2026-03-14",
        status: "Present"
      },
      {
        id: "ATT005",
        enrollmentId: "ENR004",
        courseId: "CRS003",
        studentId: "STU003",
        date: "2026-03-14",
        status: "Present"
      },
      {
        id: "ATT006",
        enrollmentId: "ENR005",
        courseId: "CRS004",
        studentId: "STU004",
        date: "2026-03-15",
        status: "Late"
      },
      {
        id: "ATT007",
        enrollmentId: "ENR006",
        courseId: "CRS001",
        studentId: "STU005",
        date: "2026-03-16",
        status: "Present"
      },
      {
        id: "ATT008",
        enrollmentId: "ENR007",
        courseId: "CRS005",
        studentId: "STU005",
        date: "2026-03-18",
        status: "Present"
      },
      {
        id: "ATT009",
        enrollmentId: "ENR008",
        courseId: "CRS005",
        studentId: "STU002",
        date: "2026-03-18",
        status: "Absent"
      }
    ],
    grades: [
      {
        id: "GRD001",
        enrollmentId: "ENR001",
        courseId: "CRS001",
        studentId: "STU001",
        assessment: "Midterm",
        marks: 88,
        gradeLetter: "A-",
        updatedOn: "2026-03-14"
      },
      {
        id: "GRD002",
        enrollmentId: "ENR002",
        courseId: "CRS002",
        studentId: "STU001",
        assessment: "Project Sprint 1",
        marks: 92,
        gradeLetter: "A",
        updatedOn: "2026-03-15"
      },
      {
        id: "GRD003",
        enrollmentId: "ENR003",
        courseId: "CRS002",
        studentId: "STU002",
        assessment: "UI Prototype",
        marks: 85,
        gradeLetter: "B+",
        updatedOn: "2026-03-16"
      },
      {
        id: "GRD004",
        enrollmentId: "ENR004",
        courseId: "CRS003",
        studentId: "STU003",
        assessment: "Quiz 1",
        marks: 81,
        gradeLetter: "B+",
        updatedOn: "2026-03-16"
      },
      {
        id: "GRD005",
        enrollmentId: "ENR005",
        courseId: "CRS004",
        studentId: "STU004",
        assessment: "Logic Design Test",
        marks: 78,
        gradeLetter: "B",
        updatedOn: "2026-03-17"
      },
      {
        id: "GRD006",
        enrollmentId: "ENR006",
        courseId: "CRS001",
        studentId: "STU005",
        assessment: "Midterm",
        marks: 91,
        gradeLetter: "A",
        updatedOn: "2026-03-18"
      },
      {
        id: "GRD007",
        enrollmentId: "ENR007",
        courseId: "CRS005",
        studentId: "STU005",
        assessment: "Lab Assignment 1",
        marks: 94,
        gradeLetter: "A",
        updatedOn: "2026-03-19"
      },
      {
        id: "GRD008",
        enrollmentId: "ENR008",
        courseId: "CRS005",
        studentId: "STU002",
        assessment: "Lab Assignment 1",
        marks: 87,
        gradeLetter: "A-",
        updatedOn: "2026-03-19"
      }
    ],
    payments: [
      {
        id: "PAY001",
        studentId: "STU001",
        term: "Spring 2026 Tuition",
        amount: 82500,
        status: "Paid",
        dueDate: "2026-01-20",
        paidOn: "2026-01-18",
        method: "UPI",
        reference: "UPI-24819"
      },
      {
        id: "PAY002",
        studentId: "STU001",
        term: "Transport Fee",
        amount: 12000,
        status: "Pending",
        dueDate: "2026-04-05",
        paidOn: "",
        method: "Pending",
        reference: ""
      },
      {
        id: "PAY003",
        studentId: "STU002",
        term: "Spring 2026 Tuition",
        amount: 84000,
        status: "Paid",
        dueDate: "2026-01-22",
        paidOn: "2026-01-20",
        method: "Net Banking",
        reference: "TXN-84021"
      },
      {
        id: "PAY004",
        studentId: "STU003",
        term: "Spring 2026 Tuition",
        amount: 79000,
        status: "Pending",
        dueDate: "2026-03-28",
        paidOn: "",
        method: "Bank Transfer",
        reference: ""
      },
      {
        id: "PAY005",
        studentId: "STU004",
        term: "Admission Fee",
        amount: 45000,
        status: "Paid",
        dueDate: "2026-01-15",
        paidOn: "2026-01-10",
        method: "Card",
        reference: "CARD-55219"
      },
      {
        id: "PAY006",
        studentId: "STU005",
        term: "Spring 2026 Tuition",
        amount: 91000,
        status: "Pending",
        dueDate: "2026-04-12",
        paidOn: "",
        method: "Pending",
        reference: ""
      }
    ]
  };
}

if (require.main === module) {
  fs.writeFileSync(DB_PATH, JSON.stringify(createSeedData(), null, 2));
  console.log(`Seeded database at ${DB_PATH}`);
}

module.exports = {
  createSeedData,
  DB_PATH
};
