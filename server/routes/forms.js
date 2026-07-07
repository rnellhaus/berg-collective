import { Router } from 'express';
import { Resend } from 'resend';
import multer from 'multer';
import { put } from '@vercel/blob';
import { getPool } from '../db/connection.js';
import { verifyToken } from '../middleware/auth.js';
import { verifyTurnstile } from '../middleware/turnstile.js';

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

// Honeypot bot protection — silently accept but discard bot submissions
function rejectBot(req, res, next) {
  if (req.body?.company_url) {
    // Bot detected — return fake success
    return res.status(201).json({ message: 'Thank you!' });
  }
  next();
}

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
router.post('/membership', appUpload.single('application_file'), rejectBot, verifyTurnstile, async (req, res) => {
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
router.post('/individual-waitlist', rejectBot, verifyTurnstile, async (req, res) => {
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
router.post('/impact-download', rejectBot, verifyTurnstile, async (req, res) => {
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
router.post('/newsletter', rejectBot, async (req, res) => {
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
router.post('/contact', rejectBot, verifyTurnstile, async (req, res) => {
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
router.post('/volunteer', rejectBot, verifyTurnstile, async (req, res) => {
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

// ─── POST /api/forms/aisummit-openai — AI Summit: OpenAI ChatGPT Plus credit claim ───
router.post('/aisummit-openai', rejectBot, async (req, res) => {
  try {
    const { name, email, has_account, consent } = req.body;

    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

    if (!cleanName || !emailOk) {
      return res.status(400).json({ error: 'A valid full name and email are required.' });
    }
    if (!has_account || !consent) {
      return res.status(400).json({ error: 'Please confirm your OpenAI account and agree to share your email to continue.' });
    }

    const pool = getPool();

    // Dedupe by email within this form type — treat repeats as success.
    const { rows: existing } = await pool.query(
      `SELECT id FROM form_submissions
       WHERE form_type = 'aisummit_openai'
       AND LOWER(data::jsonb->>'email') = LOWER($1)
       LIMIT 1`,
      [cleanEmail]
    );
    if (existing.length > 0) {
      return res.status(200).json({ message: "You're all set — your email is already on the list." });
    }

    const data = {
      name: cleanName,
      email: cleanEmail,
      has_openai_account: true,
      consent_share_openai: true,
    };

    await pool.query(
      'INSERT INTO form_submissions (form_type, data) VALUES ($1, $2)',
      ['aisummit_openai', JSON.stringify(data)]
    );

    res.status(201).json({ message: "You're all set — OpenAI will apply your 3 months of ChatGPT Plus." });
  } catch (err) {
    console.error('AI Summit OpenAI claim error:', err);
    res.status(500).json({ error: 'Failed to submit. Please try again.' });
  }
});

// ─── AI Summit 2026 Pulse Survey ───
// Session keys shared with the survey page and results dashboard.
const SURVEY_SESSIONS = {
  thrive_knicks: 'How to Thrive like "Knicks in Five": Future-Proof Your Career in the Age of AI',
  death_of_app: 'The Death of the App and the Rise of Agents',
  ai_on_the_go: 'AI on the Go: Building Full-Featured Applications from Your Mobile Device',
  ai_native_company: 'Building an AI-Native Company: Reimagining How We Work',
  partnership_brain: 'From Campaigns to Systems: Build an AI Partnership Brain in 10 Minutes',
  differentiation: 'The Art of Differentiation: Standing Out in a Sea of Sameness',
  speed_of_thought: 'Speed of Thought: The Future of Entrepreneurship',
};

// ─── POST /api/forms/aisummit-survey — AI Summit post-event pulse survey ───
router.post('/aisummit-survey', rejectBot, async (req, res) => {
  try {
    const { name, email, rating_overall, nps, session_ratings, most_valuable, general_feedback, next_summit } = req.body;

    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
    if (!cleanName || !emailOk) {
      return res.status(400).json({ error: 'A valid full name and email are required.' });
    }

    const overall = Number(rating_overall);
    if (!Number.isInteger(overall) || overall < 1 || overall > 5) {
      return res.status(400).json({ error: 'Please rate the summit overall (1–5).' });
    }
    const npsScore = Number(nps);
    if (!Number.isInteger(npsScore) || npsScore < 0 || npsScore > 10) {
      return res.status(400).json({ error: 'Please answer how likely you are to recommend the summit (0–10).' });
    }

    const data = {
      name: cleanName,
      email: cleanEmail,
      rating_overall: overall,
      nps: npsScore,
    };

    // Session ratings are optional — only keep valid 1–5 values for known sessions.
    for (const key of Object.keys(SURVEY_SESSIONS)) {
      const val = Number(session_ratings?.[key]);
      if (Number.isInteger(val) && val >= 1 && val <= 5) {
        data[`session_${key}`] = val;
      }
    }

    const clip = (v) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 5000) : null);
    if (clip(most_valuable)) data.most_valuable = clip(most_valuable);
    if (clip(general_feedback)) data.general_feedback = clip(general_feedback);
    if (clip(next_summit)) data.next_summit = clip(next_summit);

    const pool = getPool();

    // One response per attendee — a repeat email replaces the earlier answers.
    const { rows: existing } = await pool.query(
      `SELECT id FROM form_submissions
       WHERE form_type = 'aisummit_survey'
       AND LOWER(data::jsonb->>'email') = LOWER($1)
       LIMIT 1`,
      [cleanEmail]
    );

    if (existing.length > 0) {
      await pool.query('UPDATE form_submissions SET data = $1 WHERE id = $2', [
        JSON.stringify(data),
        existing[0].id,
      ]);
      return res.status(200).json({ message: 'Your survey response has been updated. Thank you!' });
    }

    await pool.query(
      'INSERT INTO form_submissions (form_type, data) VALUES ($1, $2)',
      ['aisummit_survey', JSON.stringify(data)]
    );

    res.status(201).json({ message: 'Thank you — your feedback helps us shape the next AI Summit!' });
  } catch (err) {
    console.error('AI Summit survey error:', err);
    res.status(500).json({ error: 'Failed to submit. Please try again.' });
  }
});

// ─── Auth-protected admin endpoints ───

// ─── GET /api/forms/aisummit-survey/results — Admin: aggregated survey results ───
router.get('/aisummit-survey/results', verifyToken, async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT id, data, created_at FROM form_submissions
       WHERE form_type = 'aisummit_survey' ORDER BY created_at DESC`
    );

    const responses = rows.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      ...(typeof r.data === 'string' ? JSON.parse(r.data) : r.data || {}),
    }));

    const avg = (nums) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null);

    const overallRatings = responses.map((r) => Number(r.rating_overall)).filter(Number.isInteger);
    const npsScores = responses.map((r) => Number(r.nps)).filter(Number.isInteger);
    const promoters = npsScores.filter((n) => n >= 9).length;
    const detractors = npsScores.filter((n) => n <= 6).length;
    const npsValue = npsScores.length
      ? Math.round(((promoters - detractors) / npsScores.length) * 100)
      : null;

    const sessions = Object.entries(SURVEY_SESSIONS).map(([key, title]) => {
      const ratings = responses.map((r) => Number(r[`session_${key}`])).filter(Number.isInteger);
      return { key, title, count: ratings.length, average: avg(ratings) };
    });

    res.json({
      totalResponses: responses.length,
      overall: { average: avg(overallRatings), count: overallRatings.length },
      nps: { score: npsValue, count: npsScores.length, promoters, detractors },
      sessions,
      responses,
    });
  } catch (err) {
    console.error('AI Summit survey results error:', err);
    res.status(500).json({ error: 'Failed to fetch survey results' });
  }
});

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

// ─── GET /api/forms/submissions/export — Admin: export submissions as CSV ───
// Must be defined BEFORE /:id so it isn't matched as id="export".
router.get('/submissions/export', verifyToken, async (req, res) => {
  try {
    const pool = getPool();
    const { type, reviewed } = req.query;

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
    const { rows } = await pool.query(
      `SELECT * FROM form_submissions${where} ORDER BY created_at DESC`,
      params
    );

    // CSV escaper: wrap in quotes, double internal quotes
    const esc = (v) => {
      if (v == null) return '';
      const s = String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };

    let lines;
    if (type === 'aisummit_survey') {
      // Survey export: one column per question so answers are analyzable in a spreadsheet.
      const sessionKeys = Object.keys(SURVEY_SESSIONS);
      const headers = [
        'id', 'name', 'email', 'overall_rating', 'nps',
        ...sessionKeys.map((k) => `session: ${SURVEY_SESSIONS[k]}`),
        'most_valuable', 'general_feedback', 'next_summit', 'created_at',
      ];
      lines = [headers.map(esc).join(',')];
      for (const row of rows) {
        const data = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
        lines.push([
          esc(row.id),
          esc(data.name),
          esc(data.email),
          esc(data.rating_overall),
          esc(data.nps),
          ...sessionKeys.map((k) => esc(data[`session_${k}`])),
          esc(data.most_valuable),
          esc(data.general_feedback),
          esc(data.next_summit),
          esc(row.created_at),
        ].join(','));
      }
    } else {
      const headers = [
        'id', 'form_type', 'first_name', 'last_name', 'name', 'email',
        'phone', 'company', 'title', 'created_at', 'reviewed',
      ];
      lines = [headers.join(',')];

      for (const row of rows) {
        const data = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
        lines.push([
          esc(row.id),
          esc(row.form_type),
          esc(data.first_name),
          esc(data.last_name),
          esc(data.name),
          esc(data.email),
          esc(data.phone),
          esc(data.company),
          esc(data.title),
          esc(row.created_at),
          esc(row.reviewed ? 'yes' : 'no'),
        ].join(','));
      }
    }

    const filename = `berg-submissions-${type || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(lines.join('\n'));
  } catch (err) {
    console.error('Submissions export error:', err);
    res.status(500).json({ error: 'Failed to export submissions' });
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

// ─── DELETE /api/forms/submissions/:id — Admin: delete a submission ───
router.delete('/submissions/:id', verifyToken, async (req, res) => {
  try {
    const pool = getPool();
    const { rowCount } = await pool.query(
      'DELETE FROM form_submissions WHERE id = $1',
      [req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Submission not found' });
    res.json({ id: req.params.id, deleted: true });
  } catch (err) {
    console.error('Submission delete error:', err);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

export default router;
