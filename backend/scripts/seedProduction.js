import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { connectDB } from '../src/config/db.js';
import User from '../src/models/user.model.js';

/**
 * Production Seed Script: Creates ONLY the initial primary Administrator account.
 * Idempotent: Never overwrites an existing admin account or password.
 */
const seedProduction = async () => {
  try {
    console.log('[seed:production] Connecting to MongoDB...');
    await connectDB();

    const adminEmail = (env.admin?.email || process.env.ADMIN_EMAIL || '').toLowerCase().trim();
    const adminPassword = env.admin?.password || process.env.ADMIN_PASSWORD || '';

    if (!adminEmail || !adminPassword) {
      console.error('[seed:production] Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables.');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`[seed:production] Verifying administrator account for '${adminEmail}'...`);
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log(`[seed:production] Admin account '${adminEmail}' already exists (role: ${existingAdmin.role}).`);
      console.log('[seed:production] Idempotent run: Existing administrator account was NOT modified.');
    } else {
      console.log(`[seed:production] Creating primary administrator '${adminEmail}'...`);
      const passwordHash = await User.hashPassword(adminPassword);

      await User.create({
        name: 'Platform Administrator',
        email: adminEmail,
        passwordHash,
        role: 'admin',
      });

      console.log(`[seed:production] Primary administrator account '${adminEmail}' created successfully!`);
    }

    console.log('[seed:production] Production seed completed successfully.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`[seed:production] Fatal error during production seed: ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
};

seedProduction();
