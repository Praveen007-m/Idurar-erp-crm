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

  const splitPdfLine = (label, value, maxChars = 44) => {
    const fullText = `${label}: ${value || '-'}`;
    if (fullText.length <= maxChars) return [fullText];

    const words = fullText.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach((word) => {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (candidate.length > maxChars && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    });

    if (currentLine) lines.push(currentLine);
    return lines;
  };

  const buildSimplePdfBuffer = ({ receiptInfo = [], clientDetails = [], paymentDetails = [], totalAmount = '-' }) => {
    const drawTextBlock = (font, size, x, y, lines, rgb = '0 0 0') => {
      const output = [`BT`, `${rgb} rg`, `/${font} ${size} Tf`, `${x} ${y} Td`];
      lines.forEach((line, index) => {
        if (index > 0) output.push('0 -16 Td');
        output.push(`(${escapePdfText(line)}) Tj`);
      });
      output.push('ET');
      return output;
    };

    const normalizedReceipt = receiptInfo.flatMap(({ label, value }) => splitPdfLine(label, value));
    const normalizedClient = clientDetails.flatMap(({ label, value }) => splitPdfLine(label, value));
    const normalizedPayment = paymentDetails.flatMap(({ label, value }) => splitPdfLine(label, value));

    const content = [
      '0.96 0.97 0.98 rg',
      '0 0 595 842 re',
      'f',

      '1 1 1 rg',
      '36 48 523 746 re',
      'f',

      '0.09 0.56 1 rg',
      '36 730 523 64 re',
      'f',

      '0.09 0.56 1 rg',
      '36 48 523 746 re',
      '1.2 w',
      'S',

      ...drawTextBlock('F2', 24, 56, 768, ['Payment Receipt'], '1 1 1'),
      ...drawTextBlock('F1', 11, 56, 748, ['Professional payment acknowledgement'], '0.90 0.96 1'),

      '0.95 0.97 1 rg',
      '56 650 220 64 re',
      'f',
      '0.89 0.94 0.99 rg',
      '319 650 220 136 re',
      'f',
      '0.95 0.97 1 rg',
      '56 500 220 136 re',
      'f',
      '0.89 0.94 0.99 rg',
      '319 500 220 136 re',
      'f',

      ...drawTextBlock('F2', 12, 68, 694, ['Receipt Info'], '0.09 0.56 1'),
      ...drawTextBlock('F1', 10.5, 68, 674, normalizedReceipt, '0.15 0.18 0.24'),

      ...drawTextBlock('F2', 12, 331, 766, ['Company'], '0.09 0.56 1'),
      ...drawTextBlock('F1', 10.5, 331, 746, [
        'SS Finance',
        'Reliable payment confirmation',
        'Generated from the ERP system',
      ], '0.15 0.18 0.24'),

      ...drawTextBlock('F2', 12, 68, 616, ['Client Details'], '0.09 0.56 1'),
      ...drawTextBlock('F1', 10.5, 68, 596, normalizedClient, '0.15 0.18 0.24'),

      ...drawTextBlock('F2', 12, 331, 616, ['Payment Details'], '0.09 0.56 1'),
      ...drawTextBlock('F1', 10.5, 331, 596, normalizedPayment, '0.15 0.18 0.24'),

      '0.94 0.98 0.95 rg',
      '56 410 483 66 re',
      'f',
      '0.13 0.55 0.13 rg',
      '56 410 483 66 re',
      '1.2 w',
      'S',
      ...drawTextBlock('F2', 12, 72, 450, ['Total Amount Paid'], '0.13 0.45 0.13'),
      ...drawTextBlock('F2', 22, 72, 426, [totalAmount], '0.10 0.55 0.10'),

      ...drawTextBlock('F1', 9.5, 56, 84, ['This receipt was generated automatically by the payment system.'], '0.45 0.50 0.58'),
    ].join('\n');

    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj',
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj',
      `6 0 obj\n<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream\nendobj`,
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

      const pdfBuffer = buildSimplePdfBuffer({
        receiptInfo: [
          { label: 'Receipt Number', value: `${result.number || '-'}${result.year ? `/${result.year}` : ''}` },
          { label: 'Date', value: paymentDate },
        ],
        clientDetails: [
          { label: 'Client', value: result.client?.name || '-' },
          { label: 'Phone', value: result.client?.phone || '-' },
          { label: 'Email', value: result.client?.email || '-' },
          { label: 'Address', value: result.client?.address || '-' },
        ],
        paymentDetails: [
          { label: 'Payment Mode', value: paymentMode },
          { label: 'Reference', value: reference },
          { label: 'Description', value: result.description || '-' },
        ],
        totalAmount: amount,
      });

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
