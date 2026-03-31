import { Router } from 'express';
import { Resend } from 'resend';
import multer from 'multer';
import { put } from '@vercel/blob';
import { getPool } from '../db/connection.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// Resend client — set RESEND_API_KEY env var to enable email sending
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = 'BERG Collective <info@bergcollective.org>';
const TO_EMAIL = 'rich@bergcollective.org';
const CC_EMAIL = 'jazmine@bergcollective.org';

// File upload for application attachments (memory storage → Vercel Blob)
const appUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Helper: send email via Resend
async function sendFormEmail(subject, htmlBody, replyTo) {
  if (!resend) {
    console.log('[Resend] No API key — email not sent. Subject:', subject);
    return false;
  }
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      cc: CC_EMAIL,
      replyTo: replyTo || undefined,
      subject,
      html: htmlBody,
    });
    return true;
  } catch (err) {
    console.error('[Resend] Failed to send:', err);
    return false;
  }
}

// Helper: format form data as HTML email
function formatEmailHtml(title, fields) {
  const rows = fields
    .map(([label, value]) => {
      const val = value || '<em style="color:#999">Not provided</em>';
      return `<tr><td style="padding:8px 12px;font-weight:600;color:#333;vertical-align:top;white-space:nowrap;border-bottom:1px solid #eee;">${label}</td><td style="padding:8px 12px;color:#555;border-bottom:1px solid #eee;white-space:pre-line;">${val}</td></tr>`;
    })
    .join('');

  return `
    <div style="font-family:'Nunito',Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#000;padding:24px 32px;">
        <h1 style="color:#D4AF37;font-size:18px;margin:0;">BERG Collective</h1>
      </div>
      <div style="padding:24px 32px;">
        <h2 style="color:#000;font-size:20px;margin:0 0 20px;">${title}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>
      </div>
      <div style="padding:16px 32px;background:#f5f5f5;font-size:12px;color:#999;">
        Submitted via bergcollective.org
      </div>
    </div>
  `;
}

