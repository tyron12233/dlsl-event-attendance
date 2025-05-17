import {
  dlslGreen,
  durationFast,
  dlslGrayText,
  dlslWhite,
  Event,
} from "@/lib/types";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

interface CreateEventPageProps {
  onCreateEvent: (event: Event) => void;
  onBack: () => void;
}

export default function CreateEventPage({
  onCreateEvent,
  onBack,
}: CreateEventPageProps) {
  const [newEvent, setNewEvent] = useState({
    name: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
  });

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
    setNewEvent({
      name: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
    });
    onCreateEvent(newEventData);
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      {" "}
      {/* Slightly smaller max-width */}
      <div className="flex items-center mb-6">
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: "#f3f4f6" }}
          whileTap={{ scale: 0.9 }}
          className="bg-gray-100 text-gray-700 p-1.5 rounded-full mr-3 hover:bg-gray-200 transition-colors"
          onClick={onBack}
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
          <motion.button
            whileHover={{ scale: 1.02, backgroundColor: "#e5e7eb" }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onBack}
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
}
