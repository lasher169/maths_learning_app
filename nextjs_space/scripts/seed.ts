import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default test teacher account
  const teacherPassword = await bcrypt.hash('johndoe123', 12);
  await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      name: 'John Doe',
      hashedPassword: teacherPassword,
      role: 'TEACHER',
    },
  });

  // Create a demo student
  const studentPassword = await bcrypt.hash('student123', 12);
  await prisma.user.upsert({
    where: { email: 'student@demo.com' },
    update: {},
    create: {
      email: 'student@demo.com',
      name: 'Demo Student',
      hashedPassword: studentPassword,
      role: 'STUDENT',
      yearLevel: 6,
    },
  });

  // Create a demo teacher
  const demoTeacherPassword = await bcrypt.hash('teacher123', 12);
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@demo.com' },
    update: {},
    create: {
      email: 'teacher@demo.com',
      name: 'Demo Teacher',
      hashedPassword: demoTeacherPassword,
      role: 'TEACHER',
    },
  });

  // Assign demo student to demo teacher
  await prisma.user.update({
    where: { email: 'student@demo.com' },
    data: { teacherId: teacher.id },
  });

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
