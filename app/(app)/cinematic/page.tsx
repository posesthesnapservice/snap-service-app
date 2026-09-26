"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, canAccessVideography } from "@/lib/auth-helpers";
import { getCinematicDB } from "@/lib/poses-db-helpers";
import { CinematicShot } from "@/lib/types";

export default function CinematicShotsPage() {
  const router = useRouter();
  const [shots, setShots] = useState<CinematicShot[]>([]);
  const [activeTab, setActiveTab] = useState("All");
  const [selectedShot, setSelectedShot] = useState<CinematicShot | null>(null);

  useEffect(() => {
    const u = getUser();
    if (u && !canAccessVideography(u.role)) {
      router.replace('/home');
      return;
    }
    setShots(getCinematicDB().filter((s: any) => s.status !== 'hidden'));
  }, []);

  const categories = ["All", ...Array.from(new Set(shots.map(shot => shot.event || shot.camera_movement || "Other")))];

  const filteredShots = shots.filter(shot => {
    return activeTab === "All" || shot.event === activeTab || shot.camera_movement === activeTab;
  });

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a0f", color: "#f8fafc", padding: "1rem", paddingBottom: "6rem", position: "relative", fontFamily: "sans-serif" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.875rem", fontWeight: "bold", margin: "0 0 0.25rem 0", color: "#D4AF37" }}>Cinematic Shots Guide</h1>
        <p style={{ color: "#94a3b8", margin: 0 }}>Camera movements and positioning guides for wedding films</p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", overflowX: "auto", gap: "0.75rem", marginBottom: "1.5rem", paddingBottom: "0.5rem", scrollbarWidth: "none" }}>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setActiveTab(category)}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "9999px",
              fontSize: "0.875rem",
              fontWeight: "500",
              whiteSpace: "nowrap",
              transition: "background-color 0.2s, color 0.2s",
              border: activeTab === category ? "1px solid #D4AF37" : "1px solid #1f1f2e",
              backgroundColor: activeTab === category ? "#D4AF37" : "#12121a",
              color: activeTab === category ? "#0a0a0f" : "#94a3b8",
              cursor: "pointer"
            }}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Shots Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
        {filteredShots.map(shot => {
          const isPortrait = (shot.orientation || 'portrait') === 'portrait';
          return (
            <div
              key={shot.id}
              onClick={() => setSelectedShot(shot)}
              style={{
                backgroundColor: "#12121a",
                borderRadius: "1rem",
                overflow: "hidden",
                border: "1px solid #1f1f2e",
                cursor: "pointer",
                transition: "transform 0.2s, border-color 0.2s"
              }}
            >
              {/* Aspect Ratio Video Framing Container */}
              <div style={{ 
                position: "relative", 
                width: "100%", 
                paddingTop: isPortrait ? "135%" : "56.25%", // 9:16 portrait vs 16:9 landscape 
                backgroundColor: "#000",
                overflow: "hidden"
              }}>
                <img
                  src={shot.media_url || "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800"}
                  alt={shot.title}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.8) 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(212,175,55,0.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#000">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  </div>
                </div>

                <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: "6px" }}>
                  {shot.event && (
                    <span style={{ backgroundColor: "#D4AF37", color: "#000", padding: "3px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold" }}>
                      {shot.event}
                    </span>
                  )}
                  <span style={{ background: "rgba(0,0,0,0.6)", color: "#fff", padding: "3px 8px", borderRadius: "4px", fontSize: "10px", border: "1px solid rgba(255,255,255,0.2)" }}>
                    {isPortrait ? "📱 9:16 Reel" : "🖥️ 16:9 Film"}
                  </span>
                </div>
              </div>

              <div style={{ padding: "1.25rem" }}>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "600", margin: "0 0 0.5rem 0", color: "#f8fafc" }}>{shot.title}</h3>
                <p style={{ color: "#94a3b8", fontSize: "0.875rem", margin: 0, lineHeight: "1.4" }}>{shot.description}</p>
                
                {shot.camera_movement && (
                  <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#D4AF37" }}>
                    📹 Movement: {shot.camera_movement}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Popup */}
      {selectedShot && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ width: "100%", maxWidth: (selectedShot.orientation || 'portrait') === 'portrait' ? '400px' : '640px', backgroundColor: "#12121a", borderRadius: "1.5rem", overflow: "hidden", border: "1px solid rgba(212,175,55,0.4)" }}>
            <div style={{ position: "relative", width: "100%", paddingTop: (selectedShot.orientation || 'portrait') === 'portrait' ? '135%' : '56.25%', backgroundColor: "#000" }}>
              <img
                src={selectedShot.media_url || "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800"}
                alt={selectedShot.title}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
              />
              <button
                onClick={() => setSelectedShot(null)}
                style={{ position: "absolute", top: "1rem", right: "1rem", backgroundColor: "rgba(0,0,0,0.6)", color: "#fff", border: "none", width: "2.5rem", height: "2.5rem", borderRadius: "50%", cursor: "pointer", fontSize: "1.25rem", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={{ backgroundColor: "#D4AF37", color: "#000", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}>{selectedShot.event || 'General'}</span>
                <span style={{ fontSize: "11px", color: "#888" }}>{(selectedShot.orientation || 'portrait') === 'portrait' ? '📱 9:16 Vertical Reel' : '🖥️ 16:9 Widescreen Film'}</span>
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", margin: "0 0 0.5rem 0", color: "#D4AF37" }}>{selectedShot.title}</h2>
              <p style={{ color: "#cbd5e1", fontSize: "0.95rem", lineHeight: "1.5", margin: "0 0 1rem 0" }}>{selectedShot.description}</p>
              
              {selectedShot.camera_movement && (
                <div style={{ fontSize: "0.85rem", color: "#D4AF37", marginBottom: "4px" }}>📹 Movement: {selectedShot.camera_movement}</div>
              )}
              {selectedShot.framing && (
                <div style={{ fontSize: "0.85rem", color: "#aaa" }}>📐 Framing: {selectedShot.framing}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
