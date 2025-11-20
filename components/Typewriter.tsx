import React, { useState, useEffect, useRef } from 'react';

interface TypewriterProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

const Typewriter: React.FC<TypewriterProps> = ({ text, speed = 30, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Use a ref for the callback to avoid re-triggering the effect when the parent passes a new function
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Reset when text changes
    setDisplayedText('');
    indexRef.current = 0;
    
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayedText((prev) => prev + text.charAt(indexRef.current));
        indexRef.current++;
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
        if (onCompleteRef.current) onCompleteRef.current();
      }
    }, speed);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [text, speed]); // Removed onComplete from dependencies

  // Allow skipping animation by clicking
  const finishNow = () => {
      if (indexRef.current < text.length) {
          if (timerRef.current) clearInterval(timerRef.current);
          setDisplayedText(text);
          indexRef.current = text.length;
          if (onCompleteRef.current) onCompleteRef.current();
      }
  };

  return <span onClick={finishNow} className="cursor-pointer">{displayedText}</span>;
};

export default Typewriter;