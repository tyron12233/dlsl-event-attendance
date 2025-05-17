"use client";

import React, { useState, useEffect } from "react";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { Attendance, Event, dlslGreen } from "@/lib/types";
import RegistrationPage from "@/components/registration";
import EventListPage from "@/components/event-list";
import CreateEventPage from "@/components/create-event";

export default function Home() {
  const [view, setView] = useState<"events" | "registration" | "create">(
    "events"
  );
  const [events, setEvents] = useState<Event[]>([]);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);

  // Load/Save Events from/to localStorage (no changes)
  useEffect(() => {
    const storedEvents = localStorage.getItem("events");
    if (storedEvents) {
      try {
        const p = JSON.parse(storedEvents);
        if (Array.isArray(p)) setEvents(p);
        else localStorage.removeItem("events");
      } catch (e) {
        console.error("LS parse error:", e);
        localStorage.removeItem("events");
      }
    }
  }, []);
  useEffect(() => {
    localStorage.setItem("events", JSON.stringify(events));
  }, [events]);

  const exportToExcel = (event: Event | null) => {
    // Allow null
    if (!event || event.attendees.length === 0) {
      alert("No attendees to export.");
      return;
    }
    const wsData = event.attendees.map((a) => ({
      "Student ID": a.studentId,
      "Full Name": a.fullName,
      Department: a.department,
      Email: a.email,
      "Check-in Time": new Date(a.timestamp).toLocaleString("en-PH", {
        dateStyle: "short",
        timeStyle: "short",
        hour12: true,
      }),
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    ws["!cols"] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 25 },
      { wch: 30 },
      { wch: 22 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });
    saveAs(
      data,
      `${event.name.replace(/[^a-z0-9]/gi, "_")}_Attendance_${event.date}.xlsx`
    );
  };

  const deleteEvent = (eventId: string) => {
    if (window.confirm("Delete this event permanently?")) {
      setEvents((prev) => prev.filter((event) => event.id !== eventId));
      if (currentEvent?.id === eventId) {
        setView("events");
        setCurrentEvent(null);
      }
    }
  };

  const handleCreateEvent = (event: Event) => {
    setEvents((prev) => [...prev, event]);
    setView("events");

    
  };

  const goBackToEvents = () => {
    setView("events");
    setCurrentEvent(null); // Reset registration state
  };

  const handleEventAttendance = (student: Attendance) => {
    const currentEventId = currentEvent?.id;
    if (!currentEventId) return;

    setEvents((prevEvents) =>
      prevEvents.map((event) => {
        if (event.id === currentEventId) {
          const updatedAttendees = [...event.attendees, student];
          return { ...event, attendees: updatedAttendees };
        }
        return event;
      })
    );

    setCurrentEvent((prev) => {
      if (prev) {
        return {
          ...prev,
          attendees: [...prev.attendees, student],
        };
      }
      return null;
    });
  };

  return (
    <div className={`min-h-screen ${dlslGreen.lightBg}`}>
      {view === "events" && (
        <EventListPage
          events={events}
          onSetCurrentEvent={(event) => {
            setCurrentEvent(event);
            setView("registration");
          }}
          onCreateEvent={() => setView("create")}
          onDeleteEvent={deleteEvent}
          onExportToExcel={exportToExcel}
        />
      )}
      {view === "registration" && currentEvent && (
        <RegistrationPage
          currentEvent={currentEvent}
          onEventAttendance={handleEventAttendance}
          onBack={goBackToEvents}
        />
      )}
      {view === "create" && (
        <CreateEventPage
          onBack={() => setView("events")}
          onCreateEvent={handleCreateEvent}
        />
      )}
    </div>
  );
}
