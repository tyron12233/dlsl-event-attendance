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
  ImageOff, // Icon for when photo is not available
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
    photoUrl?: string | null;
  }>({
    message: "",
    type: "success",
    student: null,
    show: false,
    photoUrl: null,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputQueue, setInputQueue] = useState<string[]>([]);
  const inputQueueRef = useRef<string[]>([]);

  useEffect(() => {
    inputQueueRef.current = inputQueue;
  }, [inputQueue]);

  const [studentCache, setStudentCache] = useState<StudentCache>(new Map());

  const processId = useCallback(
    async (idToProcess: string) => {
      if (!currentEvent) return;

      setIsProcessing(true);
      setLastProcessedInfo((prev) => ({
        ...prev,
        show: false,
        photoUrl: null,
      }));
      let studentData: Student | null = null;
      let studentPhotoUrl: string | null = null;
      let message = "";
      let messageType: "success" | "warning" | "error" = "success";
      let derivedFullName = "Student";

      try {
        if (studentCache.has(idToProcess)) {
          const cachedStudent = studentCache.get(idToProcess);
          studentData = cachedStudent ?? null;
          studentPhotoUrl = cachedStudent?.photoUrl ?? null;
          if (studentData === null) {
            message = "Student ID not found (cached).";
            messageType = "error";
          }
        } else {
          const studentInfoResponse = await fetch(
            `https://dlsl-student-api-2hgc.onrender.com/api/student?id=${idToProcess}`
          );

          if (!studentInfoResponse.ok) {
            if (studentInfoResponse.status === 404) {
              message = "Student ID not found.";
              messageType = "error";
              setStudentCache((prev) =>
                new Map(prev).set(idToProcess, null)
              );
            } else {
              message = `API Error: ${studentInfoResponse.status}. Try again.`;
              messageType = "error";
            }
          } else {
            const apiData = await studentInfoResponse.json();
            if (apiData.email_address && apiData.partner_id) {
              const emailParts = apiData.email_address.split("@")[0];
              const nameParts = emailParts.split("_");
              derivedFullName = nameParts
                .map(
                  (part: string) => part.charAt(0).toUpperCase() + part.slice(1)
                )
                .join(" ");

              studentData = {
                photoUrl: null,
                email_address: apiData.email_address,
                department: apiData.department || "N/A",
                fullName: derivedFullName,
                partner_id: apiData.partner_id,
              };

              try {
                const photoResponse = await fetch(
                  `https://dlsl-student-api-2hgc.onrender.com/api/getStudentPhoto?id=${apiData.partner_id}`
                );
                if (photoResponse.ok) {
                  studentPhotoUrl = await photoResponse.text()
                } else {
                  console.warn(
                    "Failed to fetch student photo:",
                    photoResponse.status
                  );
                  studentPhotoUrl = null;
                }
              } catch (photoError) {
                console.error("Error fetching student photo:", photoError);
                studentPhotoUrl = null;
              }
              setStudentCache((prev) =>
                new Map(prev).set(idToProcess, {
                  ...studentData!,
                  photoUrl: studentPhotoUrl,
                })
              );
            } else {
              message = "Incomplete student data received.";
              messageType = "error";
              setStudentCache((prev) =>
                new Map(prev).set(idToProcess, null)
              );
            }
          }
        }

        if (studentData && messageType !== "error") {
          derivedFullName = studentData.fullName;
          const alreadyRegistered = currentEvent.attendees.some(
            (attendee) => attendee.studentId === studentData!.partner_id
          );

          if (alreadyRegistered) {
            message = `${
              derivedFullName.split(" ")[0]
            }, you're already checked in!`;
            messageType = "warning";
          } else {
            const newAttendance: Attendance = {
              studentId: studentData.partner_id,
              fullName: studentData.fullName,
              department: studentData.department,
              email: studentData.email_address,
              timestamp: new Date().toISOString(),
            };
            onEventAttendance(newAttendance);
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
          message = "Student ID not processed.";
          messageType = "error";
        }
      } catch (error) {
        console.error("Processing Error:", error);
        message = "A network or system error occurred.";
        messageType = "error";
      } finally {
        const nextIdInQueue =
          inputQueueRef.current.length > 0 ? inputQueueRef.current[0] : null;
        if (nextIdInQueue) {
          setInputQueue((q) => q.slice(1));
          setTimeout(() => processId(nextIdInQueue), 0);
        } else {
          setIsProcessing(false);
          setLastProcessedInfo({
            message: message || "Completed.",
            type: messageType,
            student: studentData,
            photoUrl: studentData ? studentPhotoUrl : null, // Only pass photoUrl if student data exists
            show: true,
          });

          setTimeout(() => {
            setLastProcessedInfo((prev) => {
              if (prev.photoUrl && prev.photoUrl.startsWith("blob:")) {
                URL.revokeObjectURL(prev.photoUrl);
              }
              return { ...prev, show: false };
            });
            // Revoke object URL to free up memory if it was created
          }, messageTimeout);
        }
      }
    },
    [studentCache, onEventAttendance, currentEvent]
  );

  useCardReader((input: string) => {
    if (isProcessing) {
      setInputQueue((prev) => [...prev, input]);
    } else {
      processId(input);
    }
  });

  const { width, height } = useWindowSize();
  const { message, type, student, show, photoUrl } = lastProcessedInfo;
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
          tweenDuration={5000}
          colors={["#FFFFFF", "#A7F3D0", "#6EE7B7", "#34D399"]}
          style={{ position: "fixed", top: 0, left: 0, zIndex: 5000 }}
          onConfettiComplete={(instance) => instance?.reset()}
        />
      )}

      <div className="p-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-white bg-opacity-90 backdrop-blur-sm z-10">
        <div className="flex items-center overflow-hidden">
          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: "#f3f4f6" }}
            whileTap={{ scale: 0.9 }}
            className="bg-gray-100 text-gray-700 p-1.5 rounded-full mr-3 hover:bg-gray-200 transition-colors"
            onClick={onBack}
            title="Back"
          >
            <ArrowLeft size={18} />
          </motion.button>
          <div className="overflow-hidden">
            <h1
              className={`text-base font-medium ${dlslGreen.darkText} truncate`}
              title={currentEvent?.name}
            >
              {currentEvent?.name || "Check-in"}
            </h1>
            <p className={`text-xs ${dlslMutedText}`}>
              <Users size={12} className="inline mr-1" />
              {currentEvent?.attendees.length ?? 0} checked in
            </p>
          </div>
        </div>
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

      <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {show ? (
            <motion.div
              key="message-card"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={springFast}
              className="text-center p-6 bg-white rounded-xl shadow-lg max-w-md w-full relative z-20" // Increased max-w for photo
            >
              {photoUrl && type === "success" && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, ...springFast }}
                  className="mb-4 flex justify-center"
                >
                  <img
                    src={photoUrl}
                    alt={student?.fullName || "Student photo"}
                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md" // Adjusted size
                  />
                </motion.div>
              )}
              {type === "success" && !photoUrl && student && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, ...springFast }}
                  className="mb-4 flex justify-center items-center w-32 h-32 rounded-full bg-gray-200 text-gray-500 mx-auto border-4 border-white shadow-md"
                >
                  <ImageOff size={48} />
                </motion.div>
              )}

              <motion.div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
                  messageStyles.bg
                } ${photoUrl && type === "success" ? "mt-2" : "mb-4"}`} // Adjusted margin based on photo
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  ...springFast,
                  delay: photoUrl && type === "success" ? 0.15 : 0.05,
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay: photoUrl && type === "success" ? 0.3 : 0.2,
                  }}
                >
                  {type === "success" && (
                    <Check className={messageStyles.icon} size={32} />
                  )}
                  {type === "warning" && (
                    <Users className={messageStyles.icon} size={32} />
                  )}
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
                {message}
              </motion.h2>
              {student &&
                (type === "success" || type === "warning") && ( // Show department for warning too
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className={`text-sm ${dlslMutedText}`}
                  >
                    {student.department}
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
                <motion.div
                  animate={{ y: [0, -4, 0], scale: [1, 1.03, 1] }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.8,
                    ease: "easeInOut",
                  }}
                >
                  <ScanLine size={56} className="mx-auto" />
                </motion.div>
              </motion.div>
              <h2
                className={`text-2xl sm:text-3xl font-semibold ${dlslGreen.darkText} mb-4`}
              >
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
                  )}
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
                  href="https://instagram.com/tyronscott_"
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

      {currentEvent && (
        <div className="border-t border-gray-100 p-3 max-h-52 overflow-y-auto bg-white flex-shrink-0 relative z-0">
          <h3
            className={`text-xs font-semibold ${dlslGreen.darkText} mb-2 sticky top-0 bg-white pt-1 pb-1.5 border-b border-gray-100 z-10`}
          >
            Recent ({currentEvent.attendees.length})
          </h3>
          <div className="space-y-1.5 pr-1">
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
                    <div
                      className={`w-6 h-6 ${dlslGreen.lighterBg} ${dlslGreen.text} rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0`}
                    >
                      {attendee.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 overflow-hidden min-w-0">
                      <p
                        className="text-gray-800 font-medium truncate text-xs"
                        title={attendee.fullName}
                      >
                        {attendee.fullName}
                      </p>
                      <p
                        className="text-xs text-gray-500 truncate"
                        title={attendee.department}
                      >
                        {attendee.department}
                      </p>
                    </div>
                    <div className="text-[10px] text-gray-400 flex-shrink-0 text-right ml-1">
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