// ─── POST /api/forms/membership — Membership Application ───
router.post('/membership', appUpload.single('application_file'), async (req, res) => {
  try {
    const data = req.body;
    const pool = getPool();

    let fileUrl = null;
    if (req.file) {
      const blob = await put(
        `applications/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
        req.file.buffer,
        {
          access: 'public',
          contentType: req.file.mimetype,
        }
      );
      fileUrl = blob.url;
    }

    const submission = {
      ...data,
      application_file: req.file ? req.file.originalname : null,
    };

    const { rows } = await pool.query(
      'INSERT INTO form_submissions (form_type, data, file_path) VALUES ($1, $2, $3) RETURNING id',
      ['membership', JSON.stringify(submission), fileUrl]
    );
    const insertedId = rows[0].id;

    const emailFields = [
      ['First Name', data.first_name],
      ['Last Name', data.last_name],
      ['Title', data.title],
      ['Company', data.company],
      ['ERG', data.erg],
      ['Phone', data.phone],
      ['Email', data.email],
      ['In existence 2+ years?', data.existence_2_years],
      ['How does your company embody the Collective ERG Mission?', data.mission_statement],
      ['How does your ERG engage the pillars?', data.pillars_engagement],
      ['Diversity strides in next few years?', data.diversity_strides],
      ['What would it mean to be part of the Collective?', data.part_of_collective],
      ['Next quarterly ERG event idea?', data.event_idea],
      ['Resources to contribute?', data.resources],
      ['Additional Message', data.message],
      ['Application File', req.file ? req.file.originalname : 'None'],
    ];

    const sent = await sendFormEmail(
      `New Membership Application: ${data.company || 'Unknown Company'}`,
      formatEmailHtml('New Membership Application', emailFields),
      data.email
    );

    await pool.query('UPDATE form_submissions SET email_sent = $1 WHERE id = $2', [sent ? 1 : 0, insertedId]);

    res.status(201).json({ message: 'Application submitted successfully', id: insertedId });
  } catch (err) {
    console.error('Membership form error:', err);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// ─── POST /api/forms/individual-waitlist — Individual Membership Waitlist ───
router.post('/individual-waitlist', async (req, res) => {
  try {
    const { name, email, company, title: jobTitle, linkedin, reason } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const pool = getPool();
    const data = { name, email, company, title: jobTitle, linkedin, reason };

    const { rows } = await pool.query(
      'INSERT INTO form_submissions (form_type, data) VALUES ($1, $2) RETURNING id',
      ['individual_waitlist', JSON.stringify(data)]
    );
    const insertedId = rows[0].id;

    const emailFields = [
      ['Name', name],
      ['Email', email],
      ['Company', company],
      ['Job Title', jobTitle],
      ['LinkedIn', linkedin],
      ['Reason for Joining', reason],
    ];

    const sent = await sendFormEmail(
      `Individual Membership Waitlist: ${name}${company ? ` (${company})` : ''}`,
      formatEmailHtml('Individual Membership Waitlist Signup', emailFields),
      email
    );

    await pool.query('UPDATE form_submissions SET email_sent = $1 WHERE id = $2', [sent ? 1 : 0, insertedId]);

    res.status(201).json({ message: 'Successfully joined the waitlist!' });
  } catch (err) {
    console.error('Individual waitlist error:', err);
    res.status(500).json({ error: 'Failed to join waitlist' });
  }
});

// ─── POST /api/forms/impact-download — Impact Report Download Gate ───
router.post('/impact-download', async (req, res) => {
  try {
    const { name, email, company, title: jobTitle, linkedin } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const pool = getPool();
    const data = { name, email, company, title: jobTitle, linkedin };

    const { rows } = await pool.query(
      'INSERT INTO form_submissions (form_type, data) VALUES ($1, $2) RETURNING id',
      ['impact_download', JSON.stringify(data)]
    );
    const insertedId = rows[0].id;

    const emailFields = [
      ['Name', name],
      ['Email', email],
      ['Company', company],
      ['Title', jobTitle],
      ['LinkedIn', linkedin],
    ];

    const sent = await sendFormEmail(
      `Impact Report Downloaded: ${name} (${company || 'N/A'})`,
      formatEmailHtml('Impact Report Download Request', emailFields),
      email
    );

    await pool.query('UPDATE form_submissions SET email_sent = $1 WHERE id = $2', [sent ? 1 : 0, insertedId]);

    res.status(201).json({ message: 'Thank you! Your download will begin shortly.', id: insertedId });
  } catch (err) {
    console.error('Impact download form error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// ─── POST /api/forms/newsletter — Newsletter Signup ───
router.post('/newsletter', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const pool = getPool();

    // Check if already subscribed
    const { rows: existing } = await pool.query(
      'SELECT id FROM newsletter_subscribers WHERE email = $1',
      [email]
    );
    if (existing.length > 0) {
      return res.json({ message: 'You\'re already subscribed!' });
    }

    await pool.query('INSERT INTO newsletter_subscribers (email) VALUES ($1)', [email]);

    // TODO: Add Mailchimp API integration here when API key is provided
    // const mailchimp = require('@mailchimp/mailchimp_marketing');
    // mailchimp.setConfig({ apiKey: process.env.MAILCHIMP_API_KEY, server: 'usX' });
    // await mailchimp.lists.addListMember(process.env.MAILCHIMP_LIST_ID, {
    //   email_address: email,
    //   status: 'subscribed',
    // });

    res.status(201).json({ message: 'Successfully subscribed to our newsletter!' });
  } catch (err) {
    console.error('Newsletter signup error:', err);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// ─── POST /api/forms/contact — Contact Form ───
router.post('/contact', async (req, res) => {
  try {
    const { first_name, last_name, email, subject, message } = req.body;

    if (!email || !message) {
      return res.status(400).json({ error: 'Email and message are required' });
    }

    const pool = getPool();
    const data = { first_name, last_name, email, subject, message };

    const { rows } = await pool.query(
      'INSERT INTO form_submissions (form_type, data) VALUES ($1, $2) RETURNING id',
      ['contact', JSON.stringify(data)]
    );
    const insertedId = rows[0].id;

    const emailFields = [
      ['Name', `${first_name || ''} ${last_name || ''}`.trim()],
      ['Email', email],
      ['Subject', subject],
      ['Message', message],
    ];

    const sent = await sendFormEmail(
      `Contact Form: ${subject || 'General Inquiry'}`,
      formatEmailHtml('New Contact Form Submission', emailFields),
      email
    );

    await pool.query('UPDATE form_submissions SET email_sent = $1 WHERE id = $2', [sent ? 1 : 0, insertedId]);

    res.status(201).json({ message: 'Message sent successfully!' });
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ─── POST /api/forms/volunteer — Volunteer Signup ───
router.post('/volunteer', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, company, area_of_interest, availability, message } = req.body;

    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }

    const pool = getPool();
    const data = { first_name, last_name, email, phone, company, area_of_interest, availability, message };

    const { rows } = await pool.query(
      'INSERT INTO form_submissions (form_type, data) VALUES ($1, $2) RETURNING id',
      ['volunteer', JSON.stringify(data)]
    );
    const insertedId = rows[0].id;

    const emailFields = [
      ['Name', `${first_name} ${last_name}`],
      ['Email', email],
      ['Phone', phone],
      ['Company / Organization', company],
      ['Area of Interest', area_of_interest],
      ['Availability', availability],
      ['Message', message],
    ];

    // Send to volunteer coordinators
    let sent = false;
    if (resend) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: ['elena@bergcollective.org', 'jazmine@bergcollective.org'],
          replyTo: email,
          subject: `New Volunteer Signup: ${first_name} ${last_name}${company ? ` (${company})` : ''}`,
          html: formatEmailHtml('New Volunteer Signup', emailFields),
        });
        sent = true;
      } catch (err) {
        console.error('[Resend] Failed to send volunteer email:', err);
      }
    } else {
      console.log('[Resend] No API key — volunteer email not sent.');
    }

    await pool.query('UPDATE form_submissions SET email_sent = $1 WHERE id = $2', [sent ? 1 : 0, insertedId]);

    res.status(201).json({ message: 'Thank you for signing up to volunteer! We\'ll be in touch soon.' });
  } catch (err) {
    console.error('Volunteer form error:', err);
    res.status(500).json({ error: 'Failed to submit volunteer signup' });
  }
});

// ─── Auth-protected admin endpoints ───

// ─── GET /api/forms/submissions — Admin: list submissions with filtering & pagination ───
router.get('/submissions', verifyToken, async (req, res) => {
  try {
    const pool = getPool();
    const { type, reviewed, sort = 'newest', page = '1', limit = '25' } = req.query;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (type) {
      conditions.push(`form_type = $${paramIdx++}`);
      params.push(type);
    }
    if (reviewed === '1' || reviewed === '0') {
      conditions.push(`reviewed = $${paramIdx++}`);
      params.push(Number(reviewed));
    }

    const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = sort === 'oldest' ? ' ORDER BY created_at ASC' : ' ORDER BY created_at DESC';

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const offset = (pageNum - 1) * limitNum;

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) as total FROM form_submissions${where}`,
      params
    );
    const total = Number(countRows[0].total);

    const { rows: submissions } = await pool.query(
      `SELECT * FROM form_submissions${where}${orderBy} LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limitNum, offset]
    );

    const parsed = submissions.map(s => ({
      ...s,
      data: typeof s.data === 'string' ? JSON.parse(s.data) : s.data,
    }));

    res.json({
      submissions: parsed,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error('Submissions list error:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// ─── GET /api/forms/submissions/stats — Admin: submission counts ───
router.get('/submissions/stats', verifyToken, async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT form_type, COUNT(*) as count, SUM(CASE WHEN reviewed = 0 THEN 1 ELSE 0 END) as unreviewed
       FROM form_submissions GROUP BY form_type`
    );

    const total = rows.reduce((sum, r) => sum + Number(r.count), 0);
    const totalUnreviewed = rows.reduce((sum, r) => sum + Number(r.unreviewed), 0);

    res.json({ total, totalUnreviewed, byType: rows });
  } catch (err) {
    console.error('Submissions stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── GET /api/forms/submissions/:id — Admin: single submission ───
router.get('/submissions/:id', verifyToken, async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM form_submissions WHERE id = $1',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Submission not found' });

    const submission = rows[0];
    res.json({ ...submission, data: typeof submission.data === 'string' ? JSON.parse(submission.data) : submission.data });
  } catch (err) {
    console.error('Submission fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

// ─── PATCH /api/forms/submissions/:id/review — Admin: toggle reviewed status ───
router.patch('/submissions/:id/review', verifyToken, async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM form_submissions WHERE id = $1',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Submission not found' });

    const submission = rows[0];
    const newReviewed = submission.reviewed ? 0 : 1;
    const reviewedAt = newReviewed ? new Date().toISOString() : null;

    await pool.query(
      'UPDATE form_submissions SET reviewed = $1, reviewed_at = $2 WHERE id = $3',
      [newReviewed, reviewedAt, req.params.id]
    );

    res.json({ id: submission.id, reviewed: newReviewed, reviewed_at: reviewedAt });
  } catch (err) {
    console.error('Submission review toggle error:', err);
    res.status(500).json({ error: 'Failed to update review status' });
  }
});

export default router;
