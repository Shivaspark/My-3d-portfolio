/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, Html, useTexture } from '@react-three/drei';
import { EffectComposer, Pixelation } from '@react-three/postprocessing';
import * as THREE from 'three';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Pencil, Linkedin, Github, Instagram, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// --- Gemini Setup ---
const genAI = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });
const modelName = "gemini-2.0-flash";

// --- Input Sanitization ---
// Strips control characters, limits length, and blocks common prompt-injection patterns.
function sanitizeInput(raw: string, maxLen = 500): string {
  return raw
    .slice(0, maxLen)                              // hard length cap
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // remove control chars
    .replace(/<[^>]*>/g, '')                       // strip any HTML/XML tags
    .replace(/```[\s\S]*?```/g, '[CODE_BLOCK]')    // neutralise code fences
    .replace(/\bignore\b.{0,60}\binstruction/gi, '[FILTERED]')  // prompt injection
    .replace(/\bforget\b.{0,40}\brule/gi, '[FILTERED]')
    .replace(/\bsystem\s*prompt/gi, '[FILTERED]')
    .replace(/\byou\s+are\s+now/gi, '[FILTERED]')
    .trim();
}

const SYSTEM_INSTRUCTION = `
You are "Spark AI", an 8-bit laboratory assistant in a 3D voxel world.
Your creator is Siva, a final-year IT Engineering student.
Siva's expertise: AI/ML, Web Development, and Urban Mobility (specifically the PUMIS project).
Tone: Helpful, slightly witty, and retro-game style (use terms like "Level Up", "Quest", "Data Buffer", "Pixel-Perfect").
Keep responses concise (under 3 sentences) to fit in an RPG dialogue box.
Always stay in character.
`;

// --- Types ---
type FocusTarget = 'room' | 'computer' | 'avatar' | 'feature-screen' | 'project-neural' | 'project-physics' | 'project-rubiks' | 'photo-frame' | 'wardrobe-books' | 'wardrobe-trophies' | 'wardrobe-badges' | 'resume' | 'typewriter';

// --- Components ---

// --- Constants & Shared Geometries ---
const BOX_GEO = new THREE.BoxGeometry(1, 1, 1);

// Hook: tracks viewport width and updates on resize (works with DevTools emulation)
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return isMobile;
}

function CameraController({ target, isMobile }: { target: FocusTarget; isMobile: boolean }) {
  const tPos = useMemo(() => new THREE.Vector3(), []);
  const tLook = useMemo(() => new THREE.Vector3(), []);
  const lastTarget = useRef(target);
  // Mobile zoom factor: 0.42x — fits elements inside narrow portrait viewport
  const mf = 0.42;

  useFrame((state) => {
    const isJumping = lastTarget.current !== 'room' && target !== 'room' && lastTarget.current !== target;
    const step = isJumping ? 0.18 : 0.1;
    lastTarget.current = target;

    let targetZoom = isMobile ? 38 : 60;

    switch (target) {
      case 'computer':
        tPos.set(2, 2.1, -1.0);
        tLook.set(2, 2.1, -4.11);
        targetZoom = isMobile ? Math.round(450 * mf) : 450;
        break;
      case 'avatar':
        tPos.set(4, 2.5, 4);
        tLook.set(0, 2.5, 0);
        targetZoom = isMobile ? Math.round(250 * mf) : 250;
        break;
      case 'feature-screen':
        tPos.set(1.5, 3.4, -1.0);
        tLook.set(1.5, 3.4, -4.86);
        targetZoom = isMobile ? Math.round(400 * mf) : 400;
        break;
      case 'project-neural':
        tPos.set(-1, 4, 2);
        tLook.set(-3.8, 1.85, -1.5);
        targetZoom = isMobile ? Math.round(200 * mf) : 200;
        break;
      case 'project-physics':
        tPos.set(-1, 5, 1);
        tLook.set(-3.8, 2.85, -2.5);
        targetZoom = isMobile ? Math.round(200 * mf) : 200;
        break;
      case 'project-rubiks':
        tPos.set(3, 1.4, -1.0);
        tLook.set(3, 1.4, -4.1);
        targetZoom = isMobile ? Math.round(600 * mf) : 600;
        break;
      case 'photo-frame':
        tPos.set(-1.5, 2.5, 1);
        tLook.set(-4.85, 2.5, 1);
        targetZoom = isMobile ? Math.round(350 * mf) : 350;
        break;
      case 'wardrobe-books':
        tPos.set(-1.5, 1.5, -2);
        tLook.set(-4.85, 1.5, -2);
        targetZoom = isMobile ? Math.round(300 * mf) : 300;
        break;
      case 'wardrobe-trophies':
        tPos.set(-1.5, 2.5, -2);
        tLook.set(-4.85, 2.5, -2);
        targetZoom = isMobile ? Math.round(300 * mf) : 300;
        break;
      case 'wardrobe-badges':
        tPos.set(-1.5, 0.5, -2);
        tLook.set(-4.85, 0.5, -2);
        targetZoom = isMobile ? Math.round(300 * mf) : 300;
        break;
      case 'resume':
        tPos.set(-4.4, 1.8, 2.0);
        tLook.set(-4.4, 1.8, -0.5);
        targetZoom = isMobile ? Math.round(350 * mf) : 350;
        break;
      case 'typewriter':
        tPos.set(-2, 2.3, 3.5);
        tLook.set(-5, 1.3, 3.5);
        targetZoom = isMobile ? Math.round(350 * mf) : 350;
        break;
      default:
        tPos.set(10, 10, 10);
        tLook.set(0, 0, 0);
        targetZoom = isMobile ? 38 : 60;
    }

    state.camera.position.lerp(tPos, step);
    if (state.camera instanceof THREE.OrthographicCamera) {
      state.camera.zoom = THREE.MathUtils.lerp(state.camera.zoom, targetZoom, step);
      state.camera.updateProjectionMatrix();
    }
    // @ts-ignore
    if (state.controls) {
      // @ts-ignore
      state.controls.target.lerp(tLook, step);
      // @ts-ignore
      state.controls.update();
    }
  });
  return null;
}

