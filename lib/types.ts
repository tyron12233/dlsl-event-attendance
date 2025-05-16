export interface Student {
  // Represents the data structure returned by the API
  email_address: string;
  department: string;
  photoUrl: string | null; // URL to the student's photo
  fullName: string; // Derived from email or other source
  partner_id: string; // The "real" unique student identifier from the API
}

export interface Attendance {
  // Represents an entry in the current event's attendance list
  studentId: string; // This should be the partner_id (real ID)
  fullName: string;
  department: string;
  email: string;
  timestamp: string;
}

export interface Event {
  id: string;
  name: string;
  date: string;
  description: string;
  attendees: Attendance[]; // Uses the Attendance interface
}

// Cache structure: Maps the *inputted* ID to the fetched Student data or null if not found
export type StudentCache = Map<string, Student | null>;

// --- THEME --- (Lighter Green)
export const dlslGreen = {
  DEFAULT: 'bg-green-500',
  hover: 'hover:bg-green-600',
  text: 'text-green-500',
  darkText: 'text-green-700', 
  lightBg: 'bg-green-50',
  lighterBg: 'bg-green-100',
  ring: 'focus:ring-green-500', 
  border: 'border-green-500',
};
export const dlslWhite = 'text-white';
export const dlslGrayText = 'text-gray-700';
export const dlslMutedText = 'text-gray-500';

// Status Colors (remain mostly the same, adjust icon bg/text if needed)
export const warningColor = { bg: 'bg-amber-100', text: 'text-amber-600', icon: 'text-amber-500' };
export const errorColor = { bg: 'bg-red-100', text: 'text-red-600', icon: 'text-red-500' };
export const successColor = { bg: 'bg-green-100', text: 'text-green-700', icon: 'text-green-500' }; // Success uses darker text


// --- ANIMATION SPEEDS --- (Faster)
export const springFast = { type: "spring", stiffness: 200, damping: 18 }; // Faster spring
export const durationFast = 0.3; // Faster tween duration
export const durationMedium = 0.4;
export const messageTimeout = 2500; // Shorter display time for messages

export const welcomeMessages = [
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
