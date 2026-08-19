# Contributing to Plexi-ERP

First off, thank you for considering contributing to Plexi-ERP! This repository is strictly proprietary to Plascom Industries LLP. All contributors must be authorized personnel.

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Flexicom-Industries-Pvt-Ltd/Plexi-ERP.git
   cd Plexi-ERP
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Copy `.env.example` to `.env` and fill in the required values (Database URL, NextAuth secrets, AWS S3 keys).

4. **Database Migration:**
   Ensure your Neon Postgres instance is running and migrate the schema.
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Run the Development Server:**
   ```bash
   npm run dev
   ```

## Workflow & Pull Requests

1. **Branching Strategy**: 
   Always create a new branch from `dev` following the naming convention: `feat/module/description`, `fix/module/description`, or `chore/description`.
2. **Commit Messages**: 
   Use Conventional Commits (e.g., `feat(inventory): add batch routing`).
3. **Testing**: 
   Run `npm run test` to ensure no core logic is broken.
4. **Pull Requests**:
   Submit your PR against the `dev` branch. Ensure the CI pipeline passes. Wait for a review before merging.
