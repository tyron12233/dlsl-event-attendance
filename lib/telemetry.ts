"use client";

import { app } from "@/lib/firebase";
import { addDoc, collection, getFirestore } from "firebase/firestore";
import { Event } from "./types";

/**
 * For analytics purposes, this function emits an event to the Firestore database.
 * This is used to track the creation of events in the application.
 * @param event The event to be emitted.
 */
export async function emitEventCreated(event: Event) {
    const db = getFirestore(app);

    const collectionRef = collection(db, "events");
    
    await addDoc(collectionRef, {
        name: event.name,
        date: event.date,
        description: event.description,
    });
}