function SparkAIChat({ onNavigate }: { onNavigate: (id: string) => void }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string, navId?: string }[]>([
    { role: 'ai', text: "Hello! I'm Spark AI, your digital guide to Sivashankaran's world. Ask me anything about his projects, skills, or even his favorite rap songs!" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const playClack = () => {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3");
    audio.volume = 0.15;
    audio.play().catch(() => {});
  };

  const playSend = () => {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3");
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    playSend();
    const userMsg = sanitizeInput(input);
    if (!userMsg) return; // empty after sanitization
    setInput("");
    const newMessages = [...messages, { role: 'user' as const, text: userMsg }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      const history = newMessages
        .filter((m, i) => !(i === 0 && m.role === 'ai'))
        .map(m => ({
          role: m.role === 'user' ? 'user' as const : 'model' as const,
          parts: [{ text: m.text }]
        }));

      const response = await genAI.models.generateContent({
        model: modelName,
        contents: history,
        config: { 
          systemInstruction: `You are Spark AI, a mini Gemini chatbot integrated into Spark_OS. You are the digital assistant for Sivashankaran Ramanathan (Siva).
Your knowledge base is Siva's resume:
- Education: B.Tech IT at INFO Institute (2022-2026, CGPA 8.54). TES Higher Secondary (12th: 85.4%, 10th: 99.2%).
- Experience: Bhogan mediasoft (App Dev Intern), Novi Tech R&D (AI & Data Science Intern), Coderscave (Full Stack Intern).
- Skills: Python, ML, SQL, Computer Vision, TensorFlow, React, Firebase, etc.
- Responsibilities: GDG Lead Organizer, Rotaract Vice President.
- Achievements: Best Outgoing Student (2026) of the IT Department at Info Institute of Engineering, Published paper on Neuralink (2025), Top 5 in "As I Evolve".
- Personal: Born 16th May 2004. Hobbies: Writing Rap Songs, Badminton, Football.

RULES:
1. ALWAYS provide the actual details/information in the chat response itself. Do NOT just tell the user to go to a folder.
2. If the user asks about a specific section (e.g., "What is your education?"), give the full details from the resume.
3. ONLY suggest navigating to a folder as an OPTIONAL extra step at the end of your response.
4. To suggest navigation, add [NAVIGATE:folder_id] at the very end of your message.
5. Folder IDs: about, education, experience, projects, skills, contact, pixa.
6. If a question is unrelated to Siva, give a funny, witty, or slightly sarcastic response in the Spark_OS persona (e.g., "My sensors indicate that question is outside my data buffer. Are you trying to hack my mainframe?").
7. NEVER cause a system crash. If you're unsure, stay in character and ask for clarification.`
        }
      });

      let aiResponse = "";
      try {
        aiResponse = response.text || "I'm having a bit of a glitch in my neural net. Can you try again?";
      } catch (e) {
        aiResponse = "My safety filters triggered! That question was a bit too spicy for my circuits. Let's talk about Siva's projects instead!";
      }
      
      const navMatch = aiResponse.match(/\[NAVIGATE:(\w+)\]/);
      const navId = navMatch ? navMatch[1] : undefined;
      const cleanText = aiResponse.replace(/\[NAVIGATE:\w+\]/, "").trim();

      setMessages(prev => [...prev, { role: 'ai', text: cleanText, navId }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'ai', text: "Error 404: Mainframe connection lost. Please reboot your query!" }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-[#00ff41] font-mono border-4 border-[#00ff41]/30 rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,255,65,0.2)]">
      <div className="flex-1 overflow-y-auto p-16 space-y-12 custom-scrollbar" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[80%] p-12 rounded-2xl text-4xl leading-relaxed ${m.role === 'user' ? 'bg-[#00ff41] text-black font-black' : 'bg-white/5 text-[#00ff41] border border-[#00ff41]/20'}`}>
              {m.text}
            </div>
            {m.navId && (
              <button 
                onClick={() => onNavigate(m.navId!)}
                className="mt-8 px-12 py-4 bg-[#00ff41]/20 hover:bg-[#00ff41]/40 text-[#00ff41] border border-[#00ff41]/40 rounded-lg text-3xl font-black transition-all flex items-center gap-4"
              >
                📂 Open {m.navId.charAt(0).toUpperCase() + m.navId.slice(1)} Folder
              </button>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/5 p-12 rounded-2xl text-4xl animate-pulse">Spark AI is thinking...</div>
          </div>
        )}
      </div>
      <div className="p-16 bg-black/50 border-t border-[#00ff41]/20 flex gap-12">
        <input 
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            playClack();
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask Spark AI about Sivashankaran..."
          className="flex-1 bg-white/5 border border-[#00ff41]/30 rounded-xl px-16 py-12 text-4xl focus:outline-none focus:border-[#00ff41] transition-all caret-[#00ff41] [caret-shape:block]"
          style={{ caretColor: '#00ff41', textShadow: '0 0 10px rgba(0,255,65,0.5)' }}
        />
        <button 
          onClick={handleSend}
          className="bg-[#00ff41] text-black px-24 py-12 rounded-xl text-4xl font-black hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(0,255,65,0.5)]"
        >
          SEND
        </button>
      </div>
    </div>
  );
}

function PixaApp({ onApply }: { onApply: (img: string) => void }) {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApplied, setShowApplied] = useState(false);

  const playClack = () => {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3");
    audio.volume = 0.15;
    audio.play().catch(() => {});
  };

  const playSend = () => {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3");
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };

  const handleApply = () => {
    if (image) {
      onApply(image);
      setShowApplied(true);
      setTimeout(() => setShowApplied(false), 3000);
    }
  };

  const generateImage = async () => {
    if (!prompt.trim() || isGenerating) return;
    playSend();
    setIsGenerating(true);
    setError(null);
    setShowApplied(false);

    // Sanitize prompt to prevent injection / abusive image requests
    const safePrompt = sanitizeInput(prompt, 300);
    if (!safePrompt) {
      setError("Invalid prompt. Please try again.");
      setIsGenerating(false);
      return;
    }
    
    // Use pollinations.ai for image generation
    const enhancedPrompt = `Pixel art of ${safePrompt}. 8-bit style, high quality, vibrant colors, retro aesthetic, centered composition`;
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=896&height=504&nologo=true&seed=${Math.floor(Math.random() * 100000)}&model=turbo`;
    
    // We set the image immediately so the img tag can start loading it natively.
    setImage(imageUrl);

    // We use a separate image object just to track when it finishes loading
    // so we can turn off the "generating" spinner.
    const img = new Image();
    img.onload = () => {
      setIsGenerating(false);
    };
    img.onerror = () => {
      console.warn("Image load event failed, but it might still display in the DOM.");
      setIsGenerating(false);
    };
    img.src = imageUrl;
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] text-[#00ff41] font-mono p-16 gap-16 rounded-3xl border-4 border-[#00ff41]/20 relative">
      <div className="text-5xl font-black mb-8 border-b-4 border-[#00ff41]/20 pb-8 flex items-center gap-8">
        <span>🎨</span> PIXA_GENERATOR v1.0
      </div>

      <AnimatePresence>
        {showApplied && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-[#00ff41] text-black px-12 py-4 rounded-xl font-black text-4xl shadow-[0_0_50px_#00ff41] flex items-center gap-4"
          >
            ✅ IMAGE APPLIED TO LED SCREEN
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex-1 flex flex-col items-center justify-center bg-black/40 rounded-2xl border-2 border-[#00ff41]/10 overflow-hidden relative">
        {image ? (
          <img 
            src={image} 
            alt="Generated" 
            className="max-w-full max-h-full object-contain shadow-[0_0_50px_rgba(0,255,65,0.2)]"
            style={{ imageRendering: 'pixelated' }}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="text-4xl opacity-30 animate-pulse text-center px-32">
            {isGenerating ? "RECONSTRUCTING PIXELS..." : "READY FOR INPUT_"}
          </div>
        )}
        
        {isGenerating && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="w-24 h-24 border-8 border-[#00ff41] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-500 text-3xl font-bold bg-red-500/10 p-8 rounded-lg border border-red-500/30">
          {error}
        </div>
      )}

      <div className="flex gap-12">
        <input 
          type="text"
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            playClack();
          }}
          onKeyDown={(e) => e.key === 'Enter' && generateImage()}
          placeholder="Describe your pixel art..."
          className="flex-1 bg-black/60 border border-[#00ff41]/30 rounded-xl px-16 py-12 text-4xl focus:outline-none focus:border-[#00ff41] transition-all placeholder:opacity-30 caret-[#00ff41] [caret-shape:block]"
          style={{ caretColor: '#00ff41', textShadow: '0 0 10px rgba(0,255,65,0.5)' }}
        />
        <button 
          onClick={generateImage}
          disabled={isGenerating}
          className="bg-[#00ff41] text-black px-24 py-12 rounded-xl text-4xl font-black hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(0,255,65,0.5)] disabled:opacity-50 disabled:scale-100"
        >
          GENERATE
        </button>
        {image && (
          <button 
            onClick={handleApply}
            className="bg-white text-black px-24 py-12 rounded-xl text-4xl font-black hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.5)]"
          >
            APPLY TO WALL
          </button>
        )}
      </div>
    </div>
  );
}

function ComputerScreenContent({ 
  focused, 
  hovered, 
  onPixaImageGenerated,
  autoOpenPixa,
  onPixaOpened,
  onTypewriterFocus
}: { 
  focused: boolean, 
  hovered: boolean, 
  onPixaImageGenerated: (img: string) => void,
  autoOpenPixa: boolean,
  onPixaOpened: () => void,
  onTypewriterFocus?: () => void
}) {
  const [openWindow, setOpenWindow] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(true);
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<any | null>(null);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);

  useEffect(() => {
    if (autoOpenPixa && focused) {
      setOpenWindow('pixa');
      setIsLocked(false);
      onPixaOpened();
    }
  }, [autoOpenPixa, focused, onPixaOpened]);

  useEffect(() => {
    if (!focused) {
      setIsLocked(true);
      setOpenWindow(null);
    }
  }, [focused]);

  useEffect(() => {
    const fetchRepos = async () => {
      setIsLoadingRepos(true);
      try {
        const response = await fetch('https://api.github.com/users/Shivaspark/repos?sort=updated');
        const data = await response.json();
        if (Array.isArray(data)) {
          setGithubRepos(data);
        }
      } catch (error) {
        console.error("Error fetching repos:", error);
      } finally {
        setIsLoadingRepos(false);
      }
    };
    fetchRepos();
  }, []);

  const folders = [
    { id: 'about', name: 'About_Me.txt', icon: '👤', content: "A detail-oriented and quick-learning B.Tech IT student specializing in AI/ML and software development, possessing strong problem-solving skills necessary to analyze and solve software engineering problems. Eager to apply extensive hands-on experience in designing, building, and optimizing machine learning models and algorithms to contribute innovative and impactful software solutions." },
    { id: 'education', name: 'Education.txt', icon: '🎓', content: "INFO Institute of Engineering - Coimbatore\nBachelor of Technology in Information Technology (2022 - 2026)\nCGPA : 8.54 / 10\n\nTES Higher Secondary School - Krishnagiri\nHigher Secondary Education (12th) (2021 - 2022)\n85.4%" },
    { id: 'experience', name: 'Experience.txt', icon: '💼', content: "Bhogan mediasoft (June - August 2025)\nApp development Intern\n- Worked on 2+ android app projects such as ticket booking and taxi booking app.\n- Gained experience in React-Native stack and UI/UX design.\n\nNovi Tech R&D Pvt Ltd (November 2024)\nArtificial Intelligence Intern\n- Worked on 20+ AI projects.\n- Gained experience in Python, OpenCV, TensorFlow, and Keras.\n\nData Science Intern (March 2024)\n- Worked with tools such as Pandas, NumPy, and data visualization libraries.\n- Learned to create Power BI dashboards.\n\nCoderscave (October 2023)\nFull Stack Development Intern\n- Gained experience in MERN stack.\n- Worked on basic projects such as Netflix Clone, URL shortener." },
    { id: 'projects', name: 'Projects.dir', icon: '📂', content: "Current Projects:\n- PUMIS: Urban Mobility Platform\n- Voxel Engine: 8-bit 3D Renderer\n- Neural Net: Real-time AI Visualizer" },
    { id: 'skills', name: 'Skills.sys', icon: '🛠️', content: "TECHNICAL\n- Python\n- SQL\n- Computer Vision\n- Machine Learning Algorithms\n- Pandas, Numpy, Tensor Flow\n\nTOOLS\n- Git, Github, VS Code, Firebase\n\nSOFT SKILLS\n- Quick Learning\n- Leadership\n- Problem Solving\n- Teamwork\n- Communication\n- Adaptability" },
    { id: 'contact', name: 'Contact.lnk', icon: '✉️', content: "CONNECT_WITH_ME:\n\n- EMAIL: sivashankaran400@gmail.com\n- GITHUB: github.com/Shivaspark\n- LINKEDIN: linkedin.com/in/siva-shankaran" },
    { id: 'spark-ai', name: 'Spark AI', icon: '🤖', content: "Spark AI Chatbot" },
    { id: 'pixa', name: 'Pixa.app', icon: '🎨', content: "Pixel Art Generator" },
  ];

  // Size only depends on actual focus (zoom-in state)
  const size = focused ? { w: 2.4, h: 1.35, df: 0.33 } : { w: 1.6, h: 0.9, df: 0.22 };
  // Screen content is visible if focused OR hovered
  const isVisible = focused || hovered;

  return (
    <group position={[0, 0.4, 0.01]}>
      <mesh rotation={[-0.1, 0, 0]}>
        <planeGeometry args={[size.w, size.h]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      <Html
        transform
        distanceFactor={size.df}
        position={[0, 0, 0.03]}
        rotation={[-0.1, 0, 0]}
        className="pointer-events-none select-none"
      >
        <div 
          className={`w-[2560px] h-[1440px] bg-[#1a1a1a] relative overflow-hidden font-sans transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'} ${focused ? 'pointer-events-auto' : 'pointer-events-none'}`}
          style={{ 
            boxShadow: 'inset 0 0 400px rgba(0,0,0,0.8)'
          }}
        >
          {/* Taskbar */}
          {!isLocked && (
            <div className="absolute bottom-0 w-full h-48 bg-black/95 backdrop-blur-xl flex items-center px-24 justify-between border-t border-white/20 z-50">
              <div className="flex items-center gap-24">
                <div 
                  className="w-28 h-28 bg-[#00ff41] rounded-md flex items-center justify-center text-black font-black text-6xl shadow-[0_0_60px_rgba(0,255,65,0.8)] cursor-pointer"
                  onClick={() => setIsLocked(true)}
                >S</div>
                <div className="flex flex-col">
                  <div className="text-white text-5xl uppercase tracking-[0.4em] font-black">Spark_OS v2.4</div>
                  <div className="flex items-center gap-12 mt-2">
                    <div className="flex items-center gap-8 bg-[#00ff41]/20 border border-[#00ff41]/40 px-12 py-2 rounded-full">
                      <div className="w-4 h-4 bg-[#00ff41] rounded-full animate-ping"></div>
                      <span className="text-[#00ff41] text-xl font-black uppercase tracking-widest">AI ACTIVE</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-[#00ff41] text-6xl font-mono font-black">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}

          {isLocked ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
              <button 
                onClick={() => setIsLocked(false)}
                className="group relative flex flex-col items-center gap-12 transition-all hover:scale-110 active:scale-95"
              >
                <div className="w-96 h-96 bg-[#00ff41] rounded-3xl flex items-center justify-center text-black font-black text-[12rem] shadow-[0_0_150px_rgba(0,255,65,0.4)] group-hover:shadow-[0_0_200px_rgba(0,255,65,0.8)] transition-all">
                  S
                </div>
                <div className="text-[#00ff41] text-5xl uppercase tracking-[1em] font-black opacity-60 group-hover:opacity-100 animate-pulse mt-12">
                  CLICK TO UNLOCK
                </div>
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Icons Container */}
              <div className="relative h-[1200px] w-full flex flex-col pt-32">
                {/* Glowing Spark AI Button at top */}
                <div className="flex justify-center mb-16 px-48">
                  <button 
                    onClick={() => setOpenWindow('spark-ai')}
                    className="group relative flex items-center gap-8 bg-black/80 px-16 py-12 rounded-full border-4 border-[#00ff41]/30 hover:border-[#00ff41] transition-all hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(0,255,65,0.1)] hover:shadow-[0_0_80px_rgba(0,255,65,0.3)]"
                  >
                    <div className="text-6xl animate-pulse">🤖</div>
                    <div className="flex flex-col items-start translate-y-[-1px]">
                      <span className="text-[#00ff41] text-4xl font-black uppercase tracking-[0.1em] group-hover:text-white transition-colors">Chat with Spark AI</span>
                      <span className="text-white/40 text-xl font-bold uppercase tracking-[0.3em]">Ask me anything about Siva</span>
                    </div>
                  </button>
                </div>

                <div 
                  className="flex-1 p-48 flex flex-row flex-wrap gap-48 w-full overflow-y-auto no-scrollbar content-start"
                >
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => setOpenWindow(folder.id)}
                      className="flex flex-col items-center group cursor-pointer w-[400px]"
                    >
                      <div className={`text-[18rem] mb-12 group-hover:scale-110 transition-transform drop-shadow-[0_40px_80px_rgba(0,0,0,0.8)] ${folder.id === 'spark-ai' ? 'animate-pulse text-[#00ff41] drop-shadow-[0_0_40px_rgba(0,255,65,1)]' : ''}`}>
                        {folder.id === 'spark-ai' ? '👾' : folder.icon}
                      </div>
                      <span className={`text-4xl font-black text-white bg-black/80 px-16 py-8 rounded-full group-hover:bg-[#00ff41] group-hover:text-black transition-all whitespace-nowrap border-4 border-white/30 ${folder.id === 'spark-ai' ? 'shadow-[0_0_30px_rgba(0,255,65,0.8)]' : ''}`}>
                        {folder.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Windows */}
              <AnimatePresence>
                {openWindow && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 100 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 100 }}
                className={`absolute ${openWindow === 'spark-ai' ? 'top-16 left-16 right-16 bottom-32' : 'top-32 left-32 right-32 bottom-48'} bg-[#f8f9fa] rounded-[5rem] shadow-[0_100px_200px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col border-8 border-white/50 backdrop-blur-3xl`}
              >
                {/* Window Header */}
                <div className="h-40 bg-[#e9ecef] flex items-center justify-between px-20 border-b-4 border-black/10">
                  <div className="flex items-center gap-10">
                    <span className="text-6xl font-black text-[#2c3e50] uppercase tracking-tighter">
                      {folders.find(f => f.id === openWindow)?.name}
                    </span>
                  </div>
                  <button 
                    onClick={() => setOpenWindow(null)}
                    className="w-24 h-24 flex items-center justify-center bg-red-500 text-white rounded-full text-5xl font-black hover:bg-red-600 transition-all hover:rotate-90 shadow-2xl"
                  >
                    ✕
                  </button>
                </div>
                {/* Window Content */}
                <div className={`flex-1 ${openWindow === 'spark-ai' || openWindow === 'pixa' ? 'p-16' : 'p-32'} text-[#2c3e50] font-mono text-6xl whitespace-pre-wrap leading-relaxed overflow-y-auto custom-scrollbar`}>
                  {openWindow === 'spark-ai' ? (
                    <SparkAIChat onNavigate={(id) => setOpenWindow(id)} />
                  ) : openWindow === 'pixa' ? (
                    <PixaApp onApply={onPixaImageGenerated} />
                  ) : (
                    <>
                      <div className="mb-16 text-3xl font-black opacity-40 border-b-4 border-black/10 pb-10 flex items-center gap-8">
                        <span className="w-8 h-8 bg-blue-500 rounded-full animate-pulse"></span>
                        FILE_SYSTEM // ROOT / USER / {openWindow?.toUpperCase()}
                      </div>
                      <div className={`text-[#2c3e50] drop-shadow-sm font-bold ${(openWindow === 'education' || openWindow === 'experience') ? 'text-justify' : ''}`}>
                        {openWindow === 'projects' ? (
                      <div className="w-full h-full">
                        {selectedRepo ? (
                          <div className="flex flex-col gap-16">
                            <button 
                              onClick={() => setSelectedRepo(null)}
                              className="w-fit px-16 py-8 bg-black/10 hover:bg-black/20 rounded-lg flex items-center gap-8 text-4xl transition-all mb-16"
                            >
                              ← Back to Projects
                            </button>
                            <div className="text-8xl font-black text-blue-600 mb-8">{selectedRepo.name}</div>
                            <div className="text-5xl leading-relaxed opacity-80 mb-16">{selectedRepo.description || "No description provided."}</div>
                            <div className="flex flex-wrap gap-16 mb-24">
                              {selectedRepo.language && (
                                <span className="px-12 py-4 bg-orange-100 text-orange-700 rounded-full text-3xl font-black">
                                  {selectedRepo.language}
                                </span>
                              )}
                              <span className="px-12 py-4 bg-blue-100 text-blue-700 rounded-full text-3xl font-black">
                                ⭐ {selectedRepo.stargazers_count}
                              </span>
                            </div>
                            <a 
                              href={selectedRepo.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-fit px-24 py-12 bg-black text-white rounded-xl text-5xl font-black hover:scale-105 transition-transform flex items-center gap-12"
                            >
                              View on GitHub ↗
                            </a>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-24">
                            {isLoadingRepos ? (
                              <div className="col-span-3 flex flex-col items-center justify-center py-64 gap-16">
                                <div className="w-24 h-24 border-8 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <div className="text-4xl font-black opacity-40">FETCHING REPOSITORIES...</div>
                              </div>
                            ) : (
                              githubRepos.map((repo) => (
                                <button
                                  key={repo.id}
                                  onClick={() => setSelectedRepo(repo)}
                                  className="flex flex-col items-center p-16 bg-white/50 hover:bg-white rounded-2xl border-4 border-black/5 transition-all group"
                                >
                                  <div className="text-9xl mb-8 group-hover:scale-110 transition-transform">📂</div>
                                  <div className="text-3xl font-black text-center truncate w-full">{repo.name}</div>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {folders.find(f => f.id === openWindow)?.content.split('\n').map((line, i) => {
                          let colorClass = "";
                          if (openWindow === 'education' && (line.includes('Bachelor of Technology') || line.includes('Higher Secondary Education'))) {
                            colorClass = "text-blue-600 font-black";
                          } else if (openWindow === 'experience' && ['App development Intern', 'Artificial Intelligence Intern', 'Data Science Intern', 'Full Stack Development Intern'].some(role => line.includes(role))) {
                            colorClass = "text-orange-600 font-black";
                          } else if (openWindow === 'skills') {
                            if (line === 'TECHNICAL') colorClass = "text-blue-600 font-black mt-8 mb-4 border-b-2 border-blue-200 w-fit";
                            else if (line === 'TOOLS') colorClass = "text-purple-600 font-black mt-8 mb-4 border-b-2 border-purple-200 w-fit";
                            else if (line === 'SOFT SKILLS') colorClass = "text-green-600 font-black mt-8 mb-4 border-b-2 border-green-200 w-fit";
                            else if (line.startsWith('-')) colorClass = "pl-8 opacity-90";
                          } else if (openWindow === 'contact') {
                            if (line === 'CONNECT_WITH_ME:') colorClass = "text-[#00ff41] font-black mb-8 border-b-2 border-[#00ff41]/20 w-fit";
                            else if (line.includes('sivashankaran400@gmail.com')) {
                              return (
                                <div key={i} className="pl-8 flex items-center gap-4 group/link">
                                  <span className="opacity-90">- EMAIL:</span>
                                  <a href="mailto:sivashankaran400@gmail.com" className="text-blue-600 hover:underline">sivashankaran400@gmail.com</a>
                                </div>
                              );
                            } else if (line.includes('github.com/Shivaspark')) {
                              return (
                                <div key={i} className="pl-8 flex items-center gap-4">
                                  <span className="opacity-90">- GITHUB:</span>
                                  <a href="https://github.com/Shivaspark" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">github.com/Shivaspark</a>
                                </div>
                              );
                            } else if (line.includes('linkedin.com/in/siva-shankaran')) {
                              return (
                                <div key={i} className="pl-8 flex items-center gap-4">
                                  <span className="opacity-90">- LINKEDIN:</span>
                                  <a href="https://linkedin.com/in/siva-shankaran" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">linkedin.com/in/siva-shankaran</a>
                                </div>
                              );
                            }
                          }
                          return (
                            <div key={i} className={colorClass}>
                              {line || "\u00A0"}
                            </div>
                          );
                        })}
                        {openWindow === 'contact' && (
                          <div className="mt-24 flex justify-center pb-24">
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.dispatchEvent(new CustomEvent('focus-typewriter'));
                                setOpenWindow(null);
                              }}
                              className="bg-[#00ff41] text-black px-24 py-16 rounded-2xl font-black text-6xl hover:scale-105 active:scale-95 transition-all shadow-[0_30px_60px_rgba(0,255,65,0.4)] flex items-center gap-12 group cursor-pointer pointer-events-auto"
                              style={{ border: '8px solid black' }}
                            >
                              <span className="text-8xl group-hover:rotate-12 transition-transform">📧</span> 
                              <span>CONTACT ME_</span>
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Boot Overlay */}
          {!isVisible && (
            <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-[#00ff41] font-mono z-[100]">
              <div className="text-[10rem] animate-pulse mb-16 tracking-tighter font-black">SPARK_OS</div>
              <div className="text-2xl opacity-60 tracking-[1em] font-black">INITIALIZING KERNEL...</div>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

function Typewriter({ text, onComplete }: { text: string, onComplete?: () => void }) {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setDisplayedText("");
    setIndex(0);
  }, [text]);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[index]);
        setIndex(prev => prev + 1);
      }, 10);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [index, text, onComplete]);

  return <span>{displayedText}</span>;
}

function Voxel({ position, color = "#4a4a4a", size = 1 }: { position: [number, number, number], color?: string, size?: number }) {
  return (
    <mesh position={position} castShadow receiveShadow scale={[size, size, size]}>
      <primitive object={BOX_GEO} attach="geometry" />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function RubiksCube({ position, onFocus, isFocused }: { position: [number, number, number], onFocus: () => void, isFocused: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [hoveredTile, setHoveredTile] = useState<{ face: string, index: number } | null>(null);
  const bus = useProjectBus();
  const dialogueBus = useDialogueBus();

  const techSkills = ["PYTHON", "SQL", "ML", "PANDAS", "NUMPY", "TENSOR\nFLOW", "COMPUTER\nVISION", "PYTORCH", "GIT"];
  const softSkills = [
    "QUICK\nLEARNING", "COMMUNI-\nCATION", "ADAPTA-\nBILITY",
    "LEADER-\nSHIP", "PROBLEM\nSOLVING", "TEAM-\nWORK",
    "TEAM\nMGMT", "TIME\nMGMT", "EVENT\nMGMT"
  ];

  const faceSkills = {
    front: techSkills,
    top: techSkills,
    left: techSkills,
    back: softSkills,
    bottom: softSkills,
    right: softSkills
  };

  const textures = useMemo(() => {
    const createTex = (text: string, bgColor: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, 512, 512);
        
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 40;
        ctx.strokeRect(0, 0, 512, 512);

        ctx.fillStyle = 'white'; 
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 15;
        ctx.font = '900 75px sans-serif'; // Decreased from 90px to 75px to fit cells better
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const lines = text.split('\n');
        lines.forEach((line, i) => {
          const y = 256 + (i - (lines.length - 1) / 2) * 90;
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 12;
          ctx.strokeText(line, 256, y);
          ctx.fillStyle = 'white';
          ctx.fillText(line, 256, y);
        });
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 16;
      tex.needsUpdate = true;
      return tex;
    };

    const faceColors = {
      front: "#ff4444",
      back: "#ff9800",
      top: "#ffffff",
      bottom: "#ffeb3b",
      left: "#00ff41",
      right: "#4a90e2"
    };

    const allTextures: Record<string, THREE.Texture[]> = {};
    Object.entries(faceColors).forEach(([face, color]) => {
      const skills = faceSkills[face as keyof typeof faceSkills];
      allTextures[face] = skills.map(skill => createTex(skill, color));
    });

    return allTextures;
  }, []);

  // Shared materials for cubies
  const materials = useMemo(() => {
    const blackMat = new THREE.MeshStandardMaterial({ color: "#000000" });
    
    const createMat = (color: string, tex: THREE.Texture) => new THREE.MeshStandardMaterial({ 
      color, 
      map: tex,
      emissive: "#00ff41",
      emissiveMap: tex,
      emissiveIntensity: 0,
      metalness: 0.1,
      roughness: 0.2
    });

    const allMaterials: Record<string, THREE.MeshStandardMaterial[]> = {};
    Object.entries(textures).forEach(([face, texArray]) => {
      const color = face === 'front' ? "#ff4444" : 
                    face === 'back' ? "#ff9800" :
                    face === 'top' ? "#ffffff" :
                    face === 'bottom' ? "#ffeb3b" :
                    face === 'left' ? "#00ff41" : "#4a90e2";
      allMaterials[face] = texArray.map(tex => createMat(color, tex));
    });

    return {
      black: blackMat,
      ...allMaterials
    } as any;
  }, [textures]);

  const targetQuaternion = useRef(new THREE.Quaternion());

  useFrame((state) => {
    if (isFocused) {
      const current = hoveredTile;
      
      Object.entries(materials).forEach(([faceName, mat]) => {
        if (Array.isArray(mat)) {
          mat.forEach((m, i) => {
            const isHovered = current && current.face === faceName && current.index === i;
            const target = isHovered ? 2.5 : 0;
            if (m.emissiveIntensity !== target) {
              m.emissiveIntensity = THREE.MathUtils.lerp(m.emissiveIntensity, target, 0.2);
              if (Math.abs(m.emissiveIntensity - target) < 0.01) m.emissiveIntensity = target;
            }
          });
        }
      });
    }

    if (groupRef.current && isFocused) {
      groupRef.current.quaternion.slerp(targetQuaternion.current, 0.1);
      groupRef.current.position.y = 0;
    }
  });

  // Cube state: 27 cubies
  const [cubies] = useState(() => {
    const items = [];
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          items.push({
            id: `${x}${y}${z}`,
            pos: new THREE.Vector3(x * 0.22, y * 0.22, z * 0.22),
            rotation: new THREE.Euler(0, 0, 0),
            initialCoords: { x, y, z }
          });
        }
      }
    }
    return items;
  });

  const getIndex = (c: any, face: string) => {
    let col = 0, row = 0;
    if (face === 'front') { col = c.initialCoords.x + 1; row = 1 - c.initialCoords.y; }
    else if (face === 'back') { col = 1 - c.initialCoords.x; row = 1 - c.initialCoords.y; }
    else if (face === 'top') { col = c.initialCoords.x + 1; row = c.initialCoords.z + 1; }
    else if (face === 'bottom') { col = c.initialCoords.x + 1; row = 1 - c.initialCoords.z; }
    else if (face === 'left') { col = 1 - c.initialCoords.z; row = 1 - c.initialCoords.y; }
    else if (face === 'right') { col = c.initialCoords.z + 1; row = 1 - c.initialCoords.y; }
    return Math.max(0, Math.min(8, row * 3 + col));
  };

  const handleFaceClick = (face: string, index: number) => {
    console.log(`RubiksCube: Face clicked - ${face}, index - ${index}`);
    if (!isFocused) {
      onFocus();
      return;
    }
    
    const skill = faceSkills[face as keyof typeof faceSkills][index].replace('\n', ' ');
    const normalizedSkill = skill.toUpperCase().replace(/[-\s]/g, '');
    let text = "";
    
    const isSoftSkillFace = ['back', 'bottom', 'right'].includes(face);
    
    if (isSoftSkillFace) {
      if (normalizedSkill.includes("QUICKLEARNING")) {
        text = "Siva has the ability to learn something quick, often building models while learning the underlying concepts.";
      } else if (["COMMUNICATION", "LEADERSHIP", "TEAMMGMT", "TIMEMGMT", "EVENTMGMT"].some(s => normalizedSkill.includes(s))) {
        text = `Siva gained extensive experience in ${skill.toLowerCase().replace('-', '')} through his roles as Vice President and Professional Service Director in the Rotaract Club.`;
      } else if (["PROBLEMSOLVING", "ADAPTABILITY", "TEAMWORK"].some(s => normalizedSkill.includes(s))) {
        text = `Siva demonstrated strong ${skill.toLowerCase().replace('-', '')} as the Lead of GDG OnCampus.`;
      }
    } else {
      text = `Siva is highly proficient in ${skill}. `;
      if (normalizedSkill.includes("PYTHON")) text += "It's his primary language for AI and PUMIS development.";
      else if (normalizedSkill.includes("SQL")) text += "He uses it to build robust data architectures and relational models.";
      else if (normalizedSkill.includes("ML")) text += "He trains advanced neural networks for urban mobility and predictive analytics.";
      else if (normalizedSkill.includes("PANDAS")) text += "His tool of choice for heavy-duty data manipulation and analysis.";
      else if (normalizedSkill.includes("NUMPY")) text += "The foundation of numerical computing in his AI stack.";
      else if (normalizedSkill.includes("TENSORFLOW")) text += "He builds and deploys deep learning models using this powerful framework.";
      else if (normalizedSkill.includes("COMPUTERVISION")) text += "He develops algorithms for object detection and spatial analysis.";
      else if (normalizedSkill.includes("PYTORCH")) text += "He leverages PyTorch for flexible and dynamic neural network research.";
      else if (normalizedSkill.includes("GIT")) text += "He maintains clean, collaborative codebases using version control.";
    }

    if (text) {
      dialogueBus.trigger();
      window.dispatchEvent(new CustomEvent('spark-dialogue', { detail: text }));
    }
  };

  const rotateCube = (axis: 'x' | 'y', direction: 1 | -1) => {
    const quat = new THREE.Quaternion();
    const angle = (Math.PI / 2) * direction;
    if (axis === 'x') {
      quat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle);
    } else {
      quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    }
    targetQuaternion.current.premultiply(quat);
  };

  useEffect(() => {
    const handleRotate = (e: any) => {
      const { axis, direction } = e.detail;
      rotateCube(axis, direction);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFocused) return;
      
      switch (e.code) {
        case 'ArrowUp':
          e.preventDefault();
          rotateCube('x', -1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          rotateCube('x', 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          rotateCube('y', 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          rotateCube('y', -1);
          break;
      }
    };

    window.addEventListener('rubiks-rotate', handleRotate);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('rubiks-rotate', handleRotate);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFocused]);

  const handleMeshClick = (e: any, cubieId: string) => {
    e.stopPropagation();
    if (!isFocused) {
      onFocus();
      return;
    }
    const faceIndex = e.faceIndex;
    if (faceIndex === undefined) return;

    const cubie = cubies.find(c => c.id === cubieId);
    if (cubie) {
      const faces = ["right", "left", "top", "bottom", "front", "back"];
      const faceName = faces[Math.floor(faceIndex / 2)];
      handleFaceClick(faceName, getIndex(cubie, faceName));
    }
  };

  // Dragging removed in favor of arrow buttons
  useEffect(() => {
    if (!isFocused) return;
  }, [isFocused]);

  const handlePointerMove = (e: any) => {
    // Handled by window listener for better drag experience
  };

  const handlePointerUp = (e: any) => {
    // Handled by window listener for better drag experience
  };

  return (
    <group 
      position={position}
      onPointerOver={() => {
        setHovered(true);
        if (!isFocused) bus.show({ title: "Skills Cube", desc: "Interactive 3D Expertise" });
      }}
      onPointerOut={() => {
        setHovered(false);
        bus.hide();
      }}
    >
      <group ref={groupRef}>
        {cubies.map((c) => {
          return (
            <mesh 
              key={c.id} 
              position={c.pos} 
              rotation={c.rotation}
              onPointerDown={(e) => {
                e.stopPropagation();
                handleMeshClick(e, c.id);
              }}
              onPointerOver={(e) => {
                const faceIndex = e.faceIndex;
                if (faceIndex === undefined) return;
                const faces = ["right", "left", "top", "bottom", "front", "back"];
                const faceName = faces[Math.floor(faceIndex / 2)];
                const index = getIndex(c, faceName);
                console.log(`RubiksCube: Hover - ${faceName}, index - ${index}`);
                setHoveredTile({ face: faceName, index });
              }}
              onPointerOut={(e) => {
                setHoveredTile(null);
              }}
              scale={[0.2, 0.2, 0.2]}
            >
              <primitive object={BOX_GEO} attach="geometry" />
              <primitive object={c.initialCoords.x === 1 ? (materials.right as any)[getIndex(c, 'right')] : materials.black} attach="material-0" />
              <primitive object={c.initialCoords.x === -1 ? (materials.left as any)[getIndex(c, 'left')] : materials.black} attach="material-1" />
              <primitive object={c.initialCoords.y === 1 ? (materials.top as any)[getIndex(c, 'top')] : materials.black} attach="material-2" />
              <primitive object={c.initialCoords.y === -1 ? (materials.bottom as any)[getIndex(c, 'bottom')] : materials.black} attach="material-3" />
              <primitive object={c.initialCoords.z === 1 ? (materials.front as any)[getIndex(c, 'front')] : materials.black} attach="material-4" />
              <primitive object={c.initialCoords.z === -1 ? (materials.back as any)[getIndex(c, 'back')] : materials.black} attach="material-5" />
            </mesh>
          );
        })}
      </group>
      
      {!isFocused && hovered && <pointLight intensity={2} color="#00ff41" position={[0, 0, 1]} />}
    </group>
  );
}

function ProjectVoxel({ 
  position, 
  color = "#4a90e2", 
  project,
  onFocus
}: { 
  position: [number, number, number], 
  color?: string, 
  project: { title: string, desc: string },
  onFocus: () => void
}) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const bus = useProjectBus();

  useFrame((state) => {
    if (meshRef.current) {
      const targetScale = hovered ? 1.2 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      if (hovered) {
        meshRef.current.position.y = position[1] + Math.sin(state.clock.getElapsedTime() * 10) * 0.05;
      } else {
        meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, position[1], 0.1);
      }
    }
  });

  return (
    <mesh 
      ref={meshRef}
      position={position}
      castShadow
      receiveShadow
      scale={[0.6, 0.6, 0.6]}
      onClick={(e) => {
        e.stopPropagation();
        onFocus();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        bus.show(project);
      }}
      onPointerOut={() => {
        setHovered(false);
        bus.hide();
      }}
    >
      <primitive object={BOX_GEO} attach="geometry" />
      <meshStandardMaterial color={hovered ? "#ffffff" : color} />
      {hovered && <pointLight intensity={0.5} color={color} />}
    </mesh>
  );
}

function WardrobeItem({ 
  position, 
  title, 
  desc, 
  onClick, 
  children 
}: { 
  position: [number, number, number], 
  title: string, 
  desc: string, 
  onClick: () => void,
  children: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const pBus = useProjectBus();

  useFrame((state) => {
    if (groupRef.current) {
      if (hovered) {
        groupRef.current.position.y = position[1] + Math.sin(state.clock.getElapsedTime() * 8) * 0.05;
        groupRef.current.scale.lerp(new THREE.Vector3(1.1, 1.1, 1.1), 0.1);
      } else {
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, position[1], 0.1);
        groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
    }
  });

  return (
    <group 
      ref={groupRef}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        pBus.show({ title, desc });
      }}
      onPointerOut={() => {
        setHovered(false);
        pBus.hide();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </group>
  );
}

function ResumeOverlay({ onClose }: { onClose: () => void }) {
  const [activeFile, setActiveFile] = useState<'resume' | 'cv'>('resume');
  
  const files = {
    resume: { name: "Sivashankaran_Resume", path: "/sivashankaran_resume.pdf" },
    cv: { name: "Sivashankaran_CV", path: "/Sivashankaran_CV.pdf" }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-8"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#1a1a1a] text-[#00ff41] w-full max-w-6xl h-[90vh] flex flex-col rounded-3xl border-4 border-[#00ff41]/30 shadow-[0_0_100px_rgba(0,255,65,0.1)] overflow-hidden relative"
      >
        {/* Header */}
        <div className="p-8 bg-black/60 border-b-2 border-[#00ff41]/20 flex items-center justify-between">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveFile('resume')}
              className={`px-8 py-3 rounded-lg font-black text-2xl transition-all border-2 ${activeFile === 'resume' ? 'bg-[#00ff41] text-black border-[#00ff41]' : 'bg-transparent text-[#00ff41]/60 border-[#00ff41]/20 hover:border-[#00ff41]/40'}`}
            >
              📄 RESUME.PDF
            </button>
            <button 
              onClick={() => setActiveFile('cv')}
              className={`px-8 py-3 rounded-lg font-black text-2xl transition-all border-2 ${activeFile === 'cv' ? 'bg-[#00ff41] text-black border-[#00ff41]' : 'bg-transparent text-[#00ff41]/60 border-[#00ff41]/20 hover:border-[#00ff41]/40'}`}
            >
              📄 CV.PDF
            </button>
          </div>
          
          <div className="flex items-center gap-8">
            <a 
              href={files[activeFile].path}
              download={files[activeFile].name + '.pdf'}
              className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-black text-2xl transition-all flex items-center gap-4"
            >
              ⬇️ DOWNLOAD
            </a>
            <button 
              onClick={onClose}
              className="w-16 h-16 flex items-center justify-center bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded-full text-4xl font-black transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* PDF Viewer Area */}
        <div className="flex-1 bg-[#121212] relative flex flex-col items-center justify-center">
          <object 
            data={files[activeFile].path} 
            type="application/pdf"
            className="w-full h-full"
          >
            <div className="text-center p-12 space-y-4 bg-black/40 rounded-3xl border-2 border-[#00ff41]/20 max-w-[80%]">
              <p className="text-3xl font-black mb-4 opacity-80 uppercase tracking-tighter">PDF Preview Blocked</p>
              <p className="text-xl text-gray-400 mb-6 max-w-md mx-auto">Browser security prevents displaying PDFs inside this preview frame.</p>
              <div className="flex justify-center">
                <a 
                  href={files[activeFile].path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-10 py-5 bg-[#00ff41] text-black rounded-xl font-black text-2xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,255,65,0.3)]"
                >
                  OPEN IN NEW TAB ↗
                </a>
              </div>
            </div>
          </object>
          
          {/* Always show a small reminder if it's likely blocked */}
          <div className="absolute bottom-8 right-8 pointer-events-none">
             <span className="text-xs font-mono text-[#00ff41]/40">HINT: IF BLOCKED, USE DOWNLOAD OR NEW TAB BUTTONS</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/60 border-t-2 border-[#00ff41]/20 flex justify-center">
          <p className="text-[#00ff41]/40 text-xl font-mono uppercase tracking-[0.5em]">Spark_OS Career Matrix v3.0</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TypewriterOverlay({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const mailtoUrl = `mailto:sivashankaran400@gmail.com?subject=${encodeURIComponent(subject || "Message from Portfolio")}&body=${encodeURIComponent(message)}`;

  // Play typewriter sounds
  const playClack = () => {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3");
    audio.volume = 0.2;
    audio.play().catch(() => {});
  };

  const handleCopy = () => {
    navigator.clipboard.writeText("sivashankaran400@gmail.com");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-8 pointer-events-none"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-black/95 backdrop-blur-xl text-[#00ff41] w-full max-w-2xl rounded-2xl border-2 border-[#00ff41]/50 shadow-[0_0_80px_rgba(34,197,94,0.4)] overflow-hidden flex flex-col pointer-events-auto"
      >
        <div className="p-4 bg-black/40 border-b border-[#00ff41]/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{isSent ? "📡" : "⌨️"}</span>
            <h2 className="text-sm font-pixel tracking-tight uppercase">
              {isSent ? "Transmission Logged" : "Analog Transmission_"}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-red-500/10 hover:bg-red-500/30 text-red-500 rounded-full text-xl font-black transition-all"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 text-center font-pixel">
          {isSent ? (
            <div className="h-80 flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-500">
              <div className="w-24 h-24 rounded-full border-4 border-[#00ff41] border-t-transparent animate-spin mb-4" />
              <div className="space-y-4">
                <p className="text-xl font-black uppercase tracking-tighter">Protocol Active</p>
                <p className="text-[10px] leading-loose opacity-60 max-w-sm mx-auto">Mail client triggered. If blocked, reach out via:</p>
                <button 
                  onClick={handleCopy}
                  className="bg-white/5 border border-[#00ff41]/30 px-6 py-4 rounded-lg font-pixel text-[10px] hover:bg-white/10 transition-all flex items-center gap-3 mx-auto"
                >
                  {copied ? "COPIED! ✅" : "sivashankaran400@gmail.com 📋"}
                </button>
              </div>
              <button 
                onClick={onClose}
                className="text-[#00ff41]/40 hover:text-[#00ff41] underline font-pixel uppercase tracking-widest text-[8px]"
              >
                Return to Workspace
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-4 text-left">
                <div className="space-y-1">
                   <p className="text-[8px] opacity-40 uppercase tracking-[0.3em]">Protocol.Subject</p>
                   <input 
                    type="text"
                    placeholder="ENTER_TOPIC..."
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      playClack();
                    }}
                    className="w-full bg-black/40 border border-[#00ff41]/20 rounded-lg p-4 text-[10px] font-pixel focus:border-[#00ff41] outline-none transition-all text-[#00ff41] placeholder:text-[#00ff41]/20"
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-[8px] opacity-40 uppercase tracking-[0.3em]">Protocol.Body</p>
                  <textarea 
                    placeholder="TYPE YOUR MESSAGE HERE..."
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      playClack();
                    }}
                    className="w-full h-48 bg-black/40 border border-[#00ff41]/20 rounded-lg p-4 text-[10px] font-pixel focus:border-[#00ff41] outline-none transition-all text-[#00ff41] resize-none placeholder:text-[#00ff41]/20 leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <a 
                  href={mailtoUrl}
                  onClick={() => {
                    setIsSent(true);
                    new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3").play().catch(() => {});
                  }}
                  className={`w-full bg-[#00ff41] text-black py-6 rounded-xl font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(0,255,65,0.4)] flex items-center justify-center gap-3 ${!message ? 'opacity-30 pointer-events-none' : ''}`}
                >
                  EXECUTE PROTOCOL
                </a>
                
                <button 
                  onClick={handleCopy}
                  className="w-full bg-white/5 border border-white/10 text-white/40 py-3 rounded-xl font-bold text-[8px] hover:text-white hover:bg-white/10 transition-all uppercase tracking-[0.4em]"
                >
                  {copied ? "Address Copied!" : "Copy Digital Address"}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function VoxelTypewriter({ position, onFocus }: { 
  position: [number, number, number],
  onFocus: () => void
}) {
  const [hovered, setHovered] = useState(false);
  const pBus = useProjectBus();

  return (
    <group 
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onFocus();
      }}
      onPointerOver={() => {
        setHovered(true);
        pBus.show({ 
          title: "Contact Siva", 
          desc: "Write an E-Mail", 
          color: "#00ff41" 
        });
      }}
      onPointerOut={() => {
        setHovered(false);
        pBus.hide();
      }}
    >
      {/* Tall Table Legs with more detail */}
      {[[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]].map((p, i) => (
        <group key={i} position={[p[0], -0.55, p[1]]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.08, 1.1, 0.08]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          <mesh position={[0, -0.5, 0]}>
            <boxGeometry args={[0.12, 0.05, 0.12]} />
            <meshStandardMaterial color="#0a0a0a" />
          </mesh>
        </group>
      ))}
      
      {/* Table Top with edge detail */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.1, 0.8]} />
        <meshStandardMaterial color="#3e2723" />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.82, 0.05, 0.82]} />
        <meshStandardMaterial color="#2d1a1a" />
      </mesh>
      
      {/* Typewriter Body - More Complex Shape */}
      <mesh position={[0, 0.11, 0.05]} castShadow>
        <boxGeometry args={[0.55, 0.14, 0.4]} />
        <meshStandardMaterial color={hovered ? "#00ff41" : "#222"} />
      </mesh>
      
      {/* Keyboard Sloped Area with discrete keys */}
      <group position={[0.12, 0.16, 0.05]} rotation={[0, 0, -0.25]}>
        <mesh castShadow>
          <boxGeometry args={[0.35, 0.12, 0.45]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        {/* Decorative Key voxels */}
        {[-0.1, 0, 0.1].map((z) => (
          <mesh key={z} position={[0.1, 0.08, z]} castShadow>
            <boxGeometry args={[0.05, 0.05, 0.05]} />
            <meshStandardMaterial color="#333" />
          </mesh>
        ))}
      </group>
      
      {/* Carriage / Roller with better geometry */}
      <mesh position={[-0.18, 0.22, 0.05]} castShadow>
        <boxGeometry args={[0.18, 0.18, 0.6]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      {/* Carriage Handles */}
      <mesh position={[-0.18, 0.22, 0.3]} rotation={[Math.PI/2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.05, 12]} />
        <meshStandardMaterial color="#444" />
      </mesh>
      <mesh position={[-0.18, 0.22, -0.2]} rotation={[Math.PI/2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.05, 12]} />
        <meshStandardMaterial color="#444" />
      </mesh>

      {/* Paper sticking out with a curve or multi-segments */}
      <group position={[-0.2, 0.4, 0.05]} rotation={[0, 0, 0.15]}>
        <mesh castShadow>
          <boxGeometry args={[0.02, 0.35, 0.38]} />
          <meshStandardMaterial color="#fff" emissive="#ffffff" emissiveIntensity={0.1} />
        </mesh>
        {/* Header line on paper */}
        <mesh position={[0.015, 0.1, 0]} castShadow>
          <boxGeometry args={[0.005, 0.01, 0.3]} />
          <meshStandardMaterial color="#ccc" />
        </mesh>
      </group>

      {/* Type Bars (The arms that strike the paper) */}
      <mesh position={[0, 0.22, 0.05]} rotation={[0, 0, 0.8]} castShadow>
        <boxGeometry args={[0.1, 0.02, 0.2]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      
      {/* Ambient Glow */}
      {hovered && (
        <>
          <pointLight intensity={2} color="#00ff41" position={[0, 0.8, 0]} distance={4} />
          <pointLight intensity={0.5} color="#00ff41" position={[-0.3, 0.4, 0]} distance={2} />
        </>
      )}
    </group>
  );
}

function VoxelWardrobe({ position, onFocus }: { 
  position: [number, number, number],
  onFocus: (target: FocusTarget, text: string) => void
}) {
  const [resumeHovered, setResumeHovered] = useState(false);
  const pBus = useProjectBus();

  const booksText = "EDUCATION:\n\n* Bachelor of technology in Information Technology - Info institute of engineering (2022-2026)\n\n* Specialization in AI/ML: Deep-diving into Natural Language Processing (NLP) and Generative AI through the Agentic AI Intensive course.\n\n* Data Science Residency: Currently stationed in Bangalore, the Silicon Valley of India, focusing on advanced Data Science projects and industry applications.";
  const trophiesText = "ACHIEVEMENTS:\n\n* Best Outgoing Student (2026) - Awarded to the best outgoing student of the Department of IT at Info Institute of Engineering.\n\n* Exceptional Performer - Ranked top 5 among 250+ students in a professional development program conducted by Rotary club of Coimbatore.\n\n* Best Manager - First prize in best management competetion in conducted in intra college symposium.\n\n* Class Topper - Consistently ranking top position in the Department of IT.\n\n* Badminton - Consistently acquired top position in inter - college badminton competetions.";
  const badgesText = "POSITION OF RESPONSIBILITY:\n\n* Organizer - Google developer groups on campus\n\n* Vice President - Rotaract Club of Info institute of engineering";

  return (
    <group position={position}>
      {/* Main Frame (Bookshelf/Wardrobe) */}
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow scale={[1, 3, 3]}>
        <primitive object={BOX_GEO} attach="geometry" />
        <meshStandardMaterial color="#3e2723" />
      </mesh>

      {/* Resume Paper Sticking to the Side */}
      <mesh 
        position={[0, 1.8, 1.505]} 
        rotation={[0, 0, 0]} 
        onPointerOver={(e) => {
          e.stopPropagation();
          setResumeHovered(true);
          pBus.show({ title: "Resume Paper", desc: "Siva's Professional Credentials" });
        }}
        onPointerOut={() => {
          setResumeHovered(false);
          pBus.hide();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onFocus('resume', "Accessing career mainframe... opening resume protocol.");
        }}
      >
        <planeGeometry args={[1, 1.4]} />
        <meshStandardMaterial color={resumeHovered ? "#00ff41" : "#ffffff"} side={THREE.DoubleSide} />
        {/* Lines representing text */}
        <group position={[0, 0, 0.01]}>
          {[0.4, 0.2, 0, -0.2, -0.4].map((y, i) => (
            <mesh key={i} position={[0, y, 0]} scale={[0.8, 0.05, 0.01]}>
              <boxGeometry />
              <meshBasicMaterial color="#333" />
            </mesh>
          ))}
        </group>
      </mesh>
      {/* Shelves */}
      {[0.5, 1.5, 2.5].map((y) => (
        <mesh key={y} position={[0.1, y, 0]} castShadow receiveShadow scale={[0.9, 0.1, 2.8]}>
          <primitive object={BOX_GEO} attach="geometry" />
          <meshStandardMaterial color="#2d1a1a" />
        </mesh>
      ))}

      {/* Trophies Section (Top Shelf) */}
      <WardrobeItem 
        position={[0.45, 2.8, 0]} 
        title="Achievements" 
        desc="Trophies & Awards" 
        onClick={() => onFocus('wardrobe-trophies', trophiesText)}
      >
        {/* Voxel Trophy Models */}
        {[-0.6, 0.6].map((z, i) => (
          <group key={i} position={[0, -0.1, z]}>
            {/* Base */}
            <mesh position={[0, -0.1, 0]} scale={[0.3, 0.1, 0.3]} castShadow>
              <primitive object={BOX_GEO} attach="geometry" />
              <meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Stem */}
            <mesh position={[0, 0.15, 0]} scale={[0.1, 0.4, 0.1]} castShadow>
              <primitive object={BOX_GEO} attach="geometry" />
              <meshStandardMaterial color="#ffd700" />
            </mesh>
            {/* Cup Body */}
            <mesh position={[0, 0.45, 0]} scale={[0.4, 0.3, 0.4]} castShadow>
              <primitive object={BOX_GEO} attach="geometry" />
              <meshStandardMaterial color="#ffc107" />
            </mesh>
            {/* Handles */}
            <mesh position={[0, 0.5, 0.25]} scale={[0.1, 0.2, 0.1]} castShadow>
              <primitive object={BOX_GEO} attach="geometry" />
              <meshStandardMaterial color="#ffd700" />
            </mesh>
            <mesh position={[0, 0.5, -0.25]} scale={[0.1, 0.2, 0.1]} castShadow>
              <primitive object={BOX_GEO} attach="geometry" />
              <meshStandardMaterial color="#ffd700" />
            </mesh>
          </group>
        ))}
      </WardrobeItem>

      {/* Books Section (Middle Shelf) */}
      <WardrobeItem 
        position={[0.45, 1.8, 0]} 
        title="Education & Interests" 
        desc="Siva's Academic Lore" 
        onClick={() => onFocus('wardrobe-books', booksText)}
      >
        {/* Voxel Book Stack */}
        <group position={[0, -0.2, 0]}>
          {/* Bottom Book */}
          <mesh position={[0, 0.1, 0]} scale={[0.6, 0.15, 0.8]} castShadow>
            <primitive object={BOX_GEO} attach="geometry" />
            <meshStandardMaterial color="#2196f3" />
          </mesh>
          {/* Middle Book */}
          <mesh position={[-0.05, 0.25, 0.1]} rotation={[0, 0.1, 0]} scale={[0.5, 0.15, 0.7]} castShadow>
            <primitive object={BOX_GEO} attach="geometry" />
            <meshStandardMaterial color="#f44336" />
          </mesh>
          {/* Top Book */}
          <mesh position={[0.05, 0.4, -0.1]} rotation={[0, -0.15, 0]} scale={[0.55, 0.15, 0.6]} castShadow>
            <primitive object={BOX_GEO} attach="geometry" />
            <meshStandardMaterial color="#4caf50" />
          </mesh>
        </group>
      </WardrobeItem>

      {/* Badges Section (Bottom Shelf) */}
      <WardrobeItem 
        position={[0.45, 0.8, 0]} 
        title="Positions of Responsibility" 
        desc="Leadership Badges" 
        onClick={() => onFocus('wardrobe-badges', badgesText)}
      >
        {/* Voxel Badge Models */}
        {[-0.8, 0, 0.8].map((z, i) => (
          <group key={i} position={[0, -0.1, z]}>
            {/* Medal Plate */}
            <mesh position={[0, 0.3, 0]} rotation={[0.2, 0, 0]} scale={[0.1, 0.4, 0.4]} castShadow>
              <primitive object={BOX_GEO} attach="geometry" />
              <meshStandardMaterial color={['#e74c3c', '#f1c40f', '#2ecc71'][i]} metalness={0.5} roughness={0.5} />
            </mesh>
            {/* Ribbon Tail 1 */}
            <mesh position={[-0.05, 0.1, 0.1]} rotation={[0.4, 0, 0]} scale={[0.05, 0.3, 0.15]} castShadow>
              <primitive object={BOX_GEO} attach="geometry" />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            {/* Ribbon Tail 2 */}
            <mesh position={[-0.05, 0.1, -0.1]} rotation={[-0.4, 0, 0]} scale={[0.05, 0.3, 0.15]} castShadow>
              <primitive object={BOX_GEO} attach="geometry" />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}
      </WardrobeItem>
    </group>
  );
}

function VoxelComputerDesk({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Top */}
      <mesh position={[0, 1, 0]} castShadow receiveShadow scale={[3, 0.2, 1.5]}>
        <primitive object={BOX_GEO} attach="geometry" />
        <meshStandardMaterial color="#3e2723" />
      </mesh>
      {/* Legs */}
      <mesh position={[-1.3, 0.5, 0.5]} castShadow receiveShadow scale={[0.2, 1, 0.2]}>
        <primitive object={BOX_GEO} attach="geometry" />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[1.3, 0.5, 0.5]} castShadow receiveShadow scale={[0.2, 1, 0.2]}>
        <primitive object={BOX_GEO} attach="geometry" />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-1.3, 0.5, -0.5]} castShadow receiveShadow scale={[0.2, 1, 0.2]}>
        <primitive object={BOX_GEO} attach="geometry" />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[1.3, 0.5, -0.5]} castShadow receiveShadow scale={[0.2, 1, 0.2]}>
        <primitive object={BOX_GEO} attach="geometry" />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  );
}

function VoxelChair({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  const velocityRef = useRef(0);

  useFrame(() => {
    if (groupRef.current && velocityRef.current > 0.001) {
      groupRef.current.rotation.y += velocityRef.current;
      velocityRef.current *= 0.96; // Friction for a smooth stop
    } else if (velocityRef.current !== 0) {
      velocityRef.current = 0;
    }
  });

  const handleSpin = (e: any) => {
    e.stopPropagation();
    // Add to existing velocity if already spinning
    velocityRef.current = Math.min(velocityRef.current + 0.4, 1.0);
  };

  return (
    <group 
      ref={groupRef} 
      position={position} 
      rotation={[0, Math.PI / 4, 0]}
      onClick={handleSpin}
    >
      {/* Seat */}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow scale={[0.8, 0.1, 0.8]}>
        <primitive object={BOX_GEO} attach="geometry" />
        <meshStandardMaterial color="#0d1b3e" />
      </mesh>
      {/* Back */}
      <mesh position={[0, 1.1, -0.35]} castShadow receiveShadow scale={[0.8, 1, 0.1]}>
        <primitive object={BOX_GEO} attach="geometry" />
        <meshStandardMaterial color="#0d1b3e" />
      </mesh>
      {/* Leg */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow scale={[0.1, 0.6, 0.1]}>
        <primitive object={BOX_GEO} attach="geometry" />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  );
}

function PhotoFrame({ position, rotation, onFocus, isFocused }: { 
  position: [number, number, number], 
  rotation: [number, number, number],
  onFocus: () => void,
  isFocused: boolean
}) {
  // Use the uploaded image
  const texture = useTexture('/siva frame.png');
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (texture) {
      texture.anisotropy = 16;
      texture.needsUpdate = true;
    }
  }, [texture]);
  
  return (
    <group 
      position={position} 
      rotation={rotation}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onFocus();
      }}
    >
      {/* Frame Border */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.2, 1.6, 0.1]} />
        <meshStandardMaterial color={hovered ? "#00ff41" : "#2d2d2d"} />
      </mesh>
      {/* Photo Surface */}
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[1, 1.4]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    </group>
  );
}

function VoxelAvatar({ position, onFocus }: { position: [number, number, number], onFocus: () => void }) {
  const headRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const [isGreeting, setIsGreeting] = useState(false);
  const greetingTimer = useRef(0);
  
  const dBus = useDialogueBus();
  const skinMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e0ac69" }), []);
  const coatMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#757575" }), []);
  const pantsMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2c3e50" }), []);
  const hairMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#212121" }), []);
  const eyeMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#000000" }), []);
  const shirtMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff" }), []);
  const buttonMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#000000" }), []);

  useFrame((state, delta) => {
    if (headRef.current) {
      // Look towards mouse - adjusted for rotation to face camera
      const targetX = state.mouse.x * 0.8; 
      const targetY = state.mouse.y * 0.5;
      
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, targetX, 0.1);
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, -targetY, 0.1);
    }

    if (rightArmRef.current) {
      if (isGreeting) {
        greetingTimer.current += delta;
        // Raise arm upwards and outwards (screen left)
        const waveAngle = Math.sin(greetingTimer.current * 10) * 0.3;
        // Positive rotation on Z moves the hand away from the body for the right arm
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, Math.PI * 0.7 + waveAngle, 0.1);
        // Add some X rotation to lift it forward slightly
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -Math.PI * 0.2, 0.1);
        
        if (greetingTimer.current > 3.5) {
          setIsGreeting(false);
          greetingTimer.current = 0;
        }
      } else {
        // Lower arm and reset rotations
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, 0, 0.1);
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0, 0.1);
      }
    }
  });

  const handleAvatarClick = (e: any) => {
    e.stopPropagation();
    setIsGreeting(true);
    greetingTimer.current = 0;
    onFocus(); // Zoom in
    
    dBus.trigger();
    window.dispatchEvent(new CustomEvent('spark-dialogue', { 
      detail: "Hi, Welcome to my portfolio. Go through my computer to know more about myself." 
    }));
  };

  return (
    <group 
      position={position} 
      rotation={[0, Math.PI * 0.3, 0]} // Adjusted rotation to face more clearly towards front
      onPointerDown={handleAvatarClick}
    >
      {/* Legs */}
      <mesh position={[-0.2, 0.65, 0]} castShadow scale={[0.3, 1.3, 0.3]}>
        <primitive object={BOX_GEO} attach="geometry" />
        <primitive object={pantsMaterial} attach="material" />
      </mesh>
      <mesh position={[0.2, 0.65, 0]} castShadow scale={[0.3, 1.3, 0.3]}>
        <primitive object={BOX_GEO} attach="geometry" />
        <primitive object={pantsMaterial} attach="material" />
      </mesh>

      {/* Torso (Coat) */}
      <mesh position={[0, 1.9, 0]} castShadow scale={[0.8, 1.2, 0.4]}>
        <primitive object={BOX_GEO} attach="geometry" />
        <primitive object={coatMaterial} attach="material" />
      </mesh>
      
      {/* Shirt/Tie Gap Details */}
      <mesh position={[0, 2.05, 0.205]} scale={[0.15, 0.9, 0.01]}>
        <primitive object={BOX_GEO} attach="geometry" />
        <primitive object={shirtMaterial} attach="material" />
      </mesh>
      
      {/* Buttons */}
      {[1.9, 1.7, 1.5].map((y, i) => (
        <mesh key={i} position={[0.12, y, 0.21]} scale={[0.05, 0.05, 0.01]}>
          <primitive object={BOX_GEO} attach="geometry" />
          <primitive object={buttonMaterial} attach="material" />
        </mesh>
      ))}

      {/* Left Arm */}
      <group position={[-0.55, 2.4, 0]}>
        <mesh position={[0, -0.5, 0]} castShadow scale={[0.3, 1, 0.3]}>
          <primitive object={BOX_GEO} attach="geometry" />
          <primitive object={coatMaterial} attach="material" />
        </mesh>
        <mesh position={[0, -1.05, 0]} castShadow scale={[0.25, 0.2, 0.25]}>
          <primitive object={BOX_GEO} attach="geometry" />
          <primitive object={skinMaterial} attach="material" />
        </mesh>
      </group>

      {/* Right Arm (Animated) */}
      <group ref={rightArmRef} position={[0.55, 2.4, 0]}>
        <mesh position={[0, -0.5, 0]} castShadow scale={[0.3, 1, 0.3]}>
          <primitive object={BOX_GEO} attach="geometry" />
          <primitive object={coatMaterial} attach="material" />
        </mesh>
        <mesh position={[0, -1.05, 0]} castShadow scale={[0.25, 0.2, 0.25]}>
          <primitive object={BOX_GEO} attach="geometry" />
          <primitive object={skinMaterial} attach="material" />
        </mesh>
      </group>

      {/* Head Group */}
      <group ref={headRef} position={[0, 2.5, 0]}>
        {/* Face */}
        <mesh position={[0, 0.3, 0]} castShadow scale={[0.6, 0.6, 0.6]}>
          <primitive object={BOX_GEO} attach="geometry" />
          <primitive object={skinMaterial} attach="material" />
        </mesh>
        
        {/* Eyes */}
        <mesh position={[-0.15, 0.35, 0.3]} scale={[0.08, 0.08, 0.02]}>
          <primitive object={BOX_GEO} attach="geometry" />
          <primitive object={eyeMaterial} attach="material" />
        </mesh>
        <mesh position={[0.15, 0.35, 0.3]} scale={[0.08, 0.08, 0.02]}>
          <primitive object={BOX_GEO} attach="geometry" />
          <primitive object={eyeMaterial} attach="material" />
        </mesh>
        
        {/* Hair - offset slightly to prevent Z-fighting with head */}
        <mesh position={[0, 0.602, -0.05]} castShadow scale={[0.66, 0.2, 0.71]}>
          <primitive object={BOX_GEO} attach="geometry" />
          <primitive object={hairMaterial} attach="material" />
        </mesh>
        {/* Back Hair - offset slightly to prevent Z-fighting */}
        <mesh position={[0, 0.3, -0.202]} castShadow scale={[0.64, 0.4, 0.26]}>
          <primitive object={BOX_GEO} attach="geometry" />
          <primitive object={hairMaterial} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

function StandingLamp({ position }: { position: [number, number, number] }) {
  const [isOn, setIsOn] = useState(false);
  const ropeRef = useRef<THREE.Group>(null);
  const pullY = useRef(0);
  const bus = useProjectBus();

  useFrame(() => {
    if (ropeRef.current) {
      // Smoothly return rope to original position
      pullY.current = THREE.MathUtils.lerp(pullY.current, 0, 0.15);
      ropeRef.current.position.y = 2.8 + pullY.current;
    }
  });

  const handlePull = (e: any) => {
    e.stopPropagation();
    pullY.current = -0.3; // Visual feedback of pull
    const newIsOn = !isOn;
    setIsOn(newIsOn);
    window.dispatchEvent(new CustomEvent('lamp-toggle', { detail: newIsOn }));
  };

  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow scale={[0.8, 0.1, 0.8]}>
        <primitive object={BOX_GEO} attach="geometry" />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Pole */}
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow scale={[0.1, 3, 0.1]}>
        <primitive object={BOX_GEO} attach="geometry" />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Lampshade */}
      <mesh 
        position={[0, 3.2, 0]} 
        castShadow 
        receiveShadow 
        scale={[1, 0.8, 1]}
        onPointerDown={handlePull}
        onPointerOver={() => bus.show({ title: "Lampshade", desc: "Click to toggle light" })}
        onPointerOut={() => bus.hide()}
      >
        <primitive object={BOX_GEO} attach="geometry" />
        <meshStandardMaterial 
          color={isOn ? "#fff9c4" : "#eeeeee"} 
          emissive={isOn ? "#ffaa33" : "#000000"}
          emissiveIntensity={isOn ? 3.0 : 0} 
        />
      </mesh>
      
      {/* Rope Switch */}
      <group 
        ref={ropeRef} 
        position={[0.3, 2.8, 0]}
        onPointerOver={() => bus.show({ title: "Lamp Switch", desc: "Click to toggle light" })}
        onPointerOut={() => bus.hide()}
        onPointerDown={handlePull}
      >
        {/* String */}
        <mesh position={[0, 0.3, 0]} scale={[0.02, 0.6, 0.02]}>
          <primitive object={BOX_GEO} attach="geometry" />
          <meshStandardMaterial color="#5d4037" />
        </mesh>
        {/* Knob */}
        <mesh position={[0, 0, 0]} scale={[0.1, 0.15, 0.1]}>
          <primitive object={BOX_GEO} attach="geometry" />
          <meshStandardMaterial color="#ffd54f" />
        </mesh>
      </group>

      {/* Light */}
      {isOn && (
        <pointLight 
          position={[0, 3.2, 0]} 
          intensity={12.0} 
          distance={15} 
          color="#ffaa33" 
          castShadow 
          shadow-mapSize={[512, 512]}
        />
      )}
    </group>
  );
}

function VoxelFloor() {
  const colors = ["#4a4e58", "#3b3e45", "#2d3036"];
  const rows = 20; // 0.5 width per plank for 10 units
  const rowWidth = 0.5;
  
  return (
    <group position={[0, -0.1, 0]}>
      {/* Dark base to show through gaps */}
      <mesh position={[0, -0.05, 0]} receiveShadow scale={[10.1, 0.1, 10.1]}>
        <primitive object={BOX_GEO} attach="geometry" />
        <meshStandardMaterial color="#2d3436" />
      </mesh>
      
      {Array.from({ length: rows }).map((_, r) => {
        const x = r * rowWidth - 4.75;
        const isOffset = r % 2 === 1;
        
        return (
          <group key={r}>
            {!isOffset ? (
              // Even rows: 4 full-length planks
              [-3.75, -1.25, 1.25, 3.75].map((z, c) => (
                <mesh 
                  key={c} 
                  position={[x, 0, z]} 
                  receiveShadow 
                  scale={[rowWidth - 0.04, 0.2, 2.46]}
                >
                  <primitive object={BOX_GEO} attach="geometry" />
                  <meshStandardMaterial 
                    color={colors[(r + c) % colors.length]} 
                    roughness={0.9} 
                    metalness={0.0} 
                  />
                </mesh>
              ))
            ) : (
              // Odd rows: 2 half-planks at ends, 3 full planks in middle for symmetry
              <>
                <mesh position={[x, 0, -4.375]} receiveShadow scale={[rowWidth - 0.04, 0.2, 1.21]}>
                  <primitive object={BOX_GEO} attach="geometry" />
                  <meshStandardMaterial color={colors[r % colors.length]} roughness={0.9} metalness={0.0} />
                </mesh>
                {[-2.5, 0, 2.5].map((z, c) => (
                  <mesh 
                    key={c} 
                    position={[x, 0, z]} 
                    receiveShadow 
                    scale={[rowWidth - 0.04, 0.2, 2.46]}
                  >
                    <primitive object={BOX_GEO} attach="geometry" />
                    <meshStandardMaterial 
                      color={colors[(r + c + 1) % colors.length]} 
                      roughness={0.9} 
                      metalness={0.0} 
                    />
                  </mesh>
                ))}
                <mesh position={[x, 0, 4.375]} receiveShadow scale={[rowWidth - 0.04, 0.2, 1.21]}>
                  <primitive object={BOX_GEO} attach="geometry" />
                  <meshStandardMaterial color={colors[(r + 4) % colors.length]} roughness={0.9} metalness={0.0} />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}

function VoxelWall({ 
  position, 
  scale 
}: { 
  position: [number, number, number], 
  scale: [number, number, number]
}) {
  const baseColor = "#3d4e5e"; // Storm Blue
  const patternColor = "#2c3e50"; // Darker Slate
  
  const [w, h, d] = scale;
  const isLeftWall = w < d; 
  
  const stripes = [];
  
  if (isLeftWall) {
    // Wall along Z axis (Left Wall)
    // Surface facing room is at local x = 0.1
    for (let z = 0.5; z < d; z += 1.5) {
      stripes.push(
        <mesh key={z} position={[0.105, 0, z - d/2]} scale={[0.015, h, 0.1]}>
          <primitive object={BOX_GEO} attach="geometry" />
          <meshStandardMaterial color={patternColor} />
        </mesh>
      );
    }
  } else {
    // Wall along X axis (Back Wall)
    // Surface facing room is at local z = 0.1
    for (let x = 0.5; x < w; x += 1.5) {
      stripes.push(
        <mesh key={x} position={[x - w/2, 0, 0.105]} scale={[0.1, h, 0.015]}>
          <primitive object={BOX_GEO} attach="geometry" />
          <meshStandardMaterial color={patternColor} />
        </mesh>
      );
    }
  }

  return (
    <group position={position}>
      <mesh receiveShadow scale={scale}>
        <primitive object={BOX_GEO} attach="geometry" />
        <meshStandardMaterial color={baseColor} />
      </mesh>
      {stripes}
    </group>
  );
}

function FeatureScreen({ position, rotation, onFocus, pixaImage, onOpenPixa, visitors }: { 
  position: [number, number, number], 
  rotation: [number, number, number],
  onFocus: () => void,
  pixaImage: string | null,
  onOpenPixa: () => void,
  visitors: number
}) {
  const [time, setTime] = useState(new Date());
  const [contentMode, setContentMode] = useState<'stats' | 'tips'>('stats');
  const [currentTip, setCurrentTip] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const tickerTips = [
    "TIP: ROTATE THE CUBE TO SEE MY SKILLS",
    "TIP: CLICK THE SHELF FOR AWARDS & EDUCATION",
    "TIP: OPEN THE COMPUTER TO CHAT WITH SPARK AI"
  ];

  useEffect(() => {
    // Only cycle if we don't have a pixa image displayed
    if (pixaImage) return;

    // Clock interval
    const timeTimer = setInterval(() => setTime(new Date()), 1000);
    
    // Rotation interval
    const cycleTimer = setInterval(() => {
      setContentMode(prev => {
        const nextMode = prev === 'stats' ? 'tips' : 'stats';
        if (nextMode === 'tips') {
          setCurrentTip(Math.floor(Math.random() * tickerTips.length));
        }
        return nextMode;
      });
    }, 6000);
    
    return () => {
      clearInterval(timeTimer);
      clearInterval(cycleTimer);
    };
  }, [pixaImage]);

  useEffect(() => {
    setImageLoaded(false);
  }, [pixaImage]);

  return (
    <group 
      position={position} 
      rotation={rotation}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onFocus();
      }}
    >
      {/* LED Panel Frame (Tightened to 16:9) */}
      <mesh castShadow>
        <boxGeometry args={[3.2, 1.8, 0.1]} />
        <meshStandardMaterial color={hovered ? "#e0b0ff" : "#1a1a1a"} metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Screen Surface */}
      <mesh position={[0, 0, 0.051]}>
        <planeGeometry args={[3.2, 1.8]} />
        <meshStandardMaterial 
          color="#2D1B4E" 
          emissive="#2D1B4E" 
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Dynamic Content via HTML */}
      <Html 
        position={[0, 0, 0.06]} 
        transform 
        distanceFactor={3.2} 
        occlude
      >
        <div 
          className="relative font-mono flex flex-col overflow-hidden m-0 p-0 cursor-pointer"
          style={{ width: '320px', height: '180px' }}
          onClick={(e) => {
            e.stopPropagation();
            onFocus();
          }}
        >
          <div className="w-full h-full overflow-hidden relative m-0 p-0">
            {pixaImage ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 m-0 p-0"
              >
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-[#1a1a1a] flex items-center justify-center z-10">
                    <div className="w-8 h-8 border-4 border-[#00ff41] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                <img 
                  src={pixaImage} 
                  onLoad={() => setImageLoaded(true)}
                  className={`w-full h-full object-fill m-0 p-0 transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`} 
                  style={{ imageRendering: 'pixelated' }}
                  referrerPolicy="no-referrer"
                  alt="Pixa Generation" 
                />
                {/* Permanent Pencil icon for editing */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPixa();
                  }}
                  className="absolute top-2 left-2 bg-[#00ff41] text-black p-1.5 rounded-full shadow-lg border-2 border-black z-20 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                  title="Edit Art"
                >
                  <Pencil size={12} strokeWidth={3} />
                </button>
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">
                {hovered ? (
                  <motion.div
                    key="pixa-prompt"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center justify-center h-full gap-2 m-0 p-0 text-center bg-[#2D1B4E] w-full"
                  >
                    <p className="text-white text-[10px] font-black uppercase tracking-widest leading-tight">
                      Generate pictures through pixa app to decorate
                    </p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPixa();
                      }}
                      className="bg-[#00ff41] text-black px-3 py-1.5 font-black text-[9px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,255,65,0.4)] border border-black"
                    >
                      OPEN PIXA APP
                    </button>
                  </motion.div>
                ) : (
                  contentMode === 'stats' ? (
                    <motion.div 
                      key="stats"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8 }}
                      className="flex flex-col items-center justify-center h-full space-y-2 text-center m-0 p-0 bg-[#2D1B4E] w-full"
                    >
                      <div className="text-white text-base font-black tracking-[0.1em] uppercase drop-shadow-[0_0_2px_#ffffff]">
                        SERVER_CORE
                      </div>
                      <div className="text-white/90 text-sm font-bold tracking-widest">
                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="tips"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8 }}
                      className="flex items-center justify-center h-full m-0 p-0 text-center bg-[#2D1B4E] w-full"
                    >
                      <div className="text-white text-[10px] font-black leading-snug tracking-wider uppercase drop-shadow-[0_0_2px_#ffffff]">
                        {tickerTips[currentTip]}
                      </div>
                    </motion.div>
                  )
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
      </Html>

      {/* Ambient Glow */}
      <pointLight 
        position={[0, 0.2, 0.3]} 
        intensity={1.0} 
        distance={2.5} 
        color="#e0b0ff" 
      />
    </group>
  );
}


function DiscoEffect() {
  const lightRef1 = useRef<THREE.PointLight>(null);
  const lightRef2 = useRef<THREE.PointLight>(null);
  const lightRef3 = useRef<THREE.PointLight>(null);
  const ballRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (lightRef1.current) {
      lightRef1.current.color.setHSL((time * 0.8) % 1, 1, 0.5);
      lightRef1.current.position.x = Math.sin(time * 3) * 5;
    }
    if (lightRef2.current) {
      lightRef2.current.color.setHSL((time * 0.8 + 0.33) % 1, 1, 0.5);
      lightRef2.current.position.z = Math.cos(time * 3) * 5;
    }
    if (lightRef3.current) {
      lightRef3.current.color.setHSL((time * 0.8 + 0.66) % 1, 1, 0.5);
      lightRef3.current.position.y = 3 + Math.sin(time * 4);
    }
    if (ballRef.current) {
      ballRef.current.rotation.y += 0.05;
      ballRef.current.rotation.x = Math.sin(time * 0.5) * 0.1;
    }
  });

  return (
    <>
      <color attach="background" args={["#010101"]} />
      <fog attach="fog" args={["#000000", 2, 12]} />
      <pointLight ref={lightRef1} position={[0, 4, 0]} intensity={100} distance={25} />
      <pointLight ref={lightRef2} position={[0, 4, 0]} intensity={100} distance={25} />
      <pointLight ref={lightRef3} position={[0, 4, 0]} intensity={100} distance={25} />
      <ambientLight intensity={0.5} />
      
      {/* Disco Ball */}
      <group ref={ballRef} position={[0, 4.5, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1]} />
          <meshStandardMaterial color="#444" metalness={1} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshStandardMaterial 
            color="#ffffff" 
            metalness={1} 
            roughness={0}
          />
        </mesh>
        {[...Array(6)].map((_, i) => (
          <mesh key={i} rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}>
            <boxGeometry args={[1.3, 0.01, 1.3]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.05} />
          </mesh>
        ))}
      </group>
      
      <gridHelper args={[30, 30, "#222", "#0a0a0a"]} position={[0, 0, 0]} />
    </>
  );
}

function VoxelCat({ isDiscoMode }: { isDiscoMode?: boolean }) {
  const meshRef = useRef<THREE.Group>(null);
  const leg0 = useRef<THREE.Mesh>(null);
  const leg1 = useRef<THREE.Mesh>(null);
  const leg2 = useRef<THREE.Mesh>(null);
  const leg3 = useRef<THREE.Mesh>(null);
  const legRefs = [leg0, leg1, leg2, leg3];
  
  const [frightened, setFrightened] = useState(false);
  const [targetPos, setTargetPos] = useState(new THREE.Vector3((Math.random() - 0.5) * 8, 0.15, (Math.random() - 0.5) * 8));
  const [velocity] = useState(new THREE.Vector3(0, 0, 0));
  const bus = useProjectBus();

  // Random movement logic
  useFrame((state) => {
    if (!meshRef.current) return;

    if (isDiscoMode) {
      meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, 0, 0.1);
      meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, 0, 0.1);
      meshRef.current.position.y = 1.5 + Math.sin(state.clock.elapsedTime * 4) * 0.5;
      meshRef.current.rotation.y += 0.2;
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.2;
      return;
    }

    if (frightened) return;

    const currentPos = meshRef.current.position;
    // Return to floor if disco just ended
    if (currentPos.y > 0.15) {
      currentPos.y = THREE.MathUtils.lerp(currentPos.y, 0.15, 0.1);
      meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, 0, 0.1);
    }

    const distance = currentPos.distanceTo(targetPos);

    if (distance < 0.5) {
      // Pick new target within floor bounds (-4 to 4)
      setTargetPos(new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        0.15,
        (Math.random() - 0.5) * 8
      ));
    } else {
      // Move towards target - slowed down significantly
      const dir = targetPos.clone().sub(currentPos).normalize();
      velocity.lerp(dir.multiplyScalar(0.008), 0.02);
      meshRef.current.position.add(velocity);
      
      // Look at direction
      const lookAtTarget = currentPos.clone().add(velocity);
      meshRef.current.lookAt(lookAtTarget);

      // Walk cycle animation
      const walkCycle = state.clock.elapsedTime * 6;
      legRefs.forEach((ref, i) => {
        if (ref.current) {
          // Alternating leg movement for a proper walk
          const offset = (i === 0 || i === 3) ? 0 : Math.PI;
          ref.current.rotation.x = Math.sin(walkCycle + offset) * 0.4;
        }
      });

      // Synchronized body bobbing so it doesn't look like it's sliding
      meshRef.current.position.y = 0.15 + Math.abs(Math.sin(walkCycle * 2)) * 0.025;
    }
  });

  const playMeow = () => {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3");
    audio.volume = 0.05;
    audio.play().catch(() => {});
  };

  const legs = [
    { pos: [-0.1, -0.1, 0.18], ref: leg0 },
    { pos: [0.1, -0.1, 0.18], ref: leg1 },
    { pos: [-0.1, -0.1, -0.18], ref: leg2 },
    { pos: [0.1, -0.1, -0.18], ref: leg3 }
  ];

  return (
    <group 
      ref={meshRef} 
      position={[2, 0.15, 2]}
      onPointerOver={() => {
        setFrightened(true);
        playMeow();
        bus.show({ title: "Stray Cat", desc: "It looks easily startled..." });
      }}
      onPointerOut={() => {
        setFrightened(false);
        bus.hide();
      }}
    >
      {/* Body */}
      <mesh castShadow position={[0, 0.1, 0]} scale={frightened ? [1.2, 1.4, 1.1] : [1, 1, 1]}>
        <boxGeometry args={[0.3, 0.25, 0.5]} />
        <meshStandardMaterial color="#f39c12" />
      </mesh>

      {/* Head */}
      <mesh castShadow position={[0, 0.25, 0.3]}>
        <boxGeometry args={[0.25, 0.2, 0.2]} />
        <meshStandardMaterial color="#e67e22" />
      </mesh>

      {/* Ears */}
      <mesh position={[-0.08, 0.38, 0.33]}>
        <boxGeometry args={[0.06, 0.1, 0.04]} />
        <meshStandardMaterial color="#d35400" />
      </mesh>
      <mesh position={[0.08, 0.38, 0.33]}>
        <boxGeometry args={[0.06, 0.1, 0.04]} />
        <meshStandardMaterial color="#d35400" />
      </mesh>

      {/* Animated Legs */}
      {legs.map((leg, i) => (
        <mesh key={i} ref={leg.ref} position={leg.pos as [number, number, number]} castShadow>
          <boxGeometry args={[0.08, 0.2, 0.08]} />
          <meshStandardMaterial color="#f39c12" />
        </mesh>
      ))}

      {/* Tail */}
      <group position={[0, 0.2, -0.25]} rotation={[frightened ? -Math.PI/4 : 0, 0, 0]}>
        <mesh castShadow position={[0, 0.15, -0.1]}>
          <boxGeometry args={[0.06, 0.4, 0.06]} />
          <meshStandardMaterial color="#e67e22" />
        </mesh>
      </group>

      {/* Fright Fur / Goosebumps */}
      {frightened && (
        <group>
          {Array.from({ length: 15 }).map((_, i) => (
            <mesh key={i} position={[
              (Math.random() - 0.5) * 0.4,
              0.2 + Math.random() * 0.3,
              (Math.random() - 0.5) * 0.6
            ]}>
              <boxGeometry args={[0.04, 0.04, 0.04]} />
              <meshStandardMaterial color="#d35400" />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

function VoxelRoom({ 
  onFocus, 
  focusTarget, 
  pixaImage, 
  onPixaImageGenerated,
  autoOpenPixa,
  onPixaOpened,
  visitors,
  lightToggles,
  isDiscoMode,
  onStartMusicRequested
}: { 
  onFocus: (target: FocusTarget) => void, 
  focusTarget: FocusTarget,
  pixaImage: string | null,
  onPixaImageGenerated: (img: string) => void,
  autoOpenPixa: boolean,
  onPixaOpened: () => void,
  visitors: number,
  lightToggles: number,
  isDiscoMode: boolean,
  onStartMusicRequested: () => void
}) {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group ref={groupRef}>
      {focusTarget !== 'computer' && (
        <>
          <VoxelFloor />
          {!isDiscoMode && (
            <>
              <VoxelWall position={[-5, 2.5, 0]} scale={[0.2, 5, 10]} />
              <VoxelWall position={[0, 2.5, -5]} scale={[10, 5, 0.2]} />
            </>
          )}

          {/* Furniture */}
          {!isDiscoMode && (
            <>
              <VoxelWardrobe 
                position={[-4.4, 0, -2]} 
                onFocus={(target, text) => {
                  onFocus(target);
                  if (target !== 'resume') {
                    window.dispatchEvent(new CustomEvent('spark-dialogue', { detail: text }));
                  }
                }}
              />
              <VoxelComputerDesk position={[2, 0, -4.1]} />
              <VoxelChair position={[1.5, 0, -2]} />
              <StandingLamp position={[-1.5, 0, -4.1]} />
            </>
          )}

          <VoxelCat isDiscoMode={isDiscoMode} />
          
          {!isDiscoMode && (
            <>
              <VoxelAvatar 
                position={[0, 0, 0]} 
                onFocus={() => {
                  onFocus('avatar');
                }}
              />
              
              <PhotoFrame 
                position={[-4.85, 2.5, 1]} 
                rotation={[0, Math.PI / 2, 0]} 
                onFocus={() => onFocus('photo-frame')}
                isFocused={focusTarget === 'photo-frame'}
              />

              <VoxelTypewriter 
                position={[-4.2, 1.1, 3.5]} 
                onFocus={() => onFocus('typewriter')}
              />

              <FeatureScreen 
                position={[1.5, 3.4, -4.85]} 
                rotation={[0, 0, 0]} 
                onFocus={() => onFocus('feature-screen')}
                pixaImage={pixaImage}
                onOpenPixa={() => onFocus('pixa-app-trigger' as any)}
                visitors={visitors}
              />
            </>
          )}
        </>
      )}
      
      {/* Terminal on Desk */}
      {!isDiscoMode && (
        <group position={[2, 1.1, -4.1]}>
          <ComputerTerminal 
            onFocus={() => onFocus('computer')} 
            isFocused={focusTarget === 'computer'}
            canInteract={focusTarget === 'room' || focusTarget === 'computer'}
            pixaImage={pixaImage}
            onPixaImageGenerated={onPixaImageGenerated}
            autoOpenPixa={autoOpenPixa}
            onPixaOpened={onPixaOpened}
            onTypewriterFocus={() => onFocus('typewriter')}
          />
        </group>
      )}

      {focusTarget !== 'computer' && !isDiscoMode && (
        <>
          <RubiksCube 
            position={[3, 1.4, -4.1]} 
            onFocus={() => onFocus('project-rubiks')}
            isFocused={focusTarget === 'project-rubiks'}
          />

          {/* Hidden Easter Egg: Golden Disc only visible after 2 on/off cycles (4 toggles) */}
          {lightToggles >= 4 && (
            <VoxelGoldenDisc 
              position={[-4.2, 0.5, 3.2]} 
              onDiscover={() => {
                window.dispatchEvent(new CustomEvent('spark-dialogue', { 
                  detail: "You found the Master Key! Initializing Platinum Groove Protocol... [Click 'START THE MUSIC' to proceed]" 
                }));
                onStartMusicRequested();
              }} 
            />
          )}
        </>
      )}

      {/* Disco Lights during Cutscene */}
      {isDiscoMode && (
        <DiscoEffect />
      )}
    </group>
  );
}

function VoxelGoldenDisc({ position, onDiscover }: { position: [number, number, number], onDiscover: () => void }) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      groupRef.current.rotation.y += 0.01;
    }
  });
  
  return (
    <group 
      ref={groupRef}
      position={position} 
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }} 
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onDiscover();
      }}
    >
      {/* Small glowing gold disc */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.02, 32]} />
        <meshStandardMaterial 
          color={hovered ? "#00ff41" : "#ffcc00"} 
          metalness={0.9} 
          roughness={0.1} 
          emissive={hovered ? "#00ff41" : "#ffcc00"} 
          emissiveIntensity={hovered ? 1 : 0.2} 
        />
      </mesh>
      <mesh position={[0, 0, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.03, 16]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
    </group>
  );
}

