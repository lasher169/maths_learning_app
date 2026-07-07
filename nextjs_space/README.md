# MathMentor - Adaptive Maths Learning Platform

An adaptive mathematics learning platform designed for Australian students (Years 1-12). It generates AI-powered questions that adapt to each student's ability level, provides instant feedback, and tracks performance over time.

## Features

- **Adaptive Difficulty** - Questions start easy and progressively get harder. If a student struggles, difficulty decreases to maintain engagement.
- **AI-Powered Questions** - Uses Abacus.AI LLM API to generate curriculum-aligned maths questions for Years 1-12.
- **Instant Feedback** - Each answer is evaluated by AI with detailed explanations and encouragement.
- **Working Shown** - Students can show their working for partial credit.
- **Timed Sessions** - Choose practice duration (5, 10, 15, 20, or 30 minutes).
- **End-of-Session Review** - See total score, identify weak areas, and review explanations.
- **Student & Teacher Roles** - Teachers/parents can monitor their students' progress.
- **Performance Tracking** - All sessions, questions, and answers are stored for progress review.

## Tech Stack

- **Frontend**: React 18 with Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **Auth**: NextAuth.js v4
- **AI**: Abacus.AI LLM API (GPT-4 Mini)
- **Styling**: Tailwind CSS

---

## Raspberry Pi Setup Guide

### Prerequisites

1. **Raspberry Pi** (3B+ or later recommended, 4 preferred)
2. **Raspberry Pi OS** (64-bit recommended) or Ubuntu Server
3. **Node.js 18+** installed
4. **A Supabase project** (free tier works fine)
5. **An Abacus.AI account** with API key

### Step 1: Install Node.js on Raspberry Pi

```bash
# Install Node.js 18 using NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version

# Install yarn globally
sudo npm install -g yarn
```

### Step 2: Clone/Copy the Project

```bash
# Create a directory for the app
mkdir -p ~/apps
cd ~/apps

# Copy the project files to your Raspberry Pi
# (use SCP, USB drive, or git clone if you've pushed to a repo)
# Example with SCP from another machine:
# scp -r /path/to/maths_learning_app pi@raspberrypi.local:~/apps/

cd maths_learning_app/nextjs_space
```

### Step 3: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and open your project
2. Navigate to **Settings > Database**
3. Find your connection strings:
   - **Transaction mode (port 6543)** → This is your `DATABASE_URL`
   - **Session mode (port 5432)** → This is your `DIRECT_URL`
4. Note your database password

### Step 4: Configure Environment Variables

```bash
# Copy the example env file
cp .env.local.example .env.local

# Edit with your values
nano .env.local
```

Fill in your actual values:

```env
# Supabase connection strings (replace with your actual values)
DATABASE_URL="postgresql://postgres.YOUR_PROJECT_REF:YOUR_DB_PASSWORD@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.YOUR_PROJECT_REF:YOUR_DB_PASSWORD@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres"

# Generate a secret: openssl rand -base64 32
NEXTAUTH_SECRET="paste-your-generated-secret"

# Your Raspberry Pi's local URL
NEXTAUTH_URL="http://localhost:3000"

# Your Abacus.AI API key
ABACUSAI_API_KEY="your-api-key"
```

> **Tip**: Also create a `.env` file with the same content (Prisma reads from `.env`):
> ```bash
> cp .env.local .env
> ```

### Step 5: Install Dependencies

```bash
cd ~/apps/maths_learning_app/nextjs_space
yarn install
```

### Step 6: Set Up the Database

```bash
# Generate Prisma client
yarn prisma generate

# Push schema to Supabase (creates all tables)
yarn prisma db push

# Seed with demo accounts
yarn prisma db seed
```

### Step 7: Build and Run

```bash
# Build the production app
yarn build

# Start the production server
yarn start
```

The app will be available at `http://localhost:3000`

To access from other devices on your network, use your Pi's IP:
```bash
# Find your Pi's IP
hostname -I
# Then access: http://YOUR_PI_IP:3000
```

### Step 8: Run on Startup (Optional)

To auto-start the app when your Pi boots:

```bash
# Create a systemd service
sudo nano /etc/systemd/system/mathmentor.service
```

Paste:
```ini
[Unit]
Description=MathMentor App
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/apps/maths_learning_app/nextjs_space
ExecStart=/usr/bin/yarn start
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then enable it:
```bash
sudo systemctl daemon-reload
sudo systemctl enable mathmentor
sudo systemctl start mathmentor

# Check status
sudo systemctl status mathmentor
```

---

## Demo Accounts

After seeding, these accounts are available:

| Role | Email | Password |
|------|-------|----------|
| Student | student@demo.com | student123 |
| Teacher | teacher@demo.com | teacher123 |

The demo student is pre-assigned to the demo teacher.

---

## VS Code Development

To develop on your Raspberry Pi with VS Code:

1. Install **Remote - SSH** extension in VS Code on your main computer
2. Connect to your Pi: `ssh pi@raspberrypi.local`
3. Open the project folder
4. Run `yarn dev` in the terminal for hot-reloading

```bash
cd ~/apps/maths_learning_app/nextjs_space
yarn dev
```

---

## Project Structure

```
nextjs_space/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/               # NextAuth + login
│   │   ├── signup/             # User registration
│   │   ├── generate-question/  # AI question generation (streaming)
│   │   ├── evaluate-answer/    # AI answer evaluation (streaming)
│   │   ├── sessions/           # Practice session CRUD
│   │   ├── questions/          # Question storage
│   │   ├── answers/            # Answer storage
│   │   ├── students/           # Teacher-student management
│   │   └── profile/            # User profile
│   ├── dashboard/              # Student dashboard
│   ├── practice/               # Practice session flow
│   ├── results/[id]/           # Session results review
│   ├── students/               # Teacher's student management
│   ├── login/                  # Login page
│   └── signup/                 # Signup page
├── components/                 # Shared components
├── lib/                        # Utilities, auth config, topics
├── prisma/
│   └── schema.prisma           # Database schema
└── scripts/
    └── seed.ts                 # Database seeding
```

## Database Schema

- **User** - Stores students and teachers with role-based access
- **PracticeSession** - Records each practice attempt (topic, year level, duration, scores)
- **Question** - AI-generated questions with difficulty tracking
- **StudentAnswer** - Student responses with marks and feedback

---

## Troubleshooting

### "Cannot connect to database"
- Check your `.env` / `.env.local` has the correct Supabase connection strings
- Ensure your Supabase project is active (free tier pauses after inactivity)
- Try the DIRECT_URL in a psql client to verify connectivity

### "Prisma generate fails"
- Make sure you're running Node.js 18+ (`node --version`)
- Try `npx prisma generate` instead of `yarn prisma generate`

### "Build fails on Raspberry Pi"
- Ensure you have at least 2GB RAM (use swap if needed):
  ```bash
  sudo dphys-swapfile swapoff
  sudo nano /etc/dphys-swapfile  # Set CONF_SWAPSIZE=2048
  sudo dphys-swapfile setup
  sudo dphys-swapfile swapon
  ```

### "LLM API not working"
- Verify your ABACUSAI_API_KEY is valid
- Check the API is reachable: `curl https://apps.abacus.ai/v1/models -H "Authorization: Bearer YOUR_KEY"`

### Accessing from other devices on your network
- Use your Pi's local IP address (e.g., `http://192.168.1.100:3000`)
- Update NEXTAUTH_URL in `.env.local` to match: `NEXTAUTH_URL="http://192.168.1.100:3000"`
