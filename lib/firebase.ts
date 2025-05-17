"use client";

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCPHMALYzP74GJk07bC2xwtCAuSBrOHOSY",
  authDomain: "jpcs-event-attendance.firebaseapp.com",
  projectId: "jpcs-event-attendance",
  storageBucket: "jpcs-event-attendance.firebasestorage.app",
  messagingSenderId: "1008489577762",
  appId: "1:1008489577762:web:b60b09bac61ab3c7a3797b",
  measurementId: "G-VVEEVN129N"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);