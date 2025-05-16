"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { saveAs } from "file-saver";
import {
  X,
  Check,
  Plus,
  Download,
  ArrowLeft,
  Trash2,
  ScanLine,
  Heart,
  Users,
  Hourglass,
} from "lucide-react"; // Added Users, Hourglass
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import {
  Student,
  StudentCache,
  Attendance,
  Event,
  dlslGrayText,
  dlslGreen,
  dlslMutedText,
  dlslWhite,
  durationFast,
  durationMedium,
  errorColor,
  messageTimeout,
  springFast,
  successColor,
  warningColor,
  welcomeMessages,
} from "@/lib/types";
import useWindowSize from "@/hooks/use-window-size";
import RegistrationPage from "@/components/registration";

export default function Home() {
  const [view, setView] = useState<"events" | "registration" | "create">(
    "events"
  );
  const [events, setEvents] = useState<Event[]>([]);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);

  // Registration View State
  // Create Event View State
  const [newEvent, setNewEvent] = useState({
    name: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
  });

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

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newEvent.name.trim();
    if (!trimmedName || !newEvent.date) return;
    const newEventData: Event = {
      id: Date.now().toString(),
      name: trimmedName,
      date: newEvent.date,
      description: newEvent.description.trim(),
      attendees: [],
    };
    setEvents((prevEvents) => [...prevEvents, newEventData]);
    setNewEvent({
      name: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
    });
    setView("events");
  };

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

  const goBackToEvents = () => {
    setView("events");
    setCurrentEvent(null); // Reset registration state
  };

  // --- RENDER FUNCTIONS --- (Apply faster animations and lighter theme)

  const renderEventList = () => (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {" "}
      {/* Slightly reduced space */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className={`text-3xl font-semibold ${dlslGreen.darkText}`}>
          DLSL Event Attendance
        </h1>
        <motion.button
          whileHover={{
            scale: 1.05,
            boxShadow: `0px 4px 14px rgba(52, 211, 153, 0.4)`,
          }} // Lighter green shadow
          whileTap={{ scale: 0.95 }}
          className={`${dlslGreen.DEFAULT} ${dlslGreen.hover} ${dlslWhite} px-5 py-2 rounded-full flex items-center gap-2 shadow transition-all duration-200`}
          onClick={() => setView("create")}
        >
          {" "}
          <Plus size={20} /> <span>New Event</span>{" "}
        </motion.button>
      </div>
      {events.length ===
      0 /* No changes needed here except maybe theme colors if desired */ ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: durationMedium }}
          >
            <ScanLine size={48} className="mx-auto text-green-300 mb-4" />
            <h2 className="text-xl text-gray-500 mb-6">No events yet.</h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`${dlslGreen.DEFAULT} ${dlslGreen.hover} ${dlslWhite} px-5 py-2 rounded-full flex items-center gap-2 mx-auto shadow transition-colors`}
              onClick={() => setView("create")}
            >
              {" "}
              <Plus size={18} /> <span>Create Event</span>{" "}
            </motion.button>
          </motion.div>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {" "}
          {/* Reduced gap */}
          {events.map((event) => (
            <motion.div
              key={event.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={springFast} // Faster spring
              className="bg-white rounded-xl p-5 shadow border border-gray-100 hover:shadow-md transition-shadow duration-200 flex flex-col justify-between"
            >
              <div>
                {" "}
                {/* Content */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h2
                      className={`text-lg font-semibold ${dlslGreen.darkText}`}
                    >
                      {event.name}
                    </h2>{" "}
                    {/* Slightly smaller title */}
                    <p className={`text-sm ${dlslMutedText} mt-1`}>
                      {" "}
                      {new Date(event.date + "T00:00:00").toLocaleDateString(
                        "en-US",
                        { year: "numeric", month: "short", day: "numeric" }
                      )}{" "}
                    </p>{" "}
                    {/* Shorter month */}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0 ml-3">
                    {" "}
                    {/* Tighter buttons */}
                    <motion.button
                      whileHover={{ scale: 1.1, backgroundColor: "#fee2e2" }}
                      whileTap={{ scale: 0.9 }}
                      className="bg-red-50 text-red-500 p-1.5 rounded-full transition-colors hover:text-red-600" // Smaller padding
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteEvent(event.id);
                      }}
                      title="Delete"
                    >
                      {" "}
                      <Trash2 size={16} />{" "}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1, backgroundColor: "#E0F2FE" }}
                      whileTap={{ scale: 0.9 }}
                      className={`bg-blue-50 text-blue-500 p-1.5 rounded-full flex items-center justify-center transition-colors ${
                        event.attendees.length === 0
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-blue-100 hover:text-blue-600"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (event.attendees.length > 0) exportToExcel(event);
                      }}
                      disabled={event.attendees.length === 0}
                      title="Export"
                    >
                      {" "}
                      <Download size={16} />{" "}
                    </motion.button>
                  </div>
                </div>
                <p
                  className={`text-sm ${dlslGrayText} mt-1 mb-3 break-words whitespace-pre-wrap`}
                >
                  {event.description || (
                    <span className="italic text-gray-400">No description</span>
                  )}
                </p>
                <p className={`text-xs font-medium ${dlslGreen.text}`}>
                  {" "}
                  {/* Smaller text */}
                  <Users size={12} className="inline mr-1 align-text-bottom" />
                  {event.attendees.length}{" "}
                  {event.attendees.length === 1 ? "Attendee" : "Attendees"}
                </p>
              </div>
              <div className="mt-4">
                {" "}
                {/* Reduced margin */}
                <motion.button
                  whileHover={{
                    scale: 1.03,
                    y: -1,
                    boxShadow: `0px 3px 10px rgba(52, 211, 153, 0.2)`,
                  }}
                  whileTap={{ scale: 0.97 }}
                  className={`w-full ${dlslGreen.DEFAULT} ${dlslGreen.hover} ${dlslWhite} px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all duration-150 font-medium text-sm`} // Smaller padding/text
                  onClick={() => {
                    setCurrentEvent(event);
                    setView("registration");
                  }}
                >
                  {" "}
                  <span>Check-in</span>{" "}
                  <ArrowLeft size={16} className="transform rotate-180" />{" "}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );

  // --- CREATE EVENT VIEW --- (Apply faster animations and lighter theme)
  const renderCreateEvent = () => (
    <div className="max-w-xl mx-auto p-6">
      {" "}
      {/* Slightly smaller max-width */}
      <div className="flex items-center mb-6">
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: "#f3f4f6" }}
          whileTap={{ scale: 0.9 }}
          className="bg-gray-100 text-gray-700 p-1.5 rounded-full mr-3 hover:bg-gray-200 transition-colors"
          onClick={goBackToEvents}
          title="Back"
        >
          {" "}
          <ArrowLeft size={18} />{" "}
        </motion.button>
        <h1 className={`text-xl font-semibold ${dlslGreen.darkText}`}>
          Create New Event
        </h1>
      </div>
      <motion.form
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: durationFast }}
        onSubmit={handleCreateEvent}
        className="space-y-4 bg-white p-6 rounded-xl shadow-md border border-gray-100"
      >
        {" "}
        {/* Reduced padding/space */}
        <div>
          <label
            htmlFor="name"
            className={`block text-sm font-medium ${dlslGrayText} mb-1`}
          >
            {" "}
            Event Name <span className="text-red-500">*</span>{" "}
          </label>
          <input
            type="text"
            id="name"
            value={newEvent.name}
            onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
            className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-1 ${dlslGreen.ring} focus:border-green-400 transition-shadow focus:shadow-sm`}
            placeholder="Event Title"
            required
          />
        </div>
        <div>
          <label
            htmlFor="date"
            className={`block text-sm font-medium ${dlslGrayText} mb-1`}
          >
            {" "}
            Event Date <span className="text-red-500">*</span>{" "}
          </label>
          <input
            type="date"
            id="date"
            value={newEvent.date}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
            className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-1 ${dlslGreen.ring} focus:border-green-400 transition-shadow focus:shadow-sm`}
            required
          />
        </div>
        <div>
          <label
            htmlFor="description"
            className={`block text-sm font-medium ${dlslGrayText} mb-1`}
          >
            {" "}
            Description{" "}
            <span className="text-gray-400 text-xs">(Optional)</span>{" "}
          </label>
          <textarea
            id="description"
            value={newEvent.description}
            onChange={(e) =>
              setNewEvent({ ...newEvent, description: e.target.value })
            }
            rows={3} // Shorter
            className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-1 ${dlslGreen.ring} focus:border-green-400 min-h-[60px] resize-y transition-shadow focus:shadow-sm`}
            placeholder="Details..."
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 pt-3">
          {" "}
          {/* Tighter gap */}
          <motion.button
            whileHover={{ scale: 1.02, backgroundColor: "#e5e7eb" }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={goBackToEvents}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md flex-1 hover:bg-gray-200 transition-colors font-medium text-sm"
          >
            {" "}
            Cancel{" "}
          </motion.button>
          <motion.button
            whileHover={{
              scale: 1.02,
              boxShadow: `0px 3px 10px rgba(52, 211, 153, 0.25)`,
            }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className={`${dlslGreen.DEFAULT} ${
              dlslGreen.hover
            } ${dlslWhite} px-4 py-2 rounded-md flex-1 shadow-sm transition-all duration-150 font-medium text-sm ${
              !newEvent.name.trim() || !newEvent.date
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            disabled={!newEvent.name.trim() || !newEvent.date}
          >
            {" "}
            Create Event{" "}
          </motion.button>
        </div>
      </motion.form>
    </div>
  );

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
  // --- MAIN RETURN ---
  return (
    <div className={`min-h-screen ${dlslGreen.lightBg}`}>
      {view === "events" && renderEventList()}
      {view === "registration" && currentEvent && (
        <RegistrationPage
          currentEvent={currentEvent}
          onEventAttendance={handleEventAttendance}
          onBack={goBackToEvents}
        />
      )}
      {view === "create" && renderCreateEvent()}
    </div>
  );
}
