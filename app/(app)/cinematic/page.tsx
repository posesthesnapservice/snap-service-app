"use client";

import React, { useState } from "react";
import { mockCinematicShots } from "@/lib/mock-data";

export default function CinematicShotsPage() {
  const [activeTab, setActiveTab] = useState("All");
  const [selectedShot, setSelectedShot] = useState<any | null>(null);

  const categories = ["All", ...Array.from(new Set(mockCinematicShots.map(shot => shot.camera_movement || "Other")))];

  const filteredShots = mockCinematicShots.filter(shot => {
    return activeTab === "All" || shot.camera_movement === activeTab;
  });

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a0f", color: "#f8fafc", padding: "1rem", paddingBottom: "6rem", position: "relative", fontFamily: "sans-serif" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.875rem", fontWeight: "bold", margin: "0 0 0.25rem 0", color: "#f8fafc" }}>Cinematic Shots</h1>
        <p style={{ color: "#94a3b8", margin: 0 }}>Video reference library</p>
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

      {/* Grid of cinematic shots */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
        {filteredShots.map((shot: any) => (
          <div 
            key={shot.id} 
            style={{ backgroundColor: "#12121a", borderRadius: "0.75rem", border: "1px solid #1f1f2e", overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column" }}
            onClick={() => setSelectedShot(shot)}
          >
            <div style={{ aspectRatio: "16/9", backgroundColor: "#0a0a0f", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {shot.image_url ? (
                <img src={shot.image_url} alt={shot.title} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }} />
              ) : (
                <div style={{ width: "3rem", height: "3rem", borderRadius: "9999px", backgroundColor: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: "1rem", height: "1rem", backgroundColor: "#f8fafc", borderRadius: "2px", transform: "rotate(45deg)" }}></div>
                </div>
              )}
              <div style={{ position: "absolute", top: "0.5rem", right: "0.5rem", backgroundColor: "rgba(0,0,0,0.6)", padding: "0.25rem 0.5rem", borderRadius: "0.375rem", fontSize: "0.625rem", fontWeight: "bold", color: "#f8fafc", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {shot.movement || "Static"}
              </div>
            </div>
            
            <div style={{ padding: "1rem", flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <h3 style={{ fontWeight: "bold", fontSize: "1.125rem", margin: 0, color: "#f8fafc" }}>{shot.title}</h3>
                {shot.event && (
                  <span style={{ fontSize: "0.75rem", backgroundColor: "#1f1f2e", color: "#94a3b8", padding: "0.25rem 0.5rem", borderRadius: "0.375rem", marginLeft: "0.5rem" }}>
                    {shot.event}
                  </span>
                )}
              </div>
              <p style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "0.75rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{shot.description}</p>
              
              {shot.framing_tip && (
                <div style={{ backgroundColor: "#1f1f2e", borderRadius: "0.25rem", padding: "0.5rem", border: "1px solid #333344", marginTop: "auto" }}>
                  <p style={{ fontSize: "0.75rem", color: "#f8fafc", margin: 0 }}>
                    <span style={{ color: "#D4AF37", fontWeight: "bold", marginRight: "0.25rem" }}>TIP:</span> {shot.framing_tip}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal / Bottom Sheet */}
      {selectedShot && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.8)", padding: "1rem" }}>
          <div 
            style={{ backgroundColor: "#12121a", width: "100%", maxWidth: "32rem", borderRadius: "1rem", overflow: "hidden", border: "1px solid #1f1f2e", maxHeight: "90vh", overflowY: "auto" }}
          >
            <div style={{ position: "relative" }}>
              <div style={{ aspectRatio: "16/9", backgroundColor: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {selectedShot.image_url ? (
                  <img src={selectedShot.image_url} alt={selectedShot.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "4rem", height: "4rem", borderRadius: "9999px", backgroundColor: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: "1.25rem", height: "1.25rem", backgroundColor: "#fff", borderRadius: "2px", transform: "rotate(45deg)" }}></div>
                  </div>
                )}
              </div>
              
              <button 
                style={{ position: "absolute", top: "1rem", right: "1rem", width: "2rem", height: "2rem", backgroundColor: "rgba(0,0,0,0.5)", borderRadius: "9999px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", fontSize: "1.25rem", lineHeight: 1 }}
                onClick={() => setSelectedShot(null)}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ padding: "0.25rem 0.5rem", backgroundColor: "rgba(212,175,55,0.2)", color: "#D4AF37", fontSize: "0.75rem", fontWeight: "bold", borderRadius: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {selectedShot.movement || "Static"}
                </span>
                <span style={{ padding: "0.25rem 0.5rem", backgroundColor: "#1f1f2e", color: "#94a3b8", fontSize: "0.75rem", fontWeight: "bold", borderRadius: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {selectedShot.event}
                </span>
              </div>
              
              <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem", color: "#f8fafc" }}>{selectedShot.title}</h2>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", color: "#94a3b8" }}>
                <div>
                  <h4 style={{ color: "#f8fafc", fontWeight: "500", marginBottom: "0.25rem" }}>Description</h4>
                  <p style={{ fontSize: "0.875rem", lineHeight: 1.5, margin: 0 }}>{selectedShot.description}</p>
                </div>
                
                {selectedShot.framing_tip && (
                  <div style={{ backgroundColor: "#1f1f2e", padding: "1rem", borderRadius: "0.75rem", border: "1px solid #333344" }}>
                    <h4 style={{ color: "#D4AF37", fontWeight: "500", marginBottom: "0.25rem", margin: "0 0 0.25rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span>📸</span> Framing Tip
                    </h4>
                    <p style={{ fontSize: "0.875rem", margin: 0, color: "#f8fafc" }}>{selectedShot.framing_tip}</p>
                  </div>
                )}
                
                {selectedShot.equipment && (
                  <div>
                    <h4 style={{ color: "#f8fafc", fontWeight: "500", marginBottom: "0.25rem", marginTop: 0 }}>Recommended Equipment</h4>
                    <p style={{ fontSize: "0.875rem", backgroundColor: "#1f1f2e", display: "inline-block", padding: "0.25rem 0.75rem", borderRadius: "0.375rem", margin: 0 }}>{selectedShot.equipment}</p>
                  </div>
                )}
              </div>
              
              <button 
                style={{ width: "100%", marginTop: "2rem", padding: "0.75rem", backgroundColor: "#D4AF37", color: "#0a0a0f", fontWeight: "bold", borderRadius: "0.75rem", cursor: "pointer", border: "none" }}
                onClick={() => setSelectedShot(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
