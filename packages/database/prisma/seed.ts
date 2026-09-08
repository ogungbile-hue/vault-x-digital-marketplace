import 'dotenv/config';
import { seedDatabase } from '../src/seed';

seedDatabase()
  .then(() => {
    console.log('Prisma seed script completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Prisma seed script failed:', err);
    process.exit(1);
  });
