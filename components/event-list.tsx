import {
  dlslGreen,
  dlslWhite,
  durationMedium,
  springFast,
  dlslMutedText,
  dlslGrayText,
  Event,
} from "@/lib/types";
import { motion } from "framer-motion";
import {
  Plus,
  ScanLine,
  Trash2,
  Download,
  Users,
  ArrowLeft,
} from "lucide-react";

interface EventListPageProps {
  events: Event[];
  onCreateEvent: () => void;
  onDeleteEvent: (id: string) => void;
  onExportToExcel: (event: Event) => void;
  onSetCurrentEvent: (event: Event) => void;
}

export default function EventListPage({
  events,
  onCreateEvent,
  onDeleteEvent,
  onExportToExcel,
  onSetCurrentEvent,
}: EventListPageProps) {
  return (
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
          onClick={() => onCreateEvent()}
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
              onClick={() => onCreateEvent()}
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
                        onDeleteEvent(event.id);
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
                        if (event.attendees.length > 0) {
                            onExportToExcel(event);
                        }
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
                    onSetCurrentEvent(event);
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
}
