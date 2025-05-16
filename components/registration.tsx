import useCardReader from "@/hooks/use-card-reader";
import useWindowSize from "@/hooks/use-window-size";
import {
  Attendance,
  dlslGreen,
  dlslMutedText,
  durationFast,
  durationMedium,
  errorColor,
  Event,
  messageTimeout,
  springFast,
  Student,
  StudentCache,
  successColor,
  warningColor,
  welcomeMessages,
} from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Hourglass,
  Check,
  X,
  ScanLine,
  Heart,
} from "lucide-react";
import { type } from "os";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactConfetti from "react-confetti";

interface RegistrationPageProps {
  currentEvent: Event;
  onBack: () => void;
  onEventAttendance: (attendance: Attendance) => void;
}

export default function RegistrationPage({
  currentEvent,
  onEventAttendance,
  onBack,
}: RegistrationPageProps) {
  const [lastProcessedInfo, setLastProcessedInfo] = useState<{
    message: string;
    type: "success" | "warning" | "error";
    student: Student | null;
    show: boolean;
  }>({
    message: "",
    type: "success",
    student: null,
    show: false,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputQueue, setInputQueue] = useState<string[]>([]);
  const inputQueueRef = useRef<string[]>([]); // Ref to keep track of the queue

  useEffect(() => {
    // Update the inputQueueRef whenever inputQueue changes
    inputQueueRef.current = inputQueue;
  }, [inputQueue]);

  const [studentCache, setStudentCache] = useState<StudentCache>(new Map());

  const processId = useCallback(
    async (idToProcess: string) => {
      if (!currentEvent) return;

      setIsProcessing(true); // Mark as processing START
      setLastProcessedInfo((prev) => ({ ...prev, show: false }));
      let studentData: Student | null = null;
      let message = "";
      let messageType: "success" | "warning" | "error" = "success";
      let derivedFullName = "Student"; // Default name

      try {
        // 1. Check Cache
        if (studentCache.has(idToProcess)) {
          studentData = studentCache.get(idToProcess) ?? null; // Get from cache (null if previously not found)
          if (studentData === null) {
            message = "Student ID not found (cached).";
            messageType = "error";
            // Skip to finally block after setting message info
          }
          // If studentData is found in cache, proceed to registration check
        } else {
          // 2. Fetch from API if not in cache
          const response = await fetch(
            `https://student-info.tyronscott.me/api/student?id=${idToProcess}`
          );
          // Simulate delay (REMOVE)
          // await new Promise(resolve => setTimeout(resolve, 800));

          if (!response.ok) {
            if (response.status === 404) {
              message = "Student ID not found.";
              messageType = "error";
              setStudentCache((prev) => new Map(prev).set(idToProcess, null)); // Cache the "not found" result
            } else {
              message = `API Error: ${response.status}. Try again.`;
              messageType = "error";
              // Do not cache temporary errors
            }
            // Skip to finally block
          } else {
            const apiData = await response.json();
            if (apiData.email_address && apiData.partner_id) {
              // Derive full name (simple example)
              const emailParts = apiData.email_address.split("@")[0];
              const nameParts = emailParts.split("_");
              derivedFullName = nameParts
                .map(
                  (part: string) => part.charAt(0).toUpperCase() + part.slice(1)
                )
                .join(" ");

              studentData = {
                email_address: apiData.email_address,
                department: apiData.department || "N/A",
                fullName: derivedFullName,
                partner_id: apiData.partner_id, // Store the real ID
              };
              setStudentCache((prev) =>
                new Map(prev).set(idToProcess, studentData)
              ); // Cache successful fetch
            } else {
              message = "Incomplete student data received.";
              messageType = "error";
              setStudentCache((prev) => new Map(prev).set(idToProcess, null)); // Cache as "not found" if data is bad
            }
          }
        } // End of fetch logic

        // 3. Process Registration (if student data was found/valid)
        if (studentData && messageType !== "error") {
          derivedFullName = studentData.fullName; // Use name from cached/fetched data
          // Check if *already registered* using the REAL ID (partner_id)
          const alreadyRegistered = currentEvent.attendees.some(
            (attendee) => attendee.studentId === studentData!.partner_id
          );

          if (alreadyRegistered) {
            message = `${
              derivedFullName.split(" ")[0]
            }, you're already checked in!`;
            messageType = "warning";
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

            onEventAttendance(newAttendance);

            // Set success message
            const randomIndex = Math.floor(
              Math.random() * welcomeMessages.length
            );
            message = welcomeMessages[randomIndex].replace(
              "{name}",
              derivedFullName.split(" ")[0]
            );
            messageType = "success";
          }
        } else if (!message) {
          // If studentData is null/invalid but no error message was set yet (e.g. cached null)
          message = "Student ID not processed."; // Fallback message
          messageType = "error";
        }
      } catch (error) {
        console.error("Processing Error:", error);
        message = "A network or system error occurred.";
        messageType = "error";
        // Don't cache network errors
      } finally {
        // 6. Process Next Queued Item (if any) - DO THIS IMMEDIATELY
        const nextIdInQueue =
          inputQueueRef.current.length > 0 ? inputQueueRef.current[0] : null;
        if (nextIdInQueue) {
          setInputQueue((q) => q.slice(1));
          // Call processId recursively for the next item *without* awaiting here in finally
          // Use setTimeout to avoid deep recursion issues and allow UI updates
          setTimeout(() => processId(nextIdInQueue), 0);
        } else {
          // Only mark processing as fully finished if queue is empty
          setIsProcessing(false); // Mark as processing END

          setLastProcessedInfo({
            message: message || "Completed.", // Fallback message
            type: messageType,
            student: studentData, // Pass student data for potential display (like department)
            show: true, // Trigger display
          });

          setTimeout(() => {
            setLastProcessedInfo((prev) => ({ ...prev, show: false }));
          }, messageTimeout);
        }
      }
    },
    [studentCache, onEventAttendance, currentEvent]
  );

  useCardReader((input: string) => {
    if (isProcessing) {
      // If already processing, add to queue
      setInputQueue((prev) => [...prev, input]);
    } else {
      // Process immediately
      processId(input);
    }
  });

  const { width, height } = useWindowSize();

  // destructure
  const { message, type, student, show } = lastProcessedInfo;
  const messageStyles =
    type === "success"
      ? successColor
      : type === "warning"
      ? warningColor
      : errorColor;

  const backgroundVariants = {
    initial: {
      background: "linear-gradient(to bottom right, #ECFDF5, #FFFFFF, #F0FDF4)",
    },
    success: {
      background: "linear-gradient(to bottom right, #D1FAE5, #FFFFFF, #A7F3D0)",
    },
    warning: {
      background: "linear-gradient(to bottom right, #FEF3C7, #FFFFFF, #FDE68A)",
    },
    error: {
      background: "linear-gradient(to bottom right, #FEE2E2, #FFFFFF, #FECACA)",
    },
  };

  return (
    <motion.div
      className="h-screen flex flex-col overflow-hidden bg-white"
      initial="initial"
      animate={show ? type : "initial"}
      variants={backgroundVariants}
      transition={{ duration: durationMedium, ease: "easeInOut" }}
    >
      {show && type === "success" && width && height && (
        <ReactConfetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.1}
          initialVelocityY={-12}
          tweenDuration={5000} // Slightly shorter duration
          colors={["#FFFFFF", "#A7F3D0", "#6EE7B7", "#34D399"]}
          style={{ position: "fixed", top: 0, left: 0, zIndex: 5000 }}
          onConfettiComplete={(instance) => instance?.reset()}
        />
      )}

      {/* Top Bar */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-white bg-opacity-90 backdrop-blur-sm z-10">
        {" "}
        {/* Added justify-between */}
        <div className="flex items-center overflow-hidden">
          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: "#f3f4f6" }}
            whileTap={{ scale: 0.9 }}
            className="bg-gray-100 text-gray-700 p-1.5 rounded-full mr-3 hover:bg-gray-200 transition-colors" // Smaller padding/margin
            onClick={onBack}
            title="Back"
          >
            {" "}
            <ArrowLeft size={18} />{" "}
          </motion.button>
          <div className="overflow-hidden">
            <h1
              className={`text-base font-medium ${dlslGreen.darkText} truncate`}
              title={currentEvent?.name}
            >
              {currentEvent?.name || "Check-in"}
            </h1>{" "}
            {/* Smaller text */}
            <p className={`text-xs ${dlslMutedText}`}>
              {" "}
              {/* Smaller text */}
              <Users size={12} className="inline mr-1" />
              {currentEvent?.attendees.length ?? 0} checked in
            </p>
          </div>
        </div>
        {/* Queue Indicator */}
        <AnimatePresence>
          {inputQueue.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${warningColor.bg} ${warningColor.text} text-xs font-medium`}
              title={`${inputQueue.length} ID(s) waiting to be processed`}
            >
              <Hourglass
                size={12}
                className="animate-spin animation-delay-[-0.45s] animation-duration-[2s]"
              />
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
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={springFast} // Faster spring
              className="text-center p-6 bg-white rounded-xl shadow-lg max-w-sm w-full relative z-20" // Slightly smaller card
            >
              <motion.div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${messageStyles.bg}`} // Smaller icon circle
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ ...springFast, delay: 0.05 }} // Faster spring, small delay
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {type === "success" && (
                    <Check className={messageStyles.icon} size={32} />
                  )}
                  {type === "warning" && (
                    <Users className={messageStyles.icon} size={32} />
                  )}{" "}
                  {/* Users icon for 'already registered' */}
                  {type === "error" && (
                    <X className={messageStyles.icon} size={32} />
                  )}
                </motion.div>
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: durationFast }}
                className={`text-xl font-semibold ${messageStyles.text} mb-1 break-words`}
              >
                {" "}
                {message}{" "}
              </motion.h2>
              {student && type === "success" && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className={`text-sm ${dlslMutedText}`}
                >
                  {" "}
                  {student.department}{" "}
                </motion.p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="input-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: durationFast }}
              className="text-center w-full max-w-md z-10 flex flex-col items-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, ...springFast }}
                className={`mb-6 ${dlslGreen.text}`}
              >
                {" "}
                {/* Reduced margin */}
                <motion.div
                  animate={{ y: [0, -4, 0], scale: [1, 1.03, 1] }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.8,
                    ease: "easeInOut",
                  }}
                >
                  <ScanLine size={56} className="mx-auto" />{" "}
                </motion.div>
              </motion.div>
              <h2
                className={`text-2xl sm:text-3xl font-semibold ${dlslGreen.darkText} mb-4`}
              >
                {" "}
                Tap Your DLSL ID
              </h2>
              <form className="relative w-full">
                <AnimatePresence>
                  {isProcessing && !inputQueue.length && (
                    <motion.div
                      key="loader-overlay"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg z-30"
                    >
                      <motion.div
                        className="absolute inset-0 bg-green-400 rounded-lg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.05, 0.1, 0.05] }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.3,
                          ease: "easeInOut",
                        }}
                      ></motion.div>
                      <div
                        className={`relative w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin`}
                      ></div>
                    </motion.div>
                  )}{" "}
                </AnimatePresence>
              </form>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className={`mt-8 text-center text-xs ${dlslGreen.darkText}/80`}
              >
                Made with{" "}
                <Heart
                  size={12}
                  className="inline align-baseline text-red-400 mx-px"
                />{" "}
                by{" "}
                <a
                  href="https://tyronscott.me/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-green-700 transition-colors font-medium"
                >
                  @tyronscott_
                </a>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recent Check-ins Section (Faster animations) */}
      {currentEvent && (
        <div className="border-t border-gray-100 p-3 max-h-52 overflow-y-auto bg-white flex-shrink-0 relative z-0">
          {" "}
          {/* Reduced padding/max-height */}
          <h3
            className={`text-xs font-semibold ${dlslGreen.darkText} mb-2 sticky top-0 bg-white pt-1 pb-1.5 border-b border-gray-100 z-10`}
          >
            {" "}
            {/* Smaller text */}
            Recent ({currentEvent.attendees.length})
          </h3>
          <div className="space-y-1.5 pr-1">
            {" "}
            <AnimatePresence initial={false}>
              {[...currentEvent.attendees]
                .reverse()
                .slice(0, 10)
                .map((attendee, index) => (
                  <motion.div
                    key={attendee.timestamp + attendee.studentId}
                    layout
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{
                      opacity: 0,
                      x: 15,
                      transition: { duration: 0.15 },
                    }}
                    transition={{
                      delay: Math.min(index * 0.03, 0.3),
                      ...springFast,
                    }}
                    className="flex items-center gap-2 p-2 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    {" "}
                    {/* Smaller padding/gap */}
                    <div
                      className={`w-6 h-6 ${dlslGreen.lighterBg} ${dlslGreen.text} rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0`}
                    >
                      {" "}
                      {/* Smaller avatar */}
                      {attendee.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 overflow-hidden min-w-0">
                      <p
                        className="text-gray-800 font-medium truncate text-xs"
                        title={attendee.fullName}
                      >
                        {attendee.fullName}
                      </p>{" "}
                      {/* Smaller text */}
                      <p
                        className="text-xs text-gray-500 truncate"
                        title={attendee.department}
                      >
                        {attendee.department}
                      </p>
                    </div>
                    <div className="text-[10px] text-gray-400 flex-shrink-0 text-right ml-1">
                      {" "}
                      {/* Even smaller time */}
                      {new Date(attendee.timestamp).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
            {currentEvent.attendees.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">
                No check-ins yet.
              </p>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
