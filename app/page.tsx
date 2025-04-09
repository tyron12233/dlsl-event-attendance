"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { saveAs } from "file-saver";
import { X, Check, Plus, Download, ArrowLeft, Trash2, ScanLine, Heart, Users, Hourglass } from 'lucide-react'; // Added Users, Hourglass
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from 'react-confetti';

// Types
interface Student {
  // Represents the data structure returned by the API
  email_address: string;
  department: string;
  fullName: string; // Derived from email or other source
  partner_id: string; // The "real" unique student identifier from the API
}

interface Attendance {
  // Represents an entry in the current event's attendance list
  studentId: string; // This should be the partner_id (real ID)
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
  attendees: Attendance[]; // Uses the Attendance interface
}

// Cache structure: Maps the *inputted* ID to the fetched Student data or null if not found
type StudentCache = Map<string, Student | null>;


// Custom hook for window size (needed for Confetti) - remains the same
function useWindowSize() {
  const [windowSize, setWindowSize] = useState<{ width: number | undefined; height: number | undefined }>({
    width: undefined,
    height: undefined,
  });
  useEffect(() => {
    function handleResize() { setWindowSize({ width: window.innerWidth, height: window.innerHeight }); }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return windowSize;
}

// Welcome messages (remain the same)
const welcomeMessages = [
    "Welcome, {name}! Great seeing you!",
    "Hello {name}! You're checked in!",
    "Hey {name}! Thanks for joining!",
    "Glad you're here, {name}!",
    "Welcome aboard, {name}!",
    "Nice one, {name}! All set.",
    "Cheers, {name}! Welcome!",
    "Gotcha, {name}! You're in!",
    "{name} has successfully checked in!",
    "Check-in complete for {name}!",
];


// --- THEME --- (Lighter Green)
const dlslGreen = {
  DEFAULT: 'bg-green-500', // Lighter primary
  hover: 'hover:bg-green-600', // Adjusted hover
  text: 'text-green-500',
  darkText: 'text-green-700', // Darker text for contrast
  lightBg: 'bg-green-50',
  lighterBg: 'bg-green-100',
  ring: 'focus:ring-green-500', // Keep ring visible
  border: 'border-green-500',
};
const dlslWhite = 'text-white';
const dlslGrayText = 'text-gray-700';
const dlslMutedText = 'text-gray-500';

// Status Colors (remain mostly the same, adjust icon bg/text if needed)
const warningColor = { bg: 'bg-amber-100', text: 'text-amber-600', icon: 'text-amber-500' };
const errorColor = { bg: 'bg-red-100', text: 'text-red-600', icon: 'text-red-500' };
const successColor = { bg: 'bg-green-100', text: 'text-green-700', icon: 'text-green-500' }; // Success uses darker text


// --- ANIMATION SPEEDS --- (Faster)
const springFast = { type: "spring", stiffness: 200, damping: 18 }; // Faster spring
const durationFast = 0.3; // Faster tween duration
const durationMedium = 0.4;
const messageTimeout = 2500; // Shorter display time for messages


export default function Home() {
  const [view, setView] = useState<"events" | "registration" | "create">("events");
  const [events, setEvents] = useState<Event[]>([]);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (view !== "registration") {
      return;
    }

    // on keyboard event, make sure input is focused
    const handleKeyDown = (event: KeyboardEvent) => {
      if (inputRef.current ) {
        inputRef.current.focus(); // Focus the input field
      }
    };

    // Add event listener
    window.addEventListener("keydown", handleKeyDown);
    // Cleanup function to remove the event listener
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [view]);

  // Registration View State
  const [studentIdInput, setStudentIdInput] = useState(""); // Current value in the input field
  const [isProcessing, setIsProcessing] = useState(false); // True if *any* ID is currently being fetched/processed
  const [inputQueue, setInputQueue] = useState<string[]>([]); // Queue for IDs scanned while processing
  const [lastProcessedInfo, setLastProcessedInfo] = useState<{ message: string; type: 'success' | 'warning' | 'error'; student: Student | null; show: boolean }>({
      message: "",
      type: 'success',
      student: null,
      show: false,
  }); // Holds info for the *last* message display
  const [studentCache, setStudentCache] = useState<StudentCache>(new Map()); // Cache for fetched student data by *input ID*

  // Create Event View State
  const [newEvent, setNewEvent] = useState({ name: "", date: new Date().toISOString().split("T")[0], description: "" });

  // Refs and Hooks
  const inputRef = useRef<HTMLInputElement>(null);
  const { width, height } = useWindowSize();
  const isProcessingRef = useRef(isProcessing); // Ref to track processing state for async queue logic

   // Update ref whenever isProcessing changes
   useEffect(() => {
       isProcessingRef.current = isProcessing;
   }, [isProcessing]);

  // --- EFFECTS ---

  // Load/Save Events from/to localStorage (no changes)
  useEffect(() => {
    const storedEvents = localStorage.getItem("events");
    if (storedEvents) { try { const p = JSON.parse(storedEvents); if (Array.isArray(p)) setEvents(p); else localStorage.removeItem("events"); } catch (e) { console.error("LS parse error:", e); localStorage.removeItem("events"); } }
  }, []);
  useEffect(() => { localStorage.setItem("events", JSON.stringify(events)); }, [events]);

  // Focus Input Logic
  const focusInput = useCallback(() => {
    if (view === "registration" && inputRef.current && !isProcessingRef.current && !lastProcessedInfo.show) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [view, lastProcessedInfo.show]); // Depend on view and if message is showing

  useEffect(() => { focusInput(); }, [focusInput]); // Re-run focus logic when dependencies change


  // --- CORE PROCESSING LOGIC ---

  const processId = useCallback(async (idToProcess: string) => {
    if (!currentEvent) return; // Should not happen if called correctly, but safeguard

    setIsProcessing(true); // Mark as processing START
    setLastProcessedInfo(prev => ({ ...prev, show: false })); // Hide previous message immediately

    let studentData: Student | null = null;
    let message = "";
    let messageType: 'success' | 'warning' | 'error' = 'success';
    let derivedFullName = "Student"; // Default name

     try {
         // 1. Check Cache
         if (studentCache.has(idToProcess)) {
             studentData = studentCache.get(idToProcess) ?? null; // Get from cache (null if previously not found)
             if (studentData === null) {
                 message = "Student ID not found (cached).";
                 messageType = 'error';
                 // Skip to finally block after setting message info
             }
             // If studentData is found in cache, proceed to registration check
         } else {
             // 2. Fetch from API if not in cache
             const response = await fetch(`https://student-info.tyronscott.me/api/student?id=${idToProcess}`);
             // Simulate delay (REMOVE)
             // await new Promise(resolve => setTimeout(resolve, 800));

             if (!response.ok) {
                 if (response.status === 404) {
                     message = "Student ID not found.";
                     messageType = 'error';
                     setStudentCache(prev => new Map(prev).set(idToProcess, null)); // Cache the "not found" result
                 } else {
                     message = `API Error: ${response.status}. Try again.`;
                     messageType = 'error';
                     // Do not cache temporary errors
                 }
                 // Skip to finally block
             } else {
                 const apiData = await response.json();
                 if (apiData.email_address && apiData.partner_id) {
                     // Derive full name (simple example)
                     const emailParts = apiData.email_address.split("@")[0];
                     const nameParts = emailParts.split("_");
                     derivedFullName = nameParts.map((part: string) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

                     studentData = {
                         email_address: apiData.email_address,
                         department: apiData.department || "N/A",
                         fullName: derivedFullName,
                         partner_id: apiData.partner_id, // Store the real ID
                     };
                     setStudentCache(prev => new Map(prev).set(idToProcess, studentData)); // Cache successful fetch
                 } else {
                     message = "Incomplete student data received.";
                     messageType = 'error';
                     setStudentCache(prev => new Map(prev).set(idToProcess, null)); // Cache as "not found" if data is bad
                 }
             }
         } // End of fetch logic

         // 3. Process Registration (if student data was found/valid)
         if (studentData && messageType !== 'error') {
             derivedFullName = studentData.fullName; // Use name from cached/fetched data
             // Check if *already registered* using the REAL ID (partner_id)
             const alreadyRegistered = currentEvent.attendees.some(
                 (attendee) => attendee.studentId === studentData!.partner_id
             );

             if (alreadyRegistered) {
                 message = `${derivedFullName.split(" ")[0]}, you're already checked in!`;
                 messageType = 'warning';
                 // Don't add to attendees again
             } else {
                 // Add to attendees
                 const newAttendance: Attendance = {
                     studentId: studentData.partner_id, // Use the REAL ID here
                     fullName: studentData.fullName,
                     department: studentData.department,
                     email: studentData.email_address,
                     timestamp: new Date().toISOString(),
                 };

                 // Update event state immutably
                 setCurrentEvent((prevEvent) => {
                     if (!prevEvent) return null;
                     const newAttendees = [...prevEvent.attendees, newAttendance];
                     // Also update the main events array for persistence
                     setEvents(prevEvents => prevEvents.map(ev =>
                         ev.id === prevEvent.id ? { ...ev, attendees: newAttendees } : ev
                     ));
                     return { ...prevEvent, attendees: newAttendees };
                 });

                 // Set success message
                 const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
                 message = welcomeMessages[randomIndex].replace("{name}", derivedFullName.split(" ")[0]);
                 messageType = 'success';
             }
         } else if (!message) {
             // If studentData is null/invalid but no error message was set yet (e.g. cached null)
             message = "Student ID not processed."; // Fallback message
             messageType = 'error';
         }

     } catch (error) {
         console.error("Processing Error:", error);
         message = "A network or system error occurred.";
         messageType = 'error';
         // Don't cache network errors
     } finally {
         // 4. Update Last Processed Info for UI display
         setLastProcessedInfo({
             message: message || "Completed.", // Fallback message
             type: messageType,
             student: studentData, // Pass student data for potential display (like department)
             show: true, // Trigger display
         });

         // 5. Short timeout to display the message
         setTimeout(() => {
             setLastProcessedInfo(prev => ({ ...prev, show: false }));
             // Try to focus input *after* message hides, only if queue is empty
             if (inputQueue.length === 0) {
                 focusInput();
             }
         }, messageTimeout);

         // 6. Process Next Queued Item (if any) - DO THIS IMMEDIATELY
         const nextIdInQueue = inputQueue.length > 0 ? inputQueue[0] : null;
         if (nextIdInQueue) {
            setInputQueue(q => q.slice(1)); // Dequeue
            // Call processId recursively for the next item *without* awaiting here in finally
            // Use setTimeout to avoid deep recursion issues and allow UI updates
            setTimeout(() => processId(nextIdInQueue), 0);
         } else {
            // Only mark processing as fully finished if queue is empty
            setIsProcessing(false); // Mark as processing END
            // Try focusing again in case the timeout didn't catch it
             focusInput();
         }

         // Clear input field *after* processing logic (including queuing check)
         setStudentIdInput("");
     }
  }, [currentEvent, studentCache, inputQueue, focusInput]); // Dependencies


  // --- INPUT HANDLING ---

  const handleInputIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStudentIdInput(e.target.value);
  };

  const handleInputSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const currentInput = studentIdInput.trim();
    if (!currentInput) return; // Ignore empty submissions

    if (isProcessingRef.current) { // Use ref for instant check
      // If processing, add to queue
      setInputQueue(prev => [...prev, currentInput]);
      setStudentIdInput(""); // Clear input immediately for next scan
    } else {
      // If not processing, start processing this ID
      processId(currentInput);
      // processId will clear input in its finally block
    }
  }, [studentIdInput, processId]); // Dependencies


  // --- Other Handlers (Create, Export, Delete, Navigation) --- (Minor theme/speed adjustments)

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newEvent.name.trim();
    if (!trimmedName || !newEvent.date) return;
    const newEventData: Event = { id: Date.now().toString(), name: trimmedName, date: newEvent.date, description: newEvent.description.trim(), attendees: [] };
    setEvents((prevEvents) => [...prevEvents, newEventData]);
    setNewEvent({ name: "", date: new Date().toISOString().split("T")[0], description: "" });
    setView("events");
  };

  const exportToExcel = (event: Event | null) => { // Allow null
    if (!event || event.attendees.length === 0) { alert("No attendees to export."); return; }
    const wsData = event.attendees.map(a => ({
      "Student ID": a.studentId, "Full Name": a.fullName, "Department": a.department, "Email": a.email,
      "Check-in Time": new Date(a.timestamp).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short', hour12: true }),
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    ws['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 25 }, { wch: 30 }, { wch: 22 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
    saveAs(data, `${event.name.replace(/[^a-z0-9]/gi, '_')}_Attendance_${event.date}.xlsx`);
  };

  const deleteEvent = (eventId: string) => {
    if (window.confirm("Delete this event permanently?")) {
      setEvents((prev) => prev.filter((event) => event.id !== eventId));
      if (currentEvent?.id === eventId) { setView("events"); setCurrentEvent(null); }
    }
  };

  const goBackToEvents = () => {
     setView("events"); setCurrentEvent(null); setStudentIdInput(""); setInputQueue([]); setIsProcessing(false); setLastProcessedInfo({ message: "", type: 'success', student: null, show: false }); // Reset registration state
  };


  // --- RENDER FUNCTIONS --- (Apply faster animations and lighter theme)

  const renderEventList = () => (
    <div className="max-w-4xl mx-auto p-6 space-y-6"> {/* Slightly reduced space */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className={`text-3xl font-semibold ${dlslGreen.darkText}`}>DLSL Event Attendance</h1>
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: `0px 4px 14px rgba(52, 211, 153, 0.4)` }} // Lighter green shadow
          whileTap={{ scale: 0.95 }}
          className={`${dlslGreen.DEFAULT} ${dlslGreen.hover} ${dlslWhite} px-5 py-2 rounded-full flex items-center gap-2 shadow transition-all duration-200`}
          onClick={() => setView("create")}
        > <Plus size={20} /> <span>New Event</span> </motion.button>
      </div>

      {events.length === 0 ? ( /* No changes needed here except maybe theme colors if desired */
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: durationMedium }}>
            <ScanLine size={48} className="mx-auto text-green-300 mb-4" />
            <h2 className="text-xl text-gray-500 mb-6">No events yet.</h2>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
               className={`${dlslGreen.DEFAULT} ${dlslGreen.hover} ${dlslWhite} px-5 py-2 rounded-full flex items-center gap-2 mx-auto shadow transition-colors`}
              onClick={() => setView("create")} > <Plus size={18} /> <span>Create Event</span> </motion.button>
          </motion.div>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-5"> {/* Reduced gap */}
          {events.map((event) => (
            <motion.div
              key={event.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              transition={springFast} // Faster spring
              className="bg-white rounded-xl p-5 shadow border border-gray-100 hover:shadow-md transition-shadow duration-200 flex flex-col justify-between"
            >
              <div> {/* Content */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h2 className={`text-lg font-semibold ${dlslGreen.darkText}`}>{event.name}</h2> {/* Slightly smaller title */}
                      <p className={`text-sm ${dlslMutedText} mt-1`}> {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} </p> {/* Shorter month */}
                    </div>
                     <div className="flex gap-1.5 flex-shrink-0 ml-3"> {/* Tighter buttons */}
                        <motion.button whileHover={{ scale: 1.1, backgroundColor: "#fee2e2" }} whileTap={{ scale: 0.9 }}
                            className="bg-red-50 text-red-500 p-1.5 rounded-full transition-colors hover:text-red-600" // Smaller padding
                            onClick={(e) => { e.stopPropagation(); deleteEvent(event.id); }} title="Delete"> <Trash2 size={16} /> </motion.button>
                        <motion.button whileHover={{ scale: 1.1, backgroundColor: "#E0F2FE" }} whileTap={{ scale: 0.9 }}
                            className={`bg-blue-50 text-blue-500 p-1.5 rounded-full flex items-center justify-center transition-colors ${event.attendees.length === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-blue-100 hover:text-blue-600'}`}
                            onClick={(e) => { e.stopPropagation(); if (event.attendees.length > 0) exportToExcel(event); }} disabled={event.attendees.length === 0} title="Export"> <Download size={16} /> </motion.button>
                    </div>
                  </div>
                  <p className={`text-sm ${dlslGrayText} mt-1 mb-3 break-words whitespace-pre-wrap`}>{event.description || <span className="italic text-gray-400">No description</span>}</p>
                  <p className={`text-xs font-medium ${dlslGreen.text}`}> {/* Smaller text */}
                    <Users size={12} className="inline mr-1 align-text-bottom"/>{event.attendees.length} {event.attendees.length === 1 ? "Attendee" : "Attendees"}
                  </p>
              </div>
              <div className="mt-4"> {/* Reduced margin */}
                <motion.button whileHover={{ scale: 1.03, y: -1, boxShadow: `0px 3px 10px rgba(52, 211, 153, 0.2)` }} whileTap={{ scale: 0.97 }}
                  className={`w-full ${dlslGreen.DEFAULT} ${dlslGreen.hover} ${dlslWhite} px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all duration-150 font-medium text-sm`} // Smaller padding/text
                  onClick={() => { setCurrentEvent(event); setView("registration"); }}> <span>Check-in</span> <ArrowLeft size={16} className="transform rotate-180"/> </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );


  // --- REGISTRATION VIEW --- (Faster animations, lighter theme, queuing/caching logic applied)
  const renderRegistration = () => {
    const { message, type, student, show } = lastProcessedInfo; // Destructure for readability
    const messageStyles = type === 'success' ? successColor : (type === 'warning' ? warningColor : errorColor);

    // Lighter background gradients
    const backgroundVariants = {
        initial: { background: "linear-gradient(to bottom right, #ECFDF5, #FFFFFF, #F0FDF4)" }, // Lighter greens
        success: { background: "linear-gradient(to bottom right, #D1FAE5, #FFFFFF, #A7F3D0)" }, // Keep success distinct
        warning: { background: "linear-gradient(to bottom right, #FEF3C7, #FFFFFF, #FDE68A)" },
        error: { background: "linear-gradient(to bottom right, #FEE2E2, #FFFFFF, #FECACA)" },
    };

    return (
    <motion.div
      className="h-screen flex flex-col overflow-hidden bg-white"
      initial="initial" animate={show ? type : "initial"} variants={backgroundVariants}
      transition={{ duration: durationMedium, ease: "easeInOut" }} // Faster bg transition
    >
      {/* Confetti only on successful *registration* (not warning/error) */}
      {show && type === 'success' && width && height && (
          <Confetti
              width={width} height={height} recycle={false} numberOfPieces={200} // Fewer pieces, faster
              gravity={0.1} initialVelocityY={-12} tweenDuration={5000} // Slightly shorter duration
              colors={['#FFFFFF', '#A7F3D0', '#6EE7B7', '#34D399']} // Lighter green palette
              style={{ position: 'fixed', top: 0, left: 0, zIndex: 5000 }}
              onConfettiComplete={(instance) => instance?.reset()}
          />
      )}

      {/* Top Bar */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-white bg-opacity-90 backdrop-blur-sm z-10"> {/* Added justify-between */}
         <div className="flex items-center overflow-hidden">
            <motion.button whileHover={{ scale: 1.1, backgroundColor: "#f3f4f6" }} whileTap={{ scale: 0.9 }}
                className="bg-gray-100 text-gray-700 p-1.5 rounded-full mr-3 hover:bg-gray-200 transition-colors" // Smaller padding/margin
                onClick={goBackToEvents} title="Back"> <ArrowLeft size={18} /> </motion.button>
            <div className="overflow-hidden">
                <h1 className={`text-base font-medium ${dlslGreen.darkText} truncate`} title={currentEvent?.name}>{currentEvent?.name || "Check-in"}</h1> {/* Smaller text */}
                <p className={`text-xs ${dlslMutedText}`}> {/* Smaller text */}
                    <Users size={12} className="inline mr-1"/>{currentEvent?.attendees.length ?? 0} checked in
                </p>
            </div>
         </div>
         {/* Queue Indicator */}
         <AnimatePresence>
             {inputQueue.length > 0 && (
                 <motion.div
                     initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                     className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${warningColor.bg} ${warningColor.text} text-xs font-medium`}
                     title={`${inputQueue.length} ID(s) waiting to be processed`}
                 >
                    <Hourglass size={12} className="animate-spin animation-delay-[-0.45s] animation-duration-[2s]" />
                     <span>Queue: {inputQueue.length}</span>
                 </motion.div>
             )}
         </AnimatePresence>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {show ? ( // --- Message Display ---
            <motion.div
              key="message-card"
              initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              transition={springFast} // Faster spring
              className="text-center p-6 bg-white rounded-xl shadow-lg max-w-sm w-full relative z-20" // Slightly smaller card
            >
              <motion.div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${messageStyles.bg}`} // Smaller icon circle
                initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ ...springFast, delay: 0.05 }} // Faster spring, small delay
              >
                 <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}>
                    {type === 'success' && <Check className={messageStyles.icon} size={32} />}
                    {type === 'warning' && <Users className={messageStyles.icon} size={32} />} {/* Users icon for 'already registered' */}
                    {type === 'error' && <X className={messageStyles.icon} size={32} />}
                 </motion.div>
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: durationFast }}
                className={`text-xl font-semibold ${messageStyles.text} mb-1 break-words`} // Smaller text
                > {message} </motion.h2>
              {student && type === 'success' && ( // Department only on true success
                 <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
                    className={`text-sm ${dlslMutedText}`} > {student.department} </motion.p>
              )}
            </motion.div>
          ) : ( // --- Input Form ---
            <motion.div
              key="input-form"
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
              transition={{ duration: durationFast }}
              className="text-center w-full max-w-md z-10 flex flex-col items-center"
            >
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, ...springFast }}
                className={`mb-6 ${dlslGreen.text}`} > {/* Reduced margin */}
                 <motion.div animate={{ y: [0, -4, 0], scale: [1, 1.03, 1] }} transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut"}}>
                     <ScanLine size={56} className="mx-auto" /> {/* Slightly smaller */}
                 </motion.div>
              </motion.div>
              <h2 className={`text-2xl sm:text-3xl font-semibold ${dlslGreen.darkText} mb-8`}> {/* Smaller title */}
                Tap Your DLSL ID Card
              </h2>
              <form onSubmit={handleInputSubmit} className="relative w-full">
                <input
                  ref={inputRef} type="text" value={studentIdInput} onChange={handleInputIdChange}
                  className={`w-full px-5 py-3 border-2 ${dlslGreen.border} rounded-lg text-center text-lg sm:text-xl outline-none focus:ring-2 ${dlslGreen.ring} focus:border-transparent shadow-md placeholder-gray-400 bg-white transition-shadow focus:shadow-lg disabled:opacity-50 disabled:bg-gray-100 disabled:cursor-wait`} // Added disabled:cursor-wait
                  placeholder="Waiting for ID..." autoFocus
                  disabled={isProcessing} // Disable only when actively processing (not just message showing)
                />
                <AnimatePresence> {isProcessing && !inputQueue.length && ( // Show loader only if processing *and* queue is empty
                  <motion.div key="loader-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                      className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg z-30">
                      <motion.div className="absolute inset-0 bg-green-400 rounded-lg" initial={{ opacity: 0 }} animate={{ opacity: [0.05, 0.1, 0.05] }} transition={{ repeat: Infinity, duration: 1.3, ease: "easeInOut" }}></motion.div>
                      <div className={`relative w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin`}></div>
                   </motion.div> )} </AnimatePresence>
              </form>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                className={`mt-8 text-center text-xs ${dlslGreen.darkText}/80`} > {/* Smaller margin/text */}
                 Made with <Heart size={12} className="inline align-baseline text-red-400 mx-px" /> by <a href="https://tyronscott.me/" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-700 transition-colors font-medium">@tyronscott_</a>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recent Check-ins Section (Faster animations) */}
      {currentEvent && (
        <div className="border-t border-gray-100 p-3 max-h-52 overflow-y-auto bg-white flex-shrink-0 relative z-0"> {/* Reduced padding/max-height */}
          <h3 className={`text-xs font-semibold ${dlslGreen.darkText} mb-2 sticky top-0 bg-white pt-1 pb-1.5 border-b border-gray-100 z-10`}> {/* Smaller text */}
            Recent ({currentEvent.attendees.length})
          </h3>
          <div className="space-y-1.5 pr-1"> {/* Tighter spacing */}
            <AnimatePresence initial={false}>
                {[...currentEvent.attendees].reverse().slice(0, 10).map((attendee, index) => ( // Show fewer
                    <motion.div key={attendee.timestamp + attendee.studentId} layout
                        initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15, transition: { duration: 0.15 } }}
                        transition={{ delay: Math.min(index * 0.03, 0.3), ...springFast }} // Faster stagger/spring
                        className="flex items-center gap-2 p-2 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors" > {/* Smaller padding/gap */}
                        <div className={`w-6 h-6 ${dlslGreen.lighterBg} ${dlslGreen.text} rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0`}> {/* Smaller avatar */}
                            {attendee.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden min-w-0">
                            <p className="text-gray-800 font-medium truncate text-xs" title={attendee.fullName}>{attendee.fullName}</p> {/* Smaller text */}
                            <p className="text-xs text-gray-500 truncate" title={attendee.department}>{attendee.department}</p>
                        </div>
                        <div className="text-[10px] text-gray-400 flex-shrink-0 text-right ml-1"> {/* Even smaller time */}
                            {new Date(attendee.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
            {currentEvent.attendees.length === 0 && ( <p className="text-xs text-gray-400 text-center py-4">No check-ins yet.</p> )}
          </div>
        </div>
      )}
    </motion.div>
    );
   };


  // --- CREATE EVENT VIEW --- (Apply faster animations and lighter theme)
  const renderCreateEvent = () => (
    <div className="max-w-xl mx-auto p-6"> {/* Slightly smaller max-width */}
      <div className="flex items-center mb-6">
        <motion.button whileHover={{ scale: 1.1, backgroundColor: "#f3f4f6" }} whileTap={{ scale: 0.9 }}
            className="bg-gray-100 text-gray-700 p-1.5 rounded-full mr-3 hover:bg-gray-200 transition-colors"
            onClick={goBackToEvents} title="Back"> <ArrowLeft size={18} /> </motion.button>
        <h1 className={`text-xl font-semibold ${dlslGreen.darkText}`}>Create New Event</h1>
      </div>
      <motion.form initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: durationFast }}
         onSubmit={handleCreateEvent} className="space-y-4 bg-white p-6 rounded-xl shadow-md border border-gray-100" > {/* Reduced padding/space */}
        <div>
          <label htmlFor="name" className={`block text-sm font-medium ${dlslGrayText} mb-1`}> Event Name <span className="text-red-500">*</span> </label>
          <input type="text" id="name" value={newEvent.name} onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
            className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-1 ${dlslGreen.ring} focus:border-green-400 transition-shadow focus:shadow-sm`}
            placeholder="Event Title" required />
        </div>
        <div>
          <label htmlFor="date" className={`block text-sm font-medium ${dlslGrayText} mb-1`}> Event Date <span className="text-red-500">*</span> </label>
          <input type="date" id="date" value={newEvent.date} min={new Date().toISOString().split("T")[0]} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
            className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-1 ${dlslGreen.ring} focus:border-green-400 transition-shadow focus:shadow-sm`}
            required />
        </div>
        <div>
          <label htmlFor="description" className={`block text-sm font-medium ${dlslGrayText} mb-1`}> Description <span className="text-gray-400 text-xs">(Optional)</span> </label>
          <textarea id="description" value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} rows={3} // Shorter
            className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-1 ${dlslGreen.ring} focus:border-green-400 min-h-[60px] resize-y transition-shadow focus:shadow-sm`}
            placeholder="Details..." />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 pt-3"> {/* Tighter gap */}
          <motion.button whileHover={{ scale: 1.02, backgroundColor: "#e5e7eb" }} whileTap={{ scale: 0.98 }} type="button" onClick={goBackToEvents}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md flex-1 hover:bg-gray-200 transition-colors font-medium text-sm" > Cancel </motion.button>
          <motion.button whileHover={{ scale: 1.02, boxShadow: `0px 3px 10px rgba(52, 211, 153, 0.25)` }} whileTap={{ scale: 0.98 }} type="submit"
            className={`${dlslGreen.DEFAULT} ${dlslGreen.hover} ${dlslWhite} px-4 py-2 rounded-md flex-1 shadow-sm transition-all duration-150 font-medium text-sm ${!newEvent.name.trim() || !newEvent.date ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!newEvent.name.trim() || !newEvent.date} > Create Event </motion.button>
        </div>
      </motion.form>
    </div>
  )


  // --- MAIN RETURN ---
  return (
    <div className={`min-h-screen ${dlslGreen.lightBg}`}> {/* Use light green main background */}
        {view === "events" && renderEventList()}
        {view === "registration" && renderRegistration()}
        {view === "create" && renderCreateEvent()}
    </div>
  );
}