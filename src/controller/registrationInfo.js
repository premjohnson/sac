import { client } from '../config/connection.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
});

// ======================
// 🧾 1. Register a student for an event
// ======================
export const registerStudent = async (req, res) => {
  const { userId, eventId } = req.body;

  try {
    // ✅ Step 1: Check if the student is already registered for the event
    const existingCheck = await client.query(
      `SELECT * FROM registrations WHERE user_id = $1 AND event_id = $2`,
      [userId, eventId]
    );

    if (existingCheck.rowCount > 0) {
      return res.status(409).json({ error: "You have already registered for this event." });
    }

    // ✅ Step 2: Insert the registration
    const registrationResult = await client.query(
      `INSERT INTO registrations (user_id, event_id) VALUES ($1, $2) RETURNING *;`,
      [userId, eventId]
    );

    // ✅ Step 3: Get user email
    const userResult = await client.query(
      `SELECT username, email FROM users WHERE id = $1`,
      [userId]
    );
    const user = userResult.rows[0];

    // ✅ Step 4: Get event details
    const eventResult = await client.query(
      `SELECT title, date, mode, venue, meeting_link FROM events WHERE id = $1`,
      [eventId]
    );
    const event = eventResult.rows[0];

    // ✅ Step 5: Get other active events
    const otherEventsResult = await client.query(`
      SELECT title, registration_link 
      FROM events 
      WHERE id != $1 AND status = 'active'
      LIMIT 3;
    `, [eventId]);
    const otherEvents = otherEventsResult.rows;

    // ✅ Step 6: Build email content
    const subject = `✅ Registered: ${event.title}`;
    const eventDate = new Date(event.date).toLocaleString();
    const modeDetails = event.mode === 'offline'
      ? `📍 Venue: ${event.venue}`
      : `🌐 Online: ${event.meeting_link}`;

    let emailBody = `
Hi ${user.username},

🎉 You have successfully registered for the event: "${event.title}"!

📅 Date & Time: ${eventDate}  
${modeDetails}

We’re excited to see you there!

---

🔔 Here are a few other events you might be interested in:\n`;

    otherEvents.forEach(ev => {
      emailBody += `- ${ev.title}: ${ev.registration_link}\n`;
    });

    emailBody += `\nBest regards,\nMITS SAC Team`;

    // ✅ Step 7: Send confirmation email
    const mailOptions = {
      from: `"MITS SAC" <${process.env.GMAIL_USER}>`,
      to: user.email,
      subject,
      text: emailBody,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("❌ Email not sent:", err);
      } else {
        console.log("✅ Registration email sent:", info.response);
      }
    });

    // ✅ Final response
    res.status(201).json({ message: 'Registered successfully', data: registrationResult.rows[0] });

  } catch (err) {
    console.error("❌ Error in registerStudent:", err);
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
};



// 📋 2. Get all registered students for a specific event (for admin view)
export const getRegisteredStudents = async (req, res) => {
  const { eventId } = req.params;
  const query = `
    SELECT 
      u.id AS student_id,
      u.username,
      u.email,
      u.roll_number,
      r.registered_at,
      r.attendance_status
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    WHERE r.event_id = $1;
  `;
  try {
    const result = await client.query(query, [eventId]);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch registered students', details: err.message });
  }
};


// 🟢 3. Update attendance (admin marks 'present' or 'absent')
export const updateAttendance = async (req, res) => {
  const { registrationId } = req.params;
  const { status } = req.body; // 'present' or 'absent'

  try {
    const query = `
      UPDATE registrations
      SET attendance_status = $1
      WHERE id = $2
      RETURNING *;
    `;
    const result = await client.query(query, [status, registrationId]);
    res.status(200).json({ message: 'Attendance updated', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update attendance', details: err.message });
  }
};


// 📊 4. Student's personal event summary (for student dashboard)
export const getStudentEventSummary = async (req, res) => {
  const { studentId } = req.params;
  const query = `
    SELECT
      COUNT(DISTINCT e.id) AS total_events_conducted,
      COUNT(DISTINCT r.event_id) AS total_events_registered,
      COUNT(CASE WHEN r.attendance_status = 'present' THEN 1 END) AS total_events_present,
      COUNT(CASE WHEN r.attendance_status = 'absent' THEN 1 END) AS total_events_absent
    FROM events e
    LEFT JOIN registrations r ON e.id = r.event_id AND r.user_id = $1
    WHERE e.date <= NOW();
  `;
  try {
    const result = await client.query(query, [studentId]);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch student summary', details: err.message });
  }
};


// 📊 5. Admin’s event summary (how many students registered/present/absent for a specific event)
export const getAdminEventSummary = async (req, res) => {
  const { eventId } = req.params;
  const query = `
    SELECT
      e.id AS event_id,
      e.title,
      (SELECT COUNT(*) FROM users WHERE role = 'student') AS total_students,
      COUNT(r.user_id) AS total_registered,
      COUNT(CASE WHEN r.attendance_status = 'present' THEN 1 END) AS total_present,
      COUNT(CASE WHEN r.attendance_status = 'absent' THEN 1 END) AS total_absent
    FROM events e
    LEFT JOIN registrations r ON e.id = r.event_id
    WHERE e.id = $1
    GROUP BY e.id, e.title;
  `;
  try {
    const result = await client.query(query, [eventId]);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin summary', details: err.message });
  }
};


// 📊 6. Overall event summary for dashboard overview
export const getOverallEventSummary = async (req, res) => {
  const query = `
    SELECT
      COUNT(*) AS total_events_conducted,
      COUNT(CASE WHEN date < NOW() AND status != 'canceled' THEN 1 END) AS total_events_completed,
      COUNT(CASE WHEN date >= NOW() AND status != 'canceled' THEN 1 END) AS total_events_upcoming,
      COUNT(CASE WHEN status = 'canceled' THEN 1 END) AS total_events_canceled
    FROM events;
  `;
  try {
    const result = await client.query(query);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch overall summary', details: err.message });
  }
};