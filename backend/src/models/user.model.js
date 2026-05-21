const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/@sis\.hust\.edu\.vn$/, 'Vui lòng sử dụng email sinh viên (@sis.hust.edu.vn)']
  },
  phoneNumber: { type: String, required: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  isVerified: { type: Boolean, default: false },

  student: {
    studentId: { type: String, trim: true },
    faculty: { type: String, trim: true },
    cohort: { type: String, trim: true },
    className: { type: String, trim: true }
  },
  profile: {
    avatarUrl: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 500 },
    gender: { type: String, enum: ['male', 'female', 'other', 'unspecified'], default: 'unspecified' }
  },
  location: {
    campusArea: { type: String, trim: true },
    dorm: { type: String, trim: true },
    district: { type: String, trim: true },
    city: { type: String, trim: true }
  },
  contactPreferences: {
    showEmail: { type: Boolean, default: false },
    showPhone: { type: Boolean, default: false },
    preferredContact: { type: String, enum: ['email', 'phone', 'zalo', 'facebook', 'none'], default: 'none' }
  },
  socialLinks: {
    facebook: { type: String, trim: true },
    zalo: { type: String, trim: true },
    telegram: { type: String, trim: true }
  },

  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followersCount: { type: Number, default: 0, min: 0 },
  followingCount: { type: Number, default: 0, min: 0 },

  stats: {
    totalListings: { type: Number, default: 0, min: 0 },
    totalSold: { type: Number, default: 0, min: 0 },
    totalBought: { type: Number, default: 0, min: 0 }
  },
  trustStats: {
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalTransactions: { type: Number, default: 0, min: 0 },
    isBlacklisted: { type: Boolean, default: false }
  },

  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  passwordChangedAt: { type: Date },
  lastActiveAt: { type: Date }
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000;
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
  if (!this.passwordChangedAt) {
    return false;
  }

  return this.passwordChangedAt.getTime() / 1000 > jwtTimestamp;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;