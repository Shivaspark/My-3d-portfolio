<img width="1365" height="648" alt="image" src="https://github.com/user-attachments/assets/31a8166d-4d3a-4180-86d4-8ce1e0126807" />

# 🕹️ Spark AI Lab: 8-Bit Interactive 3D Portfolio

Welcome to the **Spark AI Lab**, a fully interactive, voxel-art digital twin of my workspace. This project transcends the traditional static resume by merging **React Three Fiber**, **Agentic AI**, and **Retro Game Aesthetics** into a functional 3D environment.

**🌐 Live Demo:** [https://sivashankaran.vercel.app/]  
**👤 Developer:** Sivashankaran R (AI Developer & IT Engineer)

---

## 🚀 The Vision
The Spark AI Lab is designed as a "Living Portfolio." Every object in the room—from the Rubik's Cube to the wall portraits—serves a functional purpose, allowing visitors to explore my technical journey, community leadership, and AI projects through interaction rather than just reading.

---

## 🛠️ Key Features

### 🧠 Spark AI Integration
*   **The Brain:** A custom AI agent (Spark AI) powered by the **Gemini 1.5 Flash API**.
*   **Context-Aware:** Spark AI is briefed on my specific projects like **PUMIS** and **Mail Zero Orchestrator**, providing technical deep-dives upon request.
*   **RPG Dialogue UI:** Interactions are handled through a retro-styled typewriter dialogue system.

### 🎲 Interactive Voxel Rubik's Cube
*   **Skill Matrix:** A fully functional, rotatable 3D Rubik's Cube.
*   **Tech Stack Mapping:** Each face of the cube represents a core competency: **Python, SQL, ML, NumPy, Pandas, and Matplotlib**.
*   **Physics-Based:** Built using Raycasting to handle real-time slice rotations.

### 🖼️ Dynamic Portrait Gallery (Pixa App)
*   **User-Generated Content:** The wall portrait is linked to a "Pixa" tool on the in-game computer.
*   **Real-time Texture Swapping:** When a user generates pixel art via the Hugging Face Inference API, the 3D texture on the wall frame updates instantly to display their creation.

### Easter Eggs
*  There is an Easter Egg hidden inside the site.

---

## 🏗️ Technical Stack

| Category | Technology |
| :--- | :--- |
| **Frontend** | Next.js, Tailwind CSS |
| **3D Engine** | Three.js, React Three Fiber (R3F) |
| **Physics/Hooks** | @react-three/drei, @react-three/postprocessing |
| **AI/ML** | Google Gemini API, Hugging Face API (Stable Diffusion for Pixa) |
| **Deployment** | Vercel |

---


## 🔧 Installation & Setup

1. **Clone the repo:**
   ```bash
   git clone [https://github.com/Shivaspark/My-3d-portfolio.git](https://github.com/Shivaspark/My-3d-portfolio.git)

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
