const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const { buildStaffFilter }  = require('@/helpers/staffFilter');

const create  = require('./create');
const summary = require('./summary');
const update  = require('./update');
const remove  = require('./remove');
const sendMail = require('./sendMail');

function modelController() {
  const Model   = mongoose.model('Payment');
  const methods = createCRUDController('Payment');

  const escapePdfText = (value = '') =>
    String(value)
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');

  const buildSimplePdfBuffer = (lines = []) => {
    const sanitizedLines = lines.filter(Boolean).slice(0, 30);
    const content = [
      'BT',
      '/F1 18 Tf',
      '50 780 Td',
      `(Payment Receipt) Tj`,
      '/F1 11 Tf',
      '0 -28 Td',
      ...sanitizedLines.flatMap((line, index) => {
        const prefix = index === 0 ? [] : ['0 -18 Td'];
        return [...prefix, `(${escapePdfText(line)}) Tj`];
      }),
      'ET',
    ].join('\n');

    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
      `5 0 obj\n<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream\nendobj`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];

    objects.forEach((object) => {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += `${object}\n`;
    });

    const xrefOffset = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, 'utf8');
  };

  // ── list ────────────────────────────────────────────────────────────────
  methods.list = async (req, res) => {
    try {
      const page  = parseInt(req.query.page,  10) || 1;
      const limit = parseInt(req.query.items, 10) || 10;
      const skip  = page * limit - limit;

      const { sortBy = 'created', sortValue = -1, filter, equal, from, to } = req.query;

      const staffFilter   = await buildStaffFilter(req.admin, 'client');
      const fieldsArray   = req.query.fields ? req.query.fields.split(',') : [];
      let fields          = fieldsArray.length === 0 ? {} : { $or: [] };

      for (const field of fieldsArray) {
        fields.$or.push({ [field]: { $regex: new RegExp(req.query.q, 'i') } });
      }

      let filterQuery = { removed: false, ...fields };

      if (filter && equal) filterQuery = { ...filterQuery, [filter]: equal };

      // ── Date range filter ──────────────────────────────────────────────
      if (from && to) {
        const fromDate = new Date(from);
        const toDate   = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        if (!isNaN(fromDate) && !isNaN(toDate)) {
          filterQuery.date = { $gte: fromDate, $lte: toDate };
        }
      }

      filterQuery = { ...filterQuery, ...staffFilter };

      const [result, count] = await Promise.all([
        Model.find(filterQuery)
          .skip(skip).limit(limit)
          .sort({ [sortBy]: sortValue })
          .populate()
          .exec(),
        Model.countDocuments(filterQuery),
      ]);

      const pages      = Math.ceil(count / limit);
      const pagination = { page, pages, count };

      if (count > 0) {
        return res.status(200).json({ success: true, result, pagination, message: 'Successfully found all documents' });
      }
      return res.status(203).json({ success: true, result: [], pagination, message: 'Collection is Empty' });
    } catch (error) {
      return res.status(500).json({ success: false, result: null, message: error.message, error });
    }
  };

  // ── export CSV — GET /api/payment/export?from=YYYY-MM-DD&to=YYYY-MM-DD ──
  methods.exportCsv = async (req, res) => {
    try {
      const { from, to } = req.query;
      const staffFilter  = await buildStaffFilter(req.admin, 'client');

      let filterQuery = { removed: false, ...staffFilter };

      if (from && to) {
        const fromDate = new Date(from);
        const toDate   = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        if (!isNaN(fromDate) && !isNaN(toDate)) {
          filterQuery.date = { $gte: fromDate, $lte: toDate };
        }
      }

      const payments = await Model.find(filterQuery)
        .sort({ date: -1 })
        .populate('client',      'name')
        .populate('paymentMode', 'name')
        .exec();

      // ── Build CSV ────────────────────────────────────────────────────────
      const header = ['Number', 'Client', 'Amount', 'Date', 'Payment Mode', 'Reference', 'Description'];
      const rows   = payments.map((p) => [
        p.number                                                          ?? '',
        p.client?.name                                                    ?? '',
        p.amount                                                          ?? 0,
        p.date ? new Date(p.date).toISOString().split('T')[0]            : '',
        typeof p.paymentMode === 'string' ? p.paymentMode
          : p.paymentMode?.name                                          ?? '',
        p.ref                                                             ?? '',
        p.description                                                     ?? '',
      ]);

      const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv    = [header, ...rows].map((r) => r.map(escape).join(',')).join('\n');
      const label  = from && to ? `${from}-to-${to}` : 'all';

      res.setHeader('Content-Type',        'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="payments-${label}.csv"`);
      return res.status(200).send('\uFEFF' + csv); // BOM for Excel UTF-8
    } catch (error) {
      return res.status(500).json({ success: false, result: null, message: error.message });
    }
  };

  // ── update ──────────────────────────────────────────────────────────────
  methods.update = async (req, res) => {
    try {
      const staffFilter = await buildStaffFilter(req.admin, 'client');
      const result = await Model.findOneAndUpdate(
        { _id: req.params.id, removed: false, ...staffFilter },
        req.body,
        { new: true, runValidators: true }
      ).exec();

      if (!result) return res.status(404).json({ success: false, result: null, message: 'No document found' });
      return res.status(200).json({ success: true, result, message: 'Successfully updated Payment' });
    } catch (error) {
      return res.status(500).json({ success: false, result: null, message: error.message, error });
    }
  };

  // ── delete ──────────────────────────────────────────────────────────────
  methods.delete = async (req, res) => {
    try {
      const staffFilter = await buildStaffFilter(req.admin, 'client');
      const result = await Model.findOneAndUpdate(
        { _id: req.params.id, removed: false, ...staffFilter },
        { removed: true },
        { new: true }
      ).exec();

      if (!result) return res.status(404).json({ success: false, result: null, message: 'No document found' });
      return res.status(200).json({ success: true, result, message: 'Successfully deleted Payment' });
    } catch (error) {
      return res.status(500).json({ success: false, result: null, message: error.message, error });
    }
  };

  // ── read ────────────────────────────────────────────────────────────────
  methods.read = async (req, res) => {
    try {
      const staffFilter = await buildStaffFilter(req.admin, 'client');
      const result = await Model.findOne(
        { _id: req.params.id, removed: false, ...staffFilter }
      ).populate().exec();

      if (!result) return res.status(404).json({ success: false, result: null, message: 'No document found' });
      return res.status(200).json({ success: true, result, message: 'Successfully found document' });
    } catch (error) {
      return res.status(500).json({ success: false, result: null, message: error.message, error });
    }
  };

  // ── download PDF ─────────────────────────────────────────────────────────
  methods.download = async (req, res) => {
    try {
      const staffFilter = await buildStaffFilter(req.admin, 'client');
      const result      = await Model.findOne(
        { _id: req.params.id, removed: false, ...staffFilter }
      ).populate().exec();

      if (!result) return res.status(404).json({ success: false, result: null, message: 'Payment not found' });

      const fileId          = `payment-${result._id}.pdf`;
      const paymentMode = typeof result.paymentMode === 'string'
        ? result.paymentMode
        : result.paymentMode?.name || '-';
      const reference = result.ref || result.reference?._id || '-';
      const paymentDate = result.date
        ? new Date(result.date).toLocaleDateString('en-GB')
        : '-';
      const amount = Number(result.amount || 0).toFixed(2);

      const pdfBuffer = buildSimplePdfBuffer([
        `Receipt Number: ${result.number || '-'}/${result.year || ''}`.replace(/\/$/, ''),
        `Date: ${paymentDate}`,
        `Client: ${result.client?.name || '-'}`,
        `Phone: ${result.client?.phone || '-'}`,
        `Email: ${result.client?.email || '-'}`,
        `Address: ${result.client?.address || '-'}`,
        `Amount Paid: ${amount}`,
        `Payment Mode: ${paymentMode}`,
        `Reference: ${reference}`,
        `Description: ${result.description || '-'}`,
      ]);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileId}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.status(200).send(pdfBuffer);
    } catch (error) {
      return res.status(500).json({ success: false, result: null, message: error.message, error });
    }
  };

  methods.mail    = sendMail;
  methods.create  = create;
  methods.update  = update;
  methods.delete  = remove;
  methods.summary = summary;

  return methods;
}

module.exports = modelController();
