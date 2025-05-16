import { useEffect, useState } from "react";

export default function useCardReader(
    onEnter: (input: string) => void,
) {
    const [input, setInput] = useState<string>("");


    useEffect(() => {
        const handleKeyboardInput = (event: KeyboardEvent) => {
            if (event.key === "Enter") {
                // Handle the Enter key press
                onEnter(input);
                setInput(""); 
            } else if (event.key === "Backspace") {
                // Handle Backspace key press
                setInput((prev) => prev.slice(0, -1));
            } else if (event.key.length === 1) {
                // Handle character input
                setInput((prev) => prev + event.key);
            }
        }

        window.addEventListener("keydown", handleKeyboardInput);

        return () => {
            window.removeEventListener("keydown", handleKeyboardInput);
        };
    });
}