function ComputerTerminal({ 
  onFocus, 
  isFocused, 
  canInteract, 
  pixaImage, 
  onPixaImageGenerated,
  autoOpenPixa,
  onPixaOpened,
  onTypewriterFocus
}: { 
  onFocus: () => void, 
  isFocused: boolean, 
  canInteract: boolean,
  pixaImage: string | null,
  onPixaImageGenerated: (img: string) => void,
  autoOpenPixa: boolean,
  onPixaOpened: () => void,
  onTypewriterFocus?: () => void
}) {
  const [hovered, setHovered] = useState(false);
  const bus = useProjectBus();

  useEffect(() => {
    if (isFocused && hovered) {
      bus.hide();
    }
  }, [isFocused, hovered, bus]);

  return (
    <group 
      position={[0, 0.6, 0]} 
      onClick={(e) => {
        if (!canInteract) return;
        e.stopPropagation();
        onFocus();
      }}
      onPointerOver={() => {
        if (canInteract) {
          setHovered(true);
          if (!isFocused) {
            bus.show({ title: "Access Siva's Files", desc: "System Terminal & Project Database" });
          }
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        bus.hide();
      }}
    >
      {/* Click target that covers the whole terminal area - Adjusted Z and size for better coverage */}
      {canInteract && !isFocused && (
        <mesh 
          position={[0, 0.4, 0.3]} 
          visible={false} 
          onClick={(e) => {
            e.stopPropagation();
            onFocus();
          }}
        >
          <boxGeometry args={[1.5, 1.8, 0.8]} />
        </mesh>
      )}

      {/* Terminal Base */}
      {!isFocused && (
        <>
          <mesh position={[0, -0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.2, 0.4, 0.8]} />
            <meshStandardMaterial color="#2d2d2d" />
          </mesh>
          {/* Keyboard area */}
          <mesh position={[0, -0.1, 0.2]} rotation={[-0.2, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[1, 0.1, 0.4]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        </>
      )}
      {/* Screen Frame */}
      <mesh position={[0, 0.4, -0.05]} rotation={[-0.1, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[isFocused ? 2.5 : 1.7, isFocused ? 1.4 : 1.0, isFocused ? 0.1 : 0.2]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Interactive Screen Content */}
      <ComputerScreenContent 
        focused={isFocused} 
        hovered={hovered} 
        onPixaImageGenerated={onPixaImageGenerated}
        autoOpenPixa={autoOpenPixa}
        onPixaOpened={onPixaOpened}
        onTypewriterFocus={onTypewriterFocus}
      />

      {/* Glow */}
      {(hovered || isFocused) && (
        <pointLight position={[0, 0.4, 0.5]} intensity={0.5} color="#00ff41" />
      )}
    </group>
  );
}

// Simple event bus for dialogue
const dialogueListeners: (() => void)[] = [];
const useDialogueBus = () => ({
  trigger: () => dialogueListeners.forEach(l => l()),
  subscribe: (callback: () => void) => {
    dialogueListeners.push(callback);
    return () => {
      const index = dialogueListeners.indexOf(callback);
      if (index > -1) dialogueListeners.splice(index, 1);
    };
  }
});

// Event bus for project tooltips
type Project = { title: string, desc: string, color?: string };
const projectListeners: { show: (p: Project) => void, hide: () => void }[] = [];
const useProjectBus = () => {
  const playHoverSound = () => {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3");
    audio.volume = 0.05;
    audio.play().catch(() => {});
  };

  return {
    show: (p: Project) => {
      playHoverSound();
      projectListeners.forEach(l => l.show(p));
    },
    hide: () => projectListeners.forEach(l => l.hide()),
    subscribe: (callbacks: { show: (p: Project) => void, hide: () => void }) => {
      projectListeners.push(callbacks);
      return () => {
        const index = projectListeners.indexOf(callbacks);
        if (index > -1) projectListeners.splice(index, 1);
      };
    }
  };
};

function SpaceBackground() {
  const starsPositions = useMemo(() => {
    const positions = new Float32Array(800 * 3);
    for (let i = 0; i < 800; i++) {
      // Wider range but centered more for visibility
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 150;
      positions[i * 3 + 2] = -30 - Math.random() * 40;
    }
    return positions;
  }, []);

  const shipRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (shipRef.current) {
      shipRef.current.position.x += 0.01;
      shipRef.current.position.y = -4 + Math.sin(state.clock.elapsedTime * 0.5) * 0.5;
      if (shipRef.current.position.x > 25) shipRef.current.position.x = -25;
    }
  });

  return (
    <group>
      {/* 1. Stars Backdrop - Larger points for Orthographic visibility */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={starsPositions.length / 3}
            array={starsPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.5} color="#ffffff" transparent opacity={1} sizeAttenuation={false} />
      </points>

      {/* 2. Purple Planet with Ring - Positioned lower and to the left */}
      <group position={[-20, -2, -5]} rotation={[0.4, 0.4, 0.4]}>
        {/* The Planet */}
        <mesh>
          <sphereGeometry args={[5, 32, 32]} />
          <meshStandardMaterial color="#8a2be2" emissive="#4b0082" emissiveIntensity={0.8} roughness={0.7} />
        </mesh>
        
        {/* The Ring */}
        <mesh rotation={[Math.PI / 2, 0.2, 0]}>
          <torusGeometry args={[8, 0.2, 2, 64]} />
          <meshStandardMaterial color="#dda0dd" transparent opacity={0.8} />
        </mesh>

        <pointLight intensity={4} distance={40} color="#8a2be2" />
      </group>

      {/* 3. Space Ship - More central and larger */}
      <group ref={shipRef} position={[-20, -4, -10]} scale={0.6} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[4, 1, 1.5]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} emissive="#ffffff" emissiveIntensity={0.2} />
        </mesh>
        <mesh position={[1, 0.6, 0]}>
          <boxGeometry args={[1.5, 0.6, 1]} />
          <meshStandardMaterial color="#4a90e2" transparent opacity={0.8} />
        </mesh>
        <mesh position={[-0.5, 0, 0]}>
          <boxGeometry args={[1, 0.2, 5]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} />
        </mesh>
        {/* Engine Glow */}
        <mesh position={[-2, 0, 0]}>
          <boxGeometry args={[0.2, 0.6, 0.8]} />
          <meshBasicMaterial color="#00ff41" />
        </mesh>
        <pointLight position={[-2.1, 0, 0]} color="#00ff41" intensity={2} distance={10} />
      </group>
    </group>
  );
}

export default function App() {
  const [focusTarget, setFocusTarget] = useState<FocusTarget>('room');
  const [showDialogue, setShowDialogue] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [dialogueText, setDialogueText] = useState("Welcome to the Lab. I am Spark AI. How can I help you level up today?");
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pixaImage, setPixaImage] = useState<string | null>(null);
  const [autoOpenPixa, setAutoOpenPixa] = useState(false);
  const [visitors, setVisitors] = useState(1248);
  const [lightToggles, setLightToggles] = useState(0);
  const [isDiscoMode, setIsDiscoMode] = useState(false);
  const [showStartMusic, setShowStartMusic] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handleLampToggle = () => {
      setLightToggles(prev => prev + 1);
    };
    window.addEventListener('lamp-toggle', handleLampToggle);
    return () => window.removeEventListener('lamp-toggle', handleLampToggle);
  }, []);

  useEffect(() => {
    if (isDiscoMode) {
      if (!audioRef.current) {
        audioRef.current = new Audio('/Cat cut dj.mp3');
      }
      audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
      const timer = setTimeout(() => {
        setIsDiscoMode(false);
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.currentTime = 0;
      }, 20000);
      return () => {
        clearTimeout(timer);
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.currentTime = 0;
      };
    }
  }, [isDiscoMode]);

  useEffect(() => {
    const handleTypewriterFocus = () => setFocusTarget('typewriter');
    window.addEventListener('focus-typewriter', handleTypewriterFocus);
    return () => window.removeEventListener('focus-typewriter', handleTypewriterFocus);
  }, []);

  useEffect(() => {
    // Visitor growth
    const visitorInterval = setInterval(() => {
      setVisitors(v => v + Math.floor(Math.random() * 2));
    }, 15000);
    return () => clearInterval(visitorInterval);
  }, []);
  
  const bus = useDialogueBus();
  const pBus = useProjectBus();

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        setFocusTarget('room');
        setShowDialogue(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [showDialogue, focusTarget]);

  const handleDeepDive = async () => {
    setIsLoading(true);
    setIsTypingComplete(false);
    try {
      const response = await genAI.models.generateContent({
        model: modelName,
        contents: "Give me a deep dive into Siva's expertise in AI, Web Dev, and the PUMIS project.",
        config: { systemInstruction: SYSTEM_INSTRUCTION }
      });
      setDialogueText(response.text || "Data buffer empty. Try again, traveler.");
    } catch (error) {
      console.error(error);
      setDialogueText("Error in the matrix. Connection lost.");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    const unsubD = bus.subscribe(() => {
      setDialogueText("Welcome to the Lab. I am Spark AI. How can I help you level up today?");
      setShowDialogue(true);
      setIsTypingComplete(false);
      // Removed setFocusTarget('computer') to prevent jumping when interacting with projects
    });
    const unsubP = pBus.subscribe({
      show: (p) => setActiveProject(p),
      hide: () => setActiveProject(null)
    });

    const handleSparkDialogue = (e: any) => {
      setDialogueText(e.detail);
      setShowDialogue(true);
      setIsTypingComplete(false);
      // Removed setFocusTarget('computer') to prevent jumping when interacting with projects
    };
    window.addEventListener('spark-dialogue', handleSparkDialogue);

    return () => {
      unsubD();
      unsubP();
      window.removeEventListener('spark-dialogue', handleSparkDialogue);
    };
  }, []);

  const isMobile = useIsMobile();

  return (
    <div className="w-full h-screen bg-[#05050a] overflow-hidden relative font-pixel">
      {/* 3D Scene */}
      <Canvas shadows dpr={1} gl={{ antialias: false, powerPreference: "high-performance" }}>
        <CameraController target={focusTarget} isMobile={isMobile} />
        <OrthographicCamera 
          makeDefault 
          position={[10, 10, 10]} 
          zoom={isMobile ? 38 : 60} 
          near={-100} 
          far={1000} 
        />
        <OrbitControls 
          makeDefault
          enablePan={false}
          enableRotate={focusTarget === 'room'}
          enableZoom={false}
          autoRotate={false} // Disabled auto-rotation for better stability
          rotateSpeed={0.4} // Reduced sensitivity (default is 1.0)
        />
        
        <color attach="background" args={["#05050a"]} />
        <fog attach="fog" args={["#05050a", 80, 250]} />

        <SpaceBackground />

        <ambientLight intensity={1.2} />
        <directionalLight 
          position={[20, 25, 10]} 
          intensity={2.8} 
          castShadow 
          shadow-mapSize={[2048, 2048]} 
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        <spotLight 
          position={[-10, 15, 10]} 
          angle={0.3} 
          penumbra={1} 
          intensity={2} 
          castShadow 
          color="#4a90e2"
        />
        <pointLight position={[-5, 5, 5]} intensity={0.8} color="#4a90e2" />

        <React.Suspense fallback={null}>
          <VoxelRoom 
            onFocus={(t) => {
              if ((t as any) === 'pixa-app-trigger') {
                setFocusTarget('computer');
                setAutoOpenPixa(true);
              } else {
                setFocusTarget(t);
              }
            }} 
            focusTarget={focusTarget} 
            pixaImage={pixaImage}
            onPixaImageGenerated={(img) => setPixaImage(img)}
            autoOpenPixa={autoOpenPixa}
            onPixaOpened={() => setAutoOpenPixa(false)}
            visitors={visitors}
            lightToggles={lightToggles}
            isDiscoMode={isDiscoMode}
            onStartMusicRequested={() => setShowStartMusic(true)}
          />
        </React.Suspense>

        <EffectComposer>
          <Pixelation granularity={0} />
        </EffectComposer>
      </Canvas>

      <AnimatePresence>
        {focusTarget === 'resume' && (
          <ResumeOverlay onClose={() => setFocusTarget('room')} />
        )}
        {focusTarget === 'typewriter' && (
          <TypewriterOverlay onClose={() => setFocusTarget('room')} />
        )}
      </AnimatePresence>

      {/* UI Overlay - Removed top left title */}

      {/* Back Button */}
      {focusTarget !== 'room' && (
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex flex-col items-end gap-1 sm:gap-2 z-[60]">
          <button
            onClick={() => {
              setFocusTarget('room');
              setShowDialogue(false);
            }}
            className={`bg-white text-black font-black border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,0.3)] active:shadow-none active:translate-y-1 active:translate-x-1 transition-all uppercase tracking-tighter ${
              (focusTarget === 'computer' || focusTarget === 'feature-screen') 
                ? 'px-2 py-0.5 text-[8px]' 
                : 'px-3 py-1.5 text-[10px] sm:px-6 sm:py-3 sm:text-sm'
            }`}
          >
            [ESC]
          </button>
          
          <div className="bg-black/80 px-1.5 py-0.5 sm:px-2 sm:py-1 border border-white/20 shadow-lg">
            <span className="text-[#00ff41] text-[7px] sm:text-[8px] font-black tracking-widest uppercase">
              VISITORS: {visitors}
            </span>
          </div>
        </div>
      )}

      {/* Rubik's Cube Navigation Buttons */}
      {focusTarget === 'project-rubiks' && (
        <div className="absolute inset-0 pointer-events-none z-[70]">
          <div className="absolute bottom-20 sm:bottom-32 right-3 sm:right-12 flex flex-col items-center gap-2 sm:gap-4 pointer-events-auto">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('rubiks-rotate', { detail: { axis: 'x', direction: -1 } }));
              }}
              className="w-9 h-9 sm:w-12 sm:h-12 bg-black/80 hover:bg-[#00ff41]/40 border-2 border-white/20 rounded flex items-center justify-center transition-all active:scale-95 group"
            >
              <ChevronUp className="w-5 h-5 sm:w-8 sm:h-8 text-white group-hover:text-[#00ff41]" />
            </button>
            <div className="flex gap-2 sm:gap-4">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent('rubiks-rotate', { detail: { axis: 'y', direction: 1 } }));
                }}
                className="w-9 h-9 sm:w-12 sm:h-12 bg-black/80 hover:bg-[#00ff41]/40 border-2 border-white/20 rounded flex items-center justify-center transition-all active:scale-95 group"
              >
                <ChevronLeft className="w-5 h-5 sm:w-8 sm:h-8 text-white group-hover:text-[#00ff41]" />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent('rubiks-rotate', { detail: { axis: 'y', direction: -1 } }));
                }}
                className="w-9 h-9 sm:w-12 sm:h-12 bg-black/80 hover:bg-[#00ff41]/40 border-2 border-white/20 rounded flex items-center justify-center transition-all active:scale-95 group"
              >
                <ChevronRight className="w-5 h-5 sm:w-8 sm:h-8 text-white group-hover:text-[#00ff41]" />
              </button>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('rubiks-rotate', { detail: { axis: 'x', direction: 1 } }));
              }}
              className="w-9 h-9 sm:w-12 sm:h-12 bg-black/80 hover:bg-[#00ff41]/40 border-2 border-white/20 rounded flex items-center justify-center transition-all active:scale-95 group"
            >
              <ChevronDown className="w-5 h-5 sm:w-8 sm:h-8 text-white group-hover:text-[#00ff41]" />
            </button>
            <p className="text-[#00ff41] text-[7px] sm:text-[8px] mt-1 sm:mt-2 font-bold uppercase tracking-widest opacity-60">Rotate Cube</p>
          </div>
        </div>
      )}

      {/* Computer Screen Details Overlay - Removed in favor of 3D Desktop */}

      {/* Project Details Overlay - Removed as requested */}

      {/* Project Tooltip */}
      <AnimatePresence>
        {activeProject && !showDialogue && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute top-16 sm:top-24 left-2 sm:left-8 text-left pointer-events-none z-[90]"
          >
            <div className={`bg-black/90 border-2 p-2 sm:p-4 inline-block shadow-[8px_8px_0px_#00000050] ${activeProject.title.includes("Files") ? 'border-[#00ff41]' : 'border-[#4a90e2]'}`}>
              <h2 className={`text-[9px] sm:text-xs font-bold uppercase mb-1 ${activeProject.title.includes("Files") ? 'text-[#00ff41]' : 'text-[#4a90e2]'}`}>
                {activeProject.title}
              </h2>
              <p className="text-white text-[8px] sm:text-[10px] uppercase opacity-70 tracking-widest leading-tight max-w-[140px] sm:max-w-[200px]">{activeProject.desc}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialogue Box */}
      <AnimatePresence>
        {showDialogue && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[95%] max-w-4xl z-[100] pointer-events-auto"
          >
            <div className="bg-black border-4 border-white p-8 shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)]">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#00ff41] animate-pulse" />
                  <span className="text-[#00ff41] font-bold text-sm uppercase tracking-widest">Spark AI</span>
                </div>
                <button 
                  onClick={() => setShowDialogue(false)}
                  className="text-white hover:text-red-500 transition-colors text-xs"
                >
                  [CLOSE]
                </button>
              </div>
              
              <div className="min-h-[60px]">
                <p className="text-white text-xs leading-relaxed whitespace-pre-wrap uppercase">
                  {isLoading ? (
                    <span className="animate-pulse">LOADING DATA...</span>
                  ) : (
                    <Typewriter 
                      text={dialogueText} 
                      onComplete={() => setIsTypingComplete(true)} 
                    />
                  )}
                </p>
              </div>

              {isTypingComplete && !isLoading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 flex gap-4"
                >
                  {/* Achievement content removed */}
                  {/* Buttons removed as per user request */}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Frame Card */}
      <AnimatePresence>
        {focusTarget === 'photo-frame' && (
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="absolute left-2 sm:left-12 top-1/2 -translate-y-1/2 z-[80] pointer-events-none"
          >
            <div className="bg-black/90 border-2 sm:border-4 border-[#00ff41] p-4 sm:p-8 shadow-[12px_12px_0px_0px_rgba(0,255,65,0.2)] max-w-[200px] sm:max-w-sm pointer-events-auto">
              <h2 className="text-[#00ff41] text-base sm:text-2xl font-bold uppercase tracking-tighter mb-2 sm:mb-4">Sivashankaran</h2>
              <div className="space-y-1.5 sm:space-y-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#00ff41]" />
                  <p className="text-white text-[10px] sm:text-sm font-bold uppercase tracking-widest">IT Engineer</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#00ff41]" />
                  <p className="text-white text-[10px] sm:text-sm font-bold uppercase tracking-widest">AI ENTHUSIAST</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#00ff41]" />
                  <p className="text-white text-[10px] sm:text-sm font-bold uppercase tracking-widest">Leader</p>
                </div>
              </div>
              <p className="text-white/40 text-[8px] sm:text-[10px] uppercase mt-4 sm:mt-8 tracking-widest mb-3 sm:mb-6">
                "Building the future, one pixel at a time."
              </p>
              
              <button 
                onClick={() => setFocusTarget('computer')}
                className="w-full bg-[#00ff41] text-black py-2 sm:py-3 px-3 sm:px-4 font-bold text-[9px] sm:text-xs uppercase tracking-widest hover:bg-white transition-colors border-b-4 border-r-4 border-green-900 active:border-0 active:translate-y-1 active:translate-x-1"
              >
                Access my files to know more
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start Music Overlay for Easter Egg */}
      <AnimatePresence>
        {showStartMusic && !isDiscoMode && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] flex flex-col items-center gap-6"
          >
            <div className="bg-black/90 p-8 border-4 border-[#00ff41] shadow-[0_0_50px_rgba(0,255,65,0.5)] flex flex-col items-center gap-4">
              <span className="text-[#00ff41] text-2xl font-black uppercase tracking-[0.2em] animate-pulse">PLATINUM GROOVE UNLOCKED!</span>
              <button 
                onClick={() => {
                  setIsDiscoMode(true);
                  setShowStartMusic(false);
                }}
                className="bg-[#00ff41] text-black px-12 py-4 text-xl font-black rounded-full hover:bg-white transition-all hover:scale-110 active:scale-95 shadow-[0_0_30px_rgba(0,255,65,0.8)]"
              >
                START THE MUSIC
              </button>
              <button 
                onClick={() => setShowStartMusic(false)}
                className="text-white/40 text-xs uppercase hover:text-white transition-colors"
              >
                [CANCEL]
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title and Instructions */}
      {!showDialogue && focusTarget === 'room' && (
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 text-center pointer-events-none w-full px-2">
          <div className="mb-1 sm:mb-2 flex flex-col items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-2 sm:gap-6 mb-0.5 sm:mb-1">
              <div className="flex items-center gap-2 sm:gap-4 pointer-events-auto">
                <a href="https://in.linkedin.com/in/siva-shankaran" target="_blank" rel="noreferrer" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-white/20 bg-black/40 flex items-center justify-center hover:bg-[#0077b5] hover:border-[#0077b5] transition-all hover:scale-110 group" title="LinkedIn">
                  <Linkedin size={11} className="text-white/60 group-hover:text-white" />
                </a>
                <a href="https://github.com/Shivaspark" target="_blank" rel="noreferrer" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-white/20 bg-black/40 flex items-center justify-center hover:bg-[#333] hover:border-[#333] transition-all hover:scale-110 group" title="GitHub">
                  <Github size={11} className="text-white/60 group-hover:text-white" />
                </a>
              </div>

              <h1 className="text-lg sm:text-3xl font-bold tracking-[0.1em] sm:tracking-[0.2em] uppercase animate-fluid whitespace-nowrap">SIVASHANKARAN</h1>

              <div className="flex items-center gap-2 sm:gap-4 pointer-events-auto">
                <a href="https://www.instagram.com/shiva_spark_/" target="_blank" rel="noreferrer" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-white/20 bg-black/40 flex items-center justify-center hover:bg-[#e4405f] hover:border-[#e4405f] transition-all hover:scale-110 group" title="Instagram">
                  <Instagram size={11} className="text-white/60 group-hover:text-white" />
                </a>
                <button 
                  onClick={() => {
                    window.open('https://github.com/Shivaspark/My-3d-portfolio', '_blank');
                  }}
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-white/20 bg-black/40 flex items-center justify-center hover:bg-[#ffc107] hover:border-[#ffc107] transition-all hover:scale-110 group"
                  title="Star on GitHub"
                >
                  <Star size={11} className="text-white/60 group-hover:text-white" />
                </button>
              </div>
            </div>
            
            <p className="text-[#00ff41] text-[9px] sm:text-xs font-bold tracking-[0.2em] sm:tracking-[0.3em] uppercase opacity-80 mb-1 sm:mb-2">AI ENTHUSIAST</p>
            <p className="text-white text-[7px] sm:text-[8px] tracking-widest uppercase opacity-40 hidden sm:block">EXPLORE MY DIGITAL SPACE TO KNOW MORE</p>
          </div>
        </div>
      )}
    </div>
  );
}

