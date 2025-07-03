# My GraphQL School Stats

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Project Report by Cynthia Oketch Nas

Hello! I'm Cynthia Oketch Nas, and this is my completed Zone01 GraphQL profile project. The goal was to learn GraphQL, JWT authentication, and modern web UI/UX by building a personal dashboard that visualizes my school journey using the official Zone01 GraphQL API.

---

## 🌐 Live Demo
**You can view and interact with my hosted project here:**

➡️ [https://CynthiaOketch.github.io/<your-repo-name>/graphql/](https://CynthiaOketch.github.io/<your-repo-name>/graphql/)

_Replace `<your-repo-name>` with the actual repository name if you fork or clone._

---

## 🚀 Features
- **Secure Login:** Use your Zone01 credentials (username/email + password)
- **User Details:** See your login, current XP (in MB), and audits done
- **Statistics Section:**
  - XP earned over time (line graph)
  - XP earned by project (bar chart, in KB)
  - Audit ratio (done vs received, pie chart)
- **Modern UI:** Clean, card-based, responsive design
- **SVG Graphs:** All statistics are rendered as SVG for clarity and performance

---

## 🛠️ Technologies Used
- HTML5
- CSS3 (in `style.css`)
- JavaScript (in `main.js`)
- GraphQL API: [Zone01 Kisumu](https://learn.zone01kisumu.ke/api/graphql-engine/v1/graphql)

---

## 📚 What I Learned
- How to authenticate and use JWTs with a real-world API
- How to write and nest GraphQL queries (including arguments and relationships)
- How to process and visualize data with SVG in JavaScript
- How to design a modern, responsive, and user-friendly web interface
- How to deploy a static site using GitHub Pages

---

## 📝 How to Use My Project

### 1. **Access the Live Site**
Go to: [https://CynthiaOketch.github.io/<your-repo-name>/graphql/](https://CynthiaOketch.github.io/<your-repo-name>/graphql/)

### 2. **Login**
- Enter your Zone01 username/email and password.
- If your credentials are correct, your personalized dashboard will load.

### 3. **Explore Your Stats**
- View your current XP, audits done, and interactive graphs about your progress.

---

## 🏗️ Project Structure
```
graphql/
├── index.html      # Main HTML file
├── style.css       # All CSS styles
├── main.js         # All JavaScript logic
├── LICENSE         # MIT License
└── README.md       # This file
```

---

## 🛠️ For Developers: Run Locally
1. Clone or download the repository.
2. Serve the project with a local web server (required for API access):
   ```bash
   cd graphql
   python3 -m http.server 8080
   ```
3. Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 👩‍💻 Contributor
- [Cynthia Oketch Nas](https://github.com/CynthiaOketch)

---

## 📄 License
This project is licensed under the [MIT License](LICENSE). 