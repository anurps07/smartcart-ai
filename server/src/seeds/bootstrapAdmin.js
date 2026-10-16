import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User, AuditLog } from '../models/index.js';
import { ROLES } from '../constants/index.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';

// Parse CLI flags: --email, --password, --name, --secret
const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      options[key] = value;
    }
  }
  return options;
};

const bootstrapAdmin = async () => {
  console.log('--------------------------------------------------');
  console.log('🔒 SmartCart AI - Protected Administrator Bootstrap');
  console.log('--------------------------------------------------');

  const args = parseArgs();
  const email = (args.email || 'admin@smartcart.com').toLowerCase().trim();
  const password = args.password || 'Admin@123456';
  const name = args.name || 'Super Administrator';
  const secret = args.secret || process.env.ADMIN_BOOTSTRAP_SECRET || env.ADMIN_BOOTSTRAP_SECRET;

  if (secret !== env.ADMIN_BOOTSTRAP_SECRET) {
    console.error('❌ Error: Invalid or missing ADMIN_BOOTSTRAP_SECRET.');
    process.exit(1);
  }

  try {
    await connectDB();

    const existingAdmin = await User.findOne({ email });

    const salt = await bcrypt.genSalt(env.BCRYPT_SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(password, salt);

    if (existingAdmin) {
      existingAdmin.name = name;
      existingAdmin.role = ROLES.ADMIN;
      existingAdmin.passwordHash = passwordHash;
      existingAdmin.isActive = true;
      await existingAdmin.save();

      console.log(`✅ Administrator record updated for: ${email}`);
    } else {
      const newAdmin = await User.create({
        name,
        email,
        passwordHash,
        role: ROLES.ADMIN,
        isActive: true,
      });

      console.log(`✅ New Administrator created: ${email}`);

      // Record audit log
      await AuditLog.create({
        actorId: newAdmin._id,
        actorEmail: email,
        actorRole: ROLES.ADMIN,
        action: 'BOOTSTRAP_ADMIN_CREATED',
        targetResource: {
          resourceType: 'User',
          resourceId: newAdmin._id.toString(),
        },
        details: { method: 'CLI_BOOTSTRAP' },
      });
    }

    console.log(`==================================================`);
    console.log(`👑 Admin Email   : ${email}`);
    console.log(`🔑 Admin Password: ${password}`);
    console.log(`🛡️ Role          : ${ROLES.ADMIN}`);
    console.log(`==================================================`);
  } catch (error) {
    console.error(`❌ Admin bootstrap failed: ${error.message}`);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

bootstrapAdmin();
