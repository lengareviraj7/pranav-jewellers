# SIDHESHWAR JEWELLERS ERP — DEPLOYMENT GUIDE

This guide details the procedure to deploy the **SIDHESHWAR JEWELLERS ERP** to production on **Vercel** with a **MongoDB Atlas** database cluster.

---

## 1. Prerequisites
- A MongoDB Atlas account with a dedicated or shared cluster (M0, M2, M10+).
- A Vercel account linked to your GitHub/GitLab repository.
- Node.js 18+ locally for maintenance or administrative scripts.

---

## 2. MongoDB Atlas Configuration
1. **Create Database User**:
   - Go to **Security > Database Access**.
   - Create a database user with `readWriteAnyDatabase` or `readWrite` permissions on database `sidheshwar_jewellers`.
2. **Network Access**:
   - Go to **Security > Network Access**.
   - For Vercel serverless deployment, add IP `0.0.0.0/0` (Allow Access from Anywhere) or specify Vercel's IP ranges.
3. **Get Connection String**:
   - Go to **Database > Connect > Drivers > Node.js**.
   - Copy the SRV URI:
     ```
     mongodb+srv://<username>:<password>@cluster0.xyz.mongodb.net/sidheshwar_jewellers?retryWrites=true&w=majority
     ```

---

## 3. Environment Variables Configuration

Set these environment variables in your Vercel Project Settings (**Settings > Environment Variables**):

| Variable | Description | Example / Production Value |
| :--- | :--- | :--- |
| `MONGODB_URI` | MongoDB Atlas SRV connection string | `mongodb+srv://user:pass@cluster0.xyz.mongodb.net/sidheshwar_jewellers?retryWrites=true&w=majority` |
| `JWT_SECRET` | Secret key for signing HTTP-only session cookies | High-entropy 64-character hex or string |
| `TIMEZONE` | Store timezone for IST timestamps | `Asia/Kolkata` |
| `NEXT_PUBLIC_TIMEZONE`| Store timezone for client clocks | `Asia/Kolkata` |
| `DEFAULT_ADMIN_EMAIL` | Initial admin account email | `admin@sidheshwar.com` |
| `DEFAULT_ADMIN_PASSWORD` | Initial admin account password | `Admin@Sidheshwar2026` |
| `DEFAULT_ADMIN_NAME` | Initial administrator display name | `Siddheshwar Admin` |

---

## 4. Initial Database Seeding
Once the MongoDB Atlas cluster is online and `MONGODB_URI` is set:
```bash
# Run the database seeder from your terminal or CI pipeline:
npm run seed
```
This automatically initializes:
- Default administrator account (`admin@sidheshwar.com` / `Admin@Sidheshwar2026`).
- Standard Gold categories (Rings, Chains, Bangles, Necklaces, Earrings, Bracelets, Coins, Other).
- Standard Silver categories (Anklets, Silver Chains, Rings, Bracelets, Coins, Utensils, Pooja Items, Other).
- Shop letterhead profile and daily benchmark metal rates.

---

## 5. Vercel Deployment Instructions
1. Push the code to your GitHub/GitLab repository:
   ```bash
   git init
   git add .
   git commit -m "feat: complete Sidheshwar Jewellers ERP"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. Import the project in Vercel:
   - Framework Preset: **Next.js**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
3. Add the Environment Variables from Section 3.
4. Click **Deploy**.

---

## 6. Post-Deployment Verification Checklist
- [ ] Log in with `admin@sidheshwar.com` / `Admin@Sidheshwar2026`.
- [ ] Verify live clock in top header shows Asia/Kolkata (IST) time.
- [ ] Add a gold stock item and verify gross weight, stone weight, and net weight.
- [ ] Test the Mortgage Calculator workbench with test inputs (e.g. ₹20,000, 3%, 13 months = ₹28,016).
- [ ] Record a mock loan payment and verify receipt generation and print layout.
- [ ] Test CSV export links in Settings / Module headers.
