"use client";

import React, { useState, useEffect } from "react";
import { mockChecklistEvents, mockChecklistItems } from "@/lib/mock-data";

export default function DontMissPage() {
  const [activeEvent, setActiveEvent] = useState<string>(mockChecklistEvents[0]?.name || 'Mehndi');
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});
  
  // Load initial state from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`snap_checklist_${activeEvent}`);
      if (stored) {
        setCompletedItems(JSON.parse(stored));
      } else {
        setCompletedItems({});
      }
    } catch (e) {
      console.error("Failed to load checklist state", e);
    }
  }, [activeEvent]);

  // Save to local storage on change
  const toggleItem = (itemId: string) => {
    setCompletedItems(prev => {
      const newState = {
        ...prev,
        [itemId]: !prev[itemId]
      };
      
      try {
        localStorage.setItem(`snap_checklist_${activeEvent}`, JSON.stringify(newState));
      } catch (e) {
        console.error("Failed to save checklist state", e);
      }
      
      return newState;
    });
  };

  const resetAll = () => {
    if (confirm(`Are you sure you want to reset all checklist items for ${activeEvent}?`)) {
      setCompletedItems({});
      try {
        localStorage.removeItem(`snap_checklist_${activeEvent}`);
      } catch (e) {}
    }
  };

  // Filter items for current event
  const activeEventObj = mockChecklistEvents.find(e => e.name === activeEvent);
  const currentEventItems = mockChecklistItems.filter((item: any) => item.event_id === activeEventObj?.id);
  const completedCount = currentEventItems.filter((item: any) => completedItems[item.id]).length;
  const totalCount = currentEventItems.length;
  const isAllComplete = totalCount > 0 && completedCount === totalCount;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a0f", paddingBottom: "6rem", fontFamily: "sans-serif" }}>
      {/* Header Area */}
      <div style={{ backgroundColor: "#12121a", padding: "1.5rem 1rem 1rem", borderBottom: "1px solid #1f1f2e", position: "sticky", top: 0, zIndex: 10 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: "0 0 0.5rem 0", color: "#f8fafc" }}>Don't Miss This</h1>
        <p style={{ color: "#94a3b8", fontSize: "0.875rem", margin: "0 0 1rem 0" }}>Essential shots checklist</p>
        
        {/* Event Tabs */}
        <div style={{ display: "flex", overflowX: "auto", gap: "0.5rem", paddingBottom: "0.25rem", scrollbarWidth: "none" }}>
          {mockChecklistEvents.map((event) => {
            const eventName = typeof event === 'string' ? event : event.name;
            const isActive = activeEvent === eventName;
            return (
              <button
                key={eventName}
                onClick={() => setActiveEvent(eventName)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  whiteSpace: "nowrap",
                  transition: "background-color 0.2s, color 0.2s",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: isActive ? "#D4AF37" : "#1f1f2e",
                  color: isActive ? "#0a0a0f" : "#94a3b8",
                  boxShadow: isActive ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)" : "none",
                }}
              >
                {eventName}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "1rem" }}>
        {/* Progress Section */}
        <div style={{ marginBottom: "1.5rem", backgroundColor: "#12121a", padding: "1rem", borderRadius: "0.75rem", border: "1px solid #1f1f2e" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontWeight: "600", color: "#f8fafc" }}>Progress</span>
            <span style={{ fontSize: "0.875rem", fontWeight: "bold", color: "#D4AF37" }}>{completedCount} / {totalCount}</span>
          </div>
          <div style={{ height: "0.75rem", width: "100%", backgroundColor: "#1f1f2e", borderRadius: "9999px", overflow: "hidden" }}>
            <div 
              style={{
                height: "100%",
                backgroundColor: "#D4AF37",
                borderRadius: "9999px",
                transition: "width 0.5s ease-out",
                width: `${totalCount === 0 ? 0 : (completedCount / totalCount) * 100}%`
              }}
            ></div>
          </div>
          
          {isAllComplete && (
            <div style={{ marginTop: "1rem", padding: "0.75rem", backgroundColor: "rgba(212, 175, 55, 0.1)", border: "1px solid rgba(212, 175, 55, 0.3)", borderRadius: "0.5rem", textAlign: "center" }}>
              <p style={{ color: "#D4AF37", fontWeight: "bold", margin: 0 }}>✓ All shots captured!</p>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
          <button 
            onClick={resetAll}
            style={{
              fontSize: "0.75rem",
              fontWeight: "600",
              color: "#ef4444",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              padding: "0.375rem 0.75rem",
              borderRadius: "0.375rem",
              border: "none",
              cursor: "pointer",
              transition: "background-color 0.2s"
            }}
          >
            Reset All
          </button>
        </div>

        {/* Checklist */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {currentEventItems.length > 0 ? (
            currentEventItems.map((item: any) => {
              const isDone = completedItems[item.id] || false;
              
              return (
                <div 
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    padding: "1rem",
                    borderRadius: "0.75rem",
                    cursor: "pointer",
                    transition: "all 0.3s",
                    border: isDone ? "1px solid #1f1f2e" : "1px solid transparent",
                    backgroundColor: isDone ? "#0a0a0f" : "#12121a",
                    boxSizing: "border-box"
                  }}
                >
                  <div style={{
                    width: "1.5rem",
                    height: "1.5rem",
                    borderRadius: "9999px",
                    border: isDone ? "2px solid #D4AF37" : "2px solid #333344",
                    marginRight: "1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.3s",
                    backgroundColor: isDone ? "#D4AF37" : "transparent"
                  }}>
                    {isDone && (
                      <svg style={{ width: "0.875rem", height: "0.875rem", color: "#0a0a0f" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <span style={{ 
                      fontSize: "1rem", 
                      transition: "all 0.3s", 
                      color: isDone ? "#94a3b8" : "#f8fafc",
                      textDecoration: isDone ? "line-through" : "none",
                      fontWeight: isDone ? "normal" : "500",
                      display: "block"
                    }}>
                      {item.title}
                    </span>
                    {item.description && !isDone && (
                      <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.25rem", marginBottom: 0 }}>{item.description}</p>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: "center", padding: "2.5rem 0" }}>
              <p style={{ color: "#94a3b8", margin: 0 }}>No checklist items for this event yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
