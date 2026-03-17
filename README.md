<div align="center">

# 📦 SKRStock - Ultimate Inventory & Business Management

### *A premium, comprehensive Desktop Management platform for building materials, suppliers, and customers*

[![Electron](https://img.shields.io/badge/Electron-30.0+-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://electronjs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.1+-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0+-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.4+-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://prisma.io/)

</div>

---

## 📋 Overview

> **SKRStock** (formerly *Makhzoun*) is a modern, high-performance **Desktop application** designed to streamline inventory, customer, and supplier management for building material businesses. Built robustly with **Electron** and **Next.js**, SKRStock works as a standalone desktop entity, allowing businesses to track stock securely, handle debts natively, and generate professional PDF statements seamlessly right on their desktop environment.

<br>

### ✨ Key Features

<table>
<tr>
<td width="50%">

**🏢 Inventory Management**
<br>Dynamic tracking of building materials, stock levels, and product categories natively.

**👥 Comprehensive CRM**
<br>Dedicated management modules for both Customers and Suppliers.

**💰 Debt & Invoice Tracking**
<br>Detailed history of past invoices, payments, returns, and outstanding debts.

</td>
<td width="50%">

**📄 Professional PDF Exports**
<br>Generate and export comprehensive financial statements using jsPDF.

**📊 Interactive Dashboard**
<br>Clear, visual insights into business performance powered by Recharts.

**⚡ Desktop Native (Electron)**
<br>Blazing-fast desktop experience running completely standalone.

</td>
</tr>
</table>

---

## 📸 Platform Previews

<div align="center">

### Interactive Dashboard & Inventory
<img src="public/screenshots/home.png" width="48%" alt="Home Dashboard"/>
<img src="public/screenshots/inventory.png" width="48%" alt="Inventory Management"/>

### Customer & Supplier Management
<img src="public/screenshots/customers.png" width="48%" alt="Customer Directory"/>
<img src="public/screenshots/suppliers.png" width="48%" alt="Supplier Directory"/>
</div>

---

## 🚀 Quick Start

### Prerequisites

```
✓ Node.js 20.x or higher
✓ npm package manager (or yarn/pnpm)
```

### Installation

<details open>
<summary><b>📦 Step-by-Step Setup</b></summary>

<br>

**1️⃣ Clone the repository**
```bash
git clone https://github.com/Islamroubache/SKRStock.git
cd SKRStock
```

**2️⃣ Install dependencies**
```bash
npm install
```

**3️⃣ Set up your environment variables**
Create a `.env` file referencing your local database configuration.
```bash
cp .env.example .env
```

**4️⃣ Seed the Database (Optional)**
```bash
npm run db:seed
```

**5️⃣ Run the Desktop Application**
```bash
npm run dev
# For production build: npm run build
```

The Electron container will initialize and launch the SKRStock application natively on your desktop!

</details>

---

## 🛠️ Technology Stack

<div align="center">

| Category | Technologies |
|:---------|:-------------|
| **Executable** | ![Electron](https://img.shields.io/badge/Electron-47848F?style=flat-square&logo=electron&logoColor=white) Native Desktop Engine |
| **Framework** | ![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white) App Router |
| **Frontend** | ![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white) |
| **Styling** | ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white) shadcn/ui components |
| **Database ORM** | ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white) LibSQL (Turso) |
| **Data Visualization**| Recharts |
| **Document Exporting**| jsPDF & xlsx |
| **Icons** | Lucide React |

</div>

---

## 🤖 Platform Architecture

<div align="center">

```mermaid
graph TD
    A[Electron Application] --> B{Native File System & Local DB}
    B --> C[Desktop Render Process]
    C --> D{Action Menu}
    D -->|Dashboard| E[View Analytics & Notifications]
    D -->|Inventory| F[Manage Products / Adjust Stock / Alerts]
    D -->|Suppliers| G[Supplier Debts / Statements / Payments]
    D -->|Customers| H[Customer Debts / Statements / Returns]
    
    G -->|Exports| I[Generate & Save PDF Statement Locally]
    H -->|Exports| I
```

</div>

---

## 🤝 Contributing

<div align="center">

**Contributions are welcome!** Please feel free to submit a Pull Request.

</div>

---

## 👥 Authors

<div align="center">

<table>
<tr>
<td align="center">
<img src="https://github.com/Islamroubache.png" width="100px;" alt="Islam Roubache"/><br>
<sub><b>Islam Roubache</b></sub><br>
🎓 Master's Student in AI & Data Science<br>
📍 Higher School of Computer Science 08 May 1945<br>
Sidi Bel Abbes, Algeria
</td>
</tr>
</table>

</div>

---

## 📧 Contact

<div align="center">

**Questions or Support?**

📧 Email: [i.roubache@esi-sba.dz](mailto:i.roubache@esi-sba.dz)

💬 Open an issue for bug reports or feature requests

</div>

---

<div align="center">

### ⭐ Star this repository if you find it helpful!

<br>

**Built with resilience for intelligent inventory management**

</div>
