// src/controllers/event.controller.js
import cloudinary from '../config/cloudinary.js';
import fs from 'fs';
import path from 'path';
import { client } from '../config/connection.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });


// Setup Nodemailer transporter inline
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
});


// ======================
//  Create Event
// ======================
export const createEvent = async (req, res) => {
  try {

    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create events' });
    }

    const {
      title, category, status, description1, description2, description3,
      venue, mode, meeting_link, date, registration_deadline,
      organizer, representative, phone_number_representative, email_representative,
      registration_link, maximum_participants
    } = req.body;

    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "At least one image is required" });
    }

    const uploadedUrls = [];

    for (const file of files) {
      const filePath = path.resolve(file.path);
      const stream = fs.createReadStream(filePath);

      const uploaded = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'events' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
          }
        );
        stream.pipe(uploadStream);
      });

      uploadedUrls.push(uploaded);
      fs.unlinkSync(filePath); // clean temp file
    }

    const query = `
      INSERT INTO events (
        title, category, status,
        description1, description2, description3,
        venue, mode, meeting_link,
        date, registration_deadline, organizer,
        representative, phone_number_representative, email_representative,
        registration_link, maximum_participants, images
      )
      VALUES (
        $1, $2, $3,
        $4, $5, $6,
        $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18
      )
      RETURNING id;
    `;

    const values = [
      title, category, status,
      description1, description2, description3,
      venue, mode, meeting_link,
      date, registration_deadline, organizer,
      representative, phone_number_representative, email_representative,
      registration_link, maximum_participants, uploadedUrls
    ];

    const result = await client.query(query, values);
    const newId = result.rows[0].id;

    res.status(201).json({
      message: "Event created successfully",
      eventId: newId,
      data: { ...req.body, images: uploadedUrls }
    });

    // Get all user emails
    const usersResult = await client.query(`SELECT email FROM users`);
    const userEmails = usersResult.rows.map(user => user.email);

    const emailSubject = `🎉 New Event Launched: ${title}`;
    const emailText = `
Hello,

A new event "${title}" has just been launched!

📅 Date: ${new Date(date).toLocaleString()}
📍 Mode: ${mode === 'offline' ? venue : `Online (${meeting_link})`}
📝 Description: ${description1 || ''}

Click below to register:
🔗 ${registration_link}

Best regards,  
MITS SAC Team
    `;

    const mailOptions = {
      from: `"MITS SAC Events" <${process.env.GMAIL_USER}>`,
      to: userEmails, // list of recipients
      subject: emailSubject,
      text: emailText,
    };

    // Send bulk email
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("❌ Failed to send email to users:", err);
      } else {
        console.log("✅ Notification emails sent:", info.response);
      }
    });

    res.status(201).json({
      message: "Event created successfully",
      eventId: newId,
      data: { ...req.body, images: uploadedUrls }
    });

  } catch (err) {
    console.error("❌ Error creating event:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


export const updateEventById = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update events' });
    }

    const eventId = req.params.id;

    // 📦 Get old event to extract previous images
    const oldEventQuery = `SELECT images FROM events WHERE id = $1;`;
    const oldEventResult = await client.query(oldEventQuery, [eventId]);
    if (oldEventResult.rowCount === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const oldImages = oldEventResult.rows[0].images || [];
    let uploadedUrls = oldImages; // default to existing images

    const files = req.files;
    if (files && files.length > 0) {
      // 🔥 Delete previous images from Cloudinary
      for (const url of oldImages) {
        if (url.includes('res.cloudinary.com')) {
          const publicId = url.split('/events/')[1]?.split('.')[0];
          if (publicId) {
            await cloudinary.uploader.destroy(`events/${publicId}`);
          }
        }
      }

      uploadedUrls = [];

      for (const file of files) {
        const filePath = path.resolve(file.path);
        const stream = fs.createReadStream(filePath);

        const uploaded = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'events' },
            (error, result) => {
              if (error) return reject(error);
              resolve(result.secure_url);
            }
          );
          stream.pipe(uploadStream);
        });

        uploadedUrls.push(uploaded);
        fs.unlinkSync(filePath); // cleanup
      }
    }

    // 🔄 Update Event in DB
    const {
      title, category, status, description1, description2, description3,
      venue, mode, meeting_link, date, registration_deadline,
      organizer, representative, phone_number_representative, email_representative,
      registration_link, maximum_participants
    } = req.body;

    const query = `
      UPDATE events
      SET title = $1, category = $2, status = $3,
          description1 = $4, description2 = $5, description3 = $6,
          venue = $7, mode = $8, meeting_link = $9,
          date = $10, registration_deadline = $11, organizer = $12,
          representative = $13, phone_number_representative = $14, email_representative = $15,
          registration_link = $16, maximum_participants = $17, images = $18
      WHERE id = $19;
    `;

    const values = [
      title, category, status,
      description1, description2, description3,
      venue, mode, meeting_link,
      date, registration_deadline, organizer,
      representative, phone_number_representative, email_representative,
      registration_link, maximum_participants, uploadedUrls,
      eventId
    ];

    await client.query(query, values);

    res.status(200).json({
      message: "Event updated successfully",
      eventId,
      data: { ...req.body, images: uploadedUrls }
    });

  } catch (err) {
    console.error("❌ Error updating event:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



// ======================
// Delete Event by ID (Only Admin)
// ======================

export const deleteEventById = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete events' });
    }

    const eventId = req.params.id;
    const query = "DELETE FROM events WHERE id = $1 RETURNING *;";
    const result = await client.query(query, [eventId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.status(200).json({ message: "Event deleted successfully", event: result.rows[0] });
  } catch (err) {
    console.error("❌ Error deleting event:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ======================
//  Get All Events
// ======================

export const getAllEvents = async (req, res) => {
  try {
    // await client.connect();
    const query = "SELECT * FROM events ORDER BY date DESC;";
    const result = await client.query(query);
    // await client.end();

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching events:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ======================
//  Get Event by ID
// ======================

export const getEventById = async (req, res) => {
  try {
    const eventId = req.params.id;
    const query = "SELECT * FROM events WHERE id = $1;";
    const result = await client.query(query, [eventId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error fetching event by ID:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const cancelEventById = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can cancel events' });
    }

    const eventId = req.params.id;

    // 🛑 Update event status
    const query = "UPDATE events SET status = 'cancelled' WHERE id = $1 RETURNING *;";
    const result = await client.query(query, [eventId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const cancelledEvent = result.rows[0];

    // 📧 Get all user emails
    const usersResult = await client.query(`SELECT username, email FROM users`);
    const userEmails = usersResult.rows.map(user => user.email);

    // 📩 HTML Email Content
    const emailSubject = `❌ Event Cancelled: ${cancelledEvent.title}`;
    const eventDate = new Date(cancelledEvent.date).toLocaleString();

    const emailHTML = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #d32f2f;">Event Cancelled</h2>
        <p>Dear Participant</p>

        <p>We regret to inform you that the event <b>"${cancelledEvent.title}"</b> has been <b style="color: red;">cancelled</b>.</p>

        <p><b>Original Date:</b> ${eventDate}</p>
        <p><b>Mode:</b> ${cancelledEvent.mode === 'offline' ? cancelledEvent.venue : `Online (${cancelledEvent.meeting_link})`}</p>

        <p>We apologize for any inconvenience caused due to this cancellation. Thank you for your understanding.</p>

        <h4>Need Help?</h4>
        <p>
          <b>Organizer:</b> ${cancelledEvent.organizer}<br/>
          <b>Representative:</b> ${cancelledEvent.representative}<br/>
          <b>Phone:</b> ${cancelledEvent.phone_number_representative}<br/>
          <b>Email:</b> ${cancelledEvent.email_representative}
        </p>

        <p>Warm regards,<br/>
        <b>MITS SAC Team</b></p>
      </div>
    `;

    const mailOptions = {
      from: `"MITS SAC Notifications" <${process.env.GMAIL_USER}>`,
      bcc: userEmails,
      subject: emailSubject,
      html: emailHTML,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("❌ Failed to send cancellation email:", err);
      } else {
        console.log("✅ 💀 Cancellation emails sent:", info.response);
      }
    });

    res.status(200).json({ message: "Event cancelled and users notified", event: cancelledEvent });

  } catch (err) {
    console.error("❌ Error cancelling event:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};





