const normalizeTimeSlot = (slot, nowMs) => {
  if (!slot || typeof slot !== 'object') {
    return null;
  }

  const startAt = new Date(slot.startAt);
  const endAt = new Date(slot.endAt);

  if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime())) {
    return null;
  }

  if (startAt.getTime() <= nowMs || endAt.getTime() <= nowMs) {
    return null;
  }

  if (endAt <= startAt) {
    return null;
  }

  const normalized = {
    startAt,
    endAt,
  };

  if (typeof slot.note === 'string' && slot.note.trim()) {
    normalized.note = slot.note.trim();
  }

  return normalized;
};

const validateProposedTimeSlots = (req, res, next) => {
  const payload = req.body.proposedTimeSlots ?? req.body.proposedTimes;

  if (!Array.isArray(payload)) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp danh sách 3 khung giờ.',
    });
  }

  if (payload.length !== 3) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng đề xuất đúng 3 khung giờ.',
    });
  }

  const nowMs = Date.now();
  const seen = new Set();
  const normalizedSlots = [];

  for (const slot of payload) {
    const normalized = normalizeTimeSlot(slot, nowMs);
    if (!normalized) {
      return res.status(400).json({
        success: false,
        message: 'Khung giờ không hợp lệ hoặc đã qua thời gian hiện tại.',
      });
    }

    const key = `${normalized.startAt.getTime()}-${normalized.endAt.getTime()}`;
    if (seen.has(key)) {
      return res.status(400).json({
        success: false,
        message: 'Các khung giờ đề xuất không được trùng lặp.',
      });
    }

    seen.add(key);
    normalizedSlots.push(normalized);
  }

  req.validatedProposedTimeSlots = normalizedSlots;
  req.body.proposedTimeSlots = normalizedSlots;
  return next();
};

module.exports = {
  validateProposedTimeSlots,
};
