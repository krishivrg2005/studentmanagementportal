# Student Management Portal

A clean and polished student management portal built with Node.js, Express, EJS, and a lightweight JSON data store.

## Features

- Student registration and profile management
- Course enrollment with seat limits
- Attendance tracking for faculty
- Marks and grade management
- Fee and payment record management
- Separate dashboards for admin, faculty, and students
- Login with role-based access control

## Quick Start

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Credentials

- Admin: `admin@studentportal.edu` / `Admin@123`
- Faculty: `faculty@studentportal.edu` / `Faculty@123`
- Student: `student@studentportal.edu` / `Student@123`

Additional demo users use the same role passwords:

- Faculty: `vikram.shah@studentportal.edu`, `meera.iyer@studentportal.edu`
- Students: `rohan.gupta@studentportal.edu`, `neha.kapoor@studentportal.edu`, `kunal.singh@studentportal.edu`, `ishita.nair@studentportal.edu`

## Notes

- Data is stored in `data/db.json`.
- If the database file does not exist, the app seeds sample university data automatically.
