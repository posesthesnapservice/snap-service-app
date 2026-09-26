"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, canAccessPhotography } from "@/lib/auth-helpers";
import { mockShotList } from "@/lib/mock-data";

export default function ShotListPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeEvent, setActiveEvent] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const u = getUser();
    if (u && !canAccessPhotography(u.role)) {
      router.replace('/home');
    }
  }, []);

  // Derive unique events from mockShotList
  const events = ["All", ...Array.from(new Set(mockShotList.map(shot => shot.event || "Other")))];

  const filteredShots = mockShotList.filter(shot => {
    const matchesSearch = shot.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          shot.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEvent = activeEvent === "All" || shot.event === activeEvent;
    return matchesSearch && matchesEvent;
  });

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a0f", padding: "1rem", paddingBottom: "6rem", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem", color: "#f8fafc" }}>Shot List</h1>
      
      {/* Search Bar */}
      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Search shots..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "0.75rem",
            borderRadius: "0.5rem",
            border: "1px solid #1f1f2e",
            backgroundColor: "#12121a",
            color: "#f8fafc",
            outline: "none",
            boxSizing: "border-box"
          }}
        />
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", overflowX: "auto", gap: "0.5rem", marginBottom: "1.5rem", paddingBottom: "0.5rem", scrollbarWidth: "none" }}>
        {events.map(event => (
          <button
            key={event}
            onClick={() => setActiveEvent(event)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "9999px",
              fontSize: "0.875rem",
              fontWeight: "500",
              whiteSpace: "nowrap",
              transition: "background-color 0.2s, color 0.2s",
              border: activeEvent === event ? "1px solid #D4AF37" : "1px solid #1f1f2e",
              backgroundColor: activeEvent === event ? "#D4AF37" : "#12121a",
              color: activeEvent === event ? "#0a0a0f" : "#94a3b8",
              cursor: "pointer"
            }}
          >
            {event}
          </button>
        ))}
      </div>

      {/* Shot List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {filteredShots.length > 0 ? (
          filteredShots.map((shot: any) => (
            <div 
              key={shot.id} 
              style={{ backgroundColor: "#12121a", borderRadius: "0.75rem", border: "1px solid #1f1f2e", overflow: "hidden", transition: "all 0.2s" }}
            >
              <div 
                style={{ padding: "1rem", display: "flex", gap: "1rem", cursor: "pointer" }}
                onClick={() => setExpandedId(expandedId === shot.id ? null : shot.id)}
              >
                {shot.image_url ? (
                  <div style={{ width: "4rem", height: "4rem", borderRadius: "0.5rem", backgroundColor: "#1f1f2e", flexShrink: 0, overflow: "hidden" }}>
                    <img src={shot.image_url} alt={shot.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ) : (
                  <div style={{ width: "4rem", height: "4rem", borderRadius: "0.5rem", backgroundColor: "#1f1f2e", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>No image</span>
                  </div>
                )}
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
                    <h3 style={{ fontWeight: "bold", color: "#f8fafc", margin: 0 }}>{shot.title}</h3>
                    <span style={{ fontSize: "0.75rem", fontWeight: "500", backgroundColor: "rgba(212,175,55,0.1)", color: "#D4AF37", padding: "0.25rem 0.5rem", borderRadius: "9999px" }}>
                      {shot.event}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.875rem", color: "#94a3b8", margin: "0 0 0.5rem 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{shot.description}</p>
                  
                  {shot.tags && shot.tags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.5rem" }}>
                      {shot.tags.map((tag: string) => (
                        <span key={tag} style={{ fontSize: "0.625rem", backgroundColor: "#1f1f2e", color: "#94a3b8", padding: "0.25rem 0.5rem", borderRadius: "9999px" }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Expandable Instructions */}
              {expandedId === shot.id && shot.instructions && (
                <div style={{ padding: "0 1rem 1rem 1rem", borderTop: "1px solid #1f1f2e", backgroundColor: "#0a0a0f", paddingTop: "0.5rem" }}>
                  <h4 style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#f8fafc", margin: "0 0 0.25rem 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Instructions</h4>
                  <p style={{ fontSize: "0.875rem", color: "#94a3b8", whiteSpace: "pre-line", margin: 0 }}>{shot.instructions}</p>
                </div>
              )}
            </div>
          ))
        ) : (
          <div style={{ textAlign: "center", padding: "3rem", backgroundColor: "#12121a", borderRadius: "0.75rem", border: "1px solid #1f1f2e" }}>
            <p style={{ color: "#94a3b8", margin: 0 }}>No shots found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
