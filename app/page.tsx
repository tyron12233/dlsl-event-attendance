"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { saveAs } from "file-saver";
import { X } from 'lucide-react'; // Make sure to have this import at the top with others
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
// Import ScanLine icon
import { Check, Plus, Download, ArrowLeft, Trash2, ScanLine } from "lucide-react";

// Types (remain the same)
interface Student {
  email_address: string;
  department: string;
  fullName: string;
}

interface Attendance {
  studentId: string;
  fullName: string;
  department: string;
  email: string;
  timestamp: string;
}

interface Event {
  id: string;
  name: string;
  date: string;
  description: string;
  attendees: Attendance[];
}

// Welcome messages (remain the same)
const welcomeMessages = [
  "Welcome, {name}! Great to see you!",
  "Hello {name}! You made it!",
  "Hey there {name}! Thanks for coming!",
  "Glad you're here, {name}!",
  "Welcome to the event, {name}!",
  "Nice to see you, {name}!",
  "Thanks for joining us, {name}!",
  "You're all set, {name}!",
  "{name} has entered the building!",
  "Event check-in complete, {name}!",
];

export default function Home() {
  const [view, setView] = useState<"events" | "registration" | "create">("events");
  const [events, setEvents] = useState<Event[]>([]);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [studentId, setStudentId] = useState("");
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [newEvent, setNewEvent] = useState({
    name: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
  });
  const inputRef = useRef<HTMLInputElement>(null);

  // useEffect hooks (remain the same)
  useEffect(() => {
    const storedEvents = localStorage.getItem("events");
    if (storedEvents) {
      setEvents(JSON.parse(storedEvents));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("events", JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    if (view === "registration" && inputRef.current && !success) { // Ensure focus only happens when form is visible
      inputRef.current.focus();
    }
  }, [view, success]); // Re-focus if success ends

  // handleStudentIdChange (remains the same)
  const handleStudentIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStudentId(e.target.value);
  };

  // handleStudentIdSubmit (remains the same)
  const handleStudentIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentId || !currentEvent) return;

    setLoading(true);
    setStudent(null); // Clear previous student data immediately

    try {
      const alreadyRegistered = currentEvent.attendees.some((attendee) => attendee.studentId === studentId);

      if (alreadyRegistered) {
        // Find existing attendee to display name if needed
        const existingAttendee = currentEvent.attendees.find((attendee) => attendee.studentId === studentId);
        const name = existingAttendee ? existingAttendee.fullName.split(" ")[0] : "You";
        setWelcomeMessage(`${name}, you've already registered for this event!`);
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setStudentId("");
          setWelcomeMessage("");
        }, 3000);
        setLoading(false);
        return;
      }

      const response = await fetch(`https://student-info.tyronscott.me/api/student?id=${studentId}`);
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
      const data = await response.json();


      if (data.email_address) {
        const emailParts = data.email_address.split("@")[0];
        const nameParts = emailParts.split("_");
        const fullName = nameParts.map((part: string) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

        const studentData = {
          email_address: data.email_address,
          department: data.department,
          fullName,
        };
        setStudent(studentData);

        const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
        const message = welcomeMessages[randomIndex].replace("{name}", fullName.split(" ")[0]);
        setWelcomeMessage(message);

        const newAttendance: Attendance = {
          studentId,
          fullName,
          department: data.department,
          email: data.email_address,
          timestamp: new Date().toISOString(),
        };

        const updatedEvents = events.map((event) => {
          if (event.id === currentEvent.id) {
            return {
              ...event,
              attendees: [...event.attendees, newAttendance],
            };
          }
          return event;
        });

        setEvents(updatedEvents);
        setCurrentEvent((prevEvent) => prevEvent ? {
          ...prevEvent,
          attendees: [...prevEvent.attendees, newAttendance],
        } : null); // Safer update for currentEvent

        setSuccess(true);

        setTimeout(() => {
          setSuccess(false);
          setStudentId("");
          setStudent(null);
          setWelcomeMessage("");
        }, 3000);

      } else {
        // Handle case where student is not found by the API
        setWelcomeMessage("Student ID not found.");
        setSuccess(true); // Use success state to show the message
        setTimeout(() => {
          setSuccess(false);
          setStudentId("");
          setWelcomeMessage("");
        }, 3000);
      }
    } catch (error) {
      console.error("Error fetching student data:", error);
      // Display a generic error message to the user
      setWelcomeMessage("An error occurred. Please try again.");
      setSuccess(true); // Use success state to show the message
      setTimeout(() => {
        setSuccess(false);
        setStudentId("");
        setWelcomeMessage("");
      }, 3000);
    } finally {
      setLoading(false);
      // Refocus input after processing, unless success message is still showing
      if (!success && inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  // handleCreateEvent (remains the same)
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();

    const newEventData: Event = {
      id: Date.now().toString(),
      name: newEvent.name,
      date: newEvent.date,
      description: newEvent.description,
      attendees: [],
    };

    setEvents([...events, newEventData]);
    setNewEvent({
      name: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
    });
    setView("events");
  };

  // exportToExcel (remains the same)
  const exportToExcel = (event: Event) => {
    const worksheet = XLSX.utils.json_to_sheet(
      event.attendees.map((a) => ({
        "Student ID": a.studentId,
        Name: a.fullName,
        Department: a.department,
        Email: a.email,
        Time: new Date(a.timestamp).toLocaleString(),
      })),
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(data, `${event.name}_attendance_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // deleteEvent (remains the same)
  const deleteEvent = (eventId: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      setEvents(events.filter((event) => event.id !== eventId));
    }
  };

  // renderEventList (remains the same)
  const renderEventList = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-semibold text-gray-800">Events</h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-blue-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-md hover:bg-blue-600 transition-colors"
          onClick={() => setView("create")}
        >
          <Plus size={18} />
          <span>New Event</span>
        </motion.button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-xl text-gray-500 mb-4">No events yet</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-blue-500 text-white px-4 py-2 rounded-full flex items-center gap-2 mx-auto shadow-md hover:bg-blue-600 transition-colors"
            onClick={() => setView("create")}
          >
            <Plus size={18} />
            <span>Create your first event</span>
          </motion.button>
        </div>
      ) : (
        <div className="grid gap-6">
          {events.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-medium text-gray-800">{event.name}</h2>
                  <p className="text-gray-500 mt-1">{new Date(event.date).toLocaleDateString()}</p>
                  <p className="text-gray-600 mt-2 whitespace-pre-wrap">{event.description || "No description"}</p> {/* Handle empty description */}
                  <p className="text-sm text-gray-500 mt-4">
                    {event.attendees.length} {event.attendees.length === 1 ? "attendee" : "attendees"}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0 ml-4"> {/* Prevent buttons shrinking/wrapping weirdly */}
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: "#fee2e2" }} // Red-100 on hover
                    whileTap={{ scale: 0.95 }}
                    className="bg-red-50 text-red-500 p-2 rounded-full transition-colors"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering other clicks if nested
                      deleteEvent(event.id);
                    }}
                    title="Delete Event" // Add tooltip
                  >
                    <Trash2 size={18} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: "#e5e7eb" }} // Gray-200 on hover
                    whileTap={{ scale: 0.95 }}
                    className={`bg-gray-100 text-gray-700 p-2 rounded-full flex items-center justify-center gap-2 shadow-sm transition-colors ${event.attendees.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      exportToExcel(event);
                    }}
                    disabled={event.attendees.length === 0}
                    title="Export Attendance" // Add tooltip
                  >
                    <Download size={18} />
                  </motion.button>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-blue-500 text-white px-4 py-2 rounded-full flex-1 shadow-sm hover:bg-blue-600 transition-colors"
                  onClick={() => {
                    setCurrentEvent(event);
                    setView("registration");
                  }}
                >
                  Start Check-in
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );


  // Render registration view - UPDATED
  const renderRegistration = () => (
    <div className="h-screen flex flex-col bg-white"> {/* Outer background */}
      {/* Top Bar */}
      <div className="p-4 border-b border-gray-100 flex items-center flex-shrink-0">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-gray-100 text-gray-700 p-2 rounded-full mr-4 hover:bg-gray-200 transition-colors"
          onClick={() => {
            // Reset state when going back
            setView("events");
            setCurrentEvent(null);
            setStudentId("");
            setStudent(null);
            setSuccess(false);
            setWelcomeMessage("");
          }}
        >
          <ArrowLeft size={20} />
        </motion.button>
        <div>
          <h1 className="text-xl font-medium text-gray-800 truncate" title={currentEvent?.name}>{currentEvent?.name || "Event"}</h1>
          <p className="text-sm text-gray-500">
            {currentEvent?.attendees.length} {currentEvent?.attendees.length === 1 ? "attendee" : "attendees"}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      {/* Added gradient background */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-white to-indigo-100 overflow-hidden">
        <AnimatePresence mode="wait">
          {success ? (
            // Success Message
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 150, damping: 15 }}
              className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md w-full"
            >
              <motion.div
                className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${welcomeMessage.includes("not found") || welcomeMessage.includes("error") ? 'bg-red-100' : 'bg-green-100'}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: 360 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
              >
                {/* Show Check for success, X for error/not found */}
                {welcomeMessage.includes("not found") || welcomeMessage.includes("error") ? (
                  <X className="text-red-500" size={40} />
                ) : (
                  <Check className="text-green-500" size={40} />
                )}
              </motion.div>
              <h2 className="text-2xl font-medium text-gray-800 mb-2">{welcomeMessage}</h2>
              {/* Show department only on successful registration */}
              {student && !welcomeMessage.includes("already registered") && !welcomeMessage.includes("not found") && !welcomeMessage.includes("error") && (
                <p className="text-gray-500">{student.department}</p>
              )}
            </motion.div>
          ) : (
            // Input Form
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center w-full max-w-md"
            >
              {/* Added Icon */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="mb-8 text-blue-500" // Icon color
              >
                <ScanLine size={64} className="mx-auto" />
              </motion.div>

              {/* Enhanced Heading */}
              <h2 className="text-4xl font-bold text-gray-700 mb-10">
                Tap Your ID Card
              </h2>

              <form onSubmit={handleStudentIdSubmit} className="relative">
                {/* Improved Input Field */}
                <input
                  ref={inputRef}
                  type="text" // Keep as text for compatibility with keyboard-emulating NFC readers
                  value={studentId}
                  onChange={handleStudentIdChange}
                  className="w-full px-6 py-4 border border-gray-300 rounded-xl text-center text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg placeholder-gray-400 bg-white" // Ensure white background for input
                  placeholder="Waiting for ID scan..." // Updated placeholder
                  autoFocus
                  disabled={loading} // Disable input while loading
                />
                {/* Loading Spinner */}
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 rounded-xl">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recent Check-ins */}
      {currentEvent && (
        <div className="border-t border-gray-200 p-4 max-h-60 overflow-auto bg-white flex-shrink-0"> {/* Ensure white background */}
          <h3 className="text-sm font-medium text-gray-600 mb-3 sticky top-0 bg-white pb-2">Recent Check-ins</h3> {/* Make heading sticky */}
          <div className="space-y-3">
            {[...currentEvent.attendees]
              .reverse() // Show newest first
              .slice(0, 10) // Show more recent check-ins
              .map((attendee, index) => (
                <motion.div
                  key={attendee.timestamp} // Use timestamp as key (assuming unique enough for recent list)
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }} // Faster stagger
                  className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
                    {attendee.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 overflow-hidden mr-2">
                    <p className="text-gray-800 font-medium truncate" title={attendee.fullName}>{attendee.fullName}</p>
                    <p className="text-xs text-gray-500 truncate" title={attendee.department}>{attendee.department}</p>
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(attendee.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </motion.div>
              ))}
            {currentEvent.attendees.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No check-ins yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // renderCreateEvent (remains the same)
  const renderCreateEvent = () => (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center mb-8">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-gray-100 text-gray-700 p-2 rounded-full mr-4 hover:bg-gray-200 transition-colors"
          onClick={() => setView("events")}
        >
          <ArrowLeft size={20} />
        </motion.button>
        <h1 className="text-2xl font-semibold text-gray-800">Create New Event</h1>
      </div>

      <form onSubmit={handleCreateEvent} className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Event Name
          </label>
          <input
            type="text"
            id="name"
            value={newEvent.name}
            onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter event name"
            required
          />
        </div>

        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
            Event Date
          </label>
          <input
            type="date"
            id="date"
            value={newEvent.date}
            onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            id="description"
            value={newEvent.description}
            onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px]"
            placeholder="Enter event details (optional)"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl flex-1 hover:bg-gray-200 transition-colors"
            onClick={() => setView("events")}
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className={`bg-blue-500 text-white px-6 py-3 rounded-xl flex-1 shadow-md transition-colors ${!newEvent.name || !newEvent.date ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
            disabled={!newEvent.name || !newEvent.date}
          >
            Create Event
          </motion.button>
        </div>
      </form>
    </div>
  )

  // Main component render logic (remains the same)
  return (
    <div className="min-h-screen bg-gray-100"> {/* Slightly darker overall background */}
      {view === "events" && renderEventList()}
      {view === "registration" && renderRegistration()}
      {view === "create" && renderCreateEvent()}
    </div>
  );
}
