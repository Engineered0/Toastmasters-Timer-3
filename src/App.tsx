import React, { useState, useCallback, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';

interface TimerHistory {
  name: string;
  duration: number;
  color: string;
  mode: string;
  timings: { green: number; yellow: number; red: number };
}

interface CategorizedHistory {
  [mode: string]: {
    tooShort: TimerHistory[];
    onTime: TimerHistory[];
    overTime: TimerHistory[];
  };
}

type Color = 'green' | 'yellow' | 'red';

interface Timing {
  minutes: number;
  seconds: number;
}

interface Timings {
  green: Timing;
  yellow: Timing;
  red: Timing;
}

export default function App() {
  const [time, setTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [speakerName, setSpeakerName] = useState('');

  // Initialize history from localStorage
  const [history, setHistory] = useState<TimerHistory[]>(() => {
    const storedHistory = localStorage.getItem('toastmastersHistory');
    return storedHistory ? JSON.parse(storedHistory) : [];
  });

  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [isTimerVisible, setIsTimerVisible] = useState(true);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const [mode, setMode] = useState('Introductions');

  const [introductionTimings, setIntroductionTimings] = useState<Timings>({
    green: { minutes: 0, seconds: 30 },
    yellow: { minutes: 0, seconds: 45 },
    red: { minutes: 1, seconds: 0 },
  });

  const [tableTopicsTimings, setTableTopicsTimings] = useState<Timings>({
    green: { minutes: 1, seconds: 0 },
    yellow: { minutes: 1, seconds: 30 },
    red: { minutes: 2, seconds: 0 },
  });

  const [speechesTimings, setSpeechesTimings] = useState<Timings>({
    green: { minutes: 5, seconds: 0 },
    yellow: { minutes: 6, seconds: 0 },
    red: { minutes: 7, seconds: 0 },
  });

  const getCurrentTimings = (): Timings => {
    if (mode === 'Introductions') return introductionTimings;
    if (mode === 'Table Topics') return tableTopicsTimings;
    return speechesTimings;
  };

  const currentTimings = getCurrentTimings();

  const convertToSeconds = (timeObj: { minutes: number; seconds: number }) => {
    return timeObj.minutes * 60 + timeObj.seconds;
  };

  const startTimer = useCallback(() => {
    if (speakerName.trim() === '') {
      alert('Please enter a speaker name');
      return;
    }
    const green = convertToSeconds(currentTimings.green);
    const yellow = convertToSeconds(currentTimings.yellow);
    const red = convertToSeconds(currentTimings.red);
    if (green >= yellow || yellow >= red) {
      alert('Please ensure that Green < Yellow < Red timings');
      return;
    }
    setIsActive(true);
    intervalRef.current = window.setInterval(() => {
      setTime((prevTime) => prevTime + 1);
    }, 1000);
  }, [speakerName, currentTimings]);

  const stopTimer = useCallback(() => {
    setIsActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Save history only when the timer is stopped
    setHistory((prevHistory) => [
      ...prevHistory,
      {
        name: speakerName,
        duration: time,
        color: backgroundColor,
        mode: mode,
        timings: {
          green: convertToSeconds(currentTimings.green),
          yellow: convertToSeconds(currentTimings.yellow),
          red: convertToSeconds(currentTimings.red),
        },
      },
    ]);

    resetTimer();
  }, [speakerName, time, backgroundColor, mode, currentTimings]);

  const resetTimer = useCallback(() => {
    setTime(0);
    setIsActive(false);
    setSpeakerName('');
    setBackgroundColor('#FFFFFF');
    setIsTimerVisible(true); // Reset timer visibility when resetting
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  useEffect(() => {
    const green = convertToSeconds(currentTimings.green);
    const yellow = convertToSeconds(currentTimings.yellow);
    const red = convertToSeconds(currentTimings.red);

    if (isActive) {
      if (time >= green && time < yellow) {
        setBackgroundColor('#4CAF50'); // Green
      } else if (time >= yellow && time < red) {
        setBackgroundColor('#FFEB3B'); // Yellow
      } else if (time >= red) {
        setBackgroundColor('#F44336'); // Red
      } else {
        setBackgroundColor('#FFFFFF'); // Default
      }
    } else {
      setBackgroundColor('#FFFFFF'); // Reset when timer is not active
    }
  }, [time, currentTimings, isActive]);

  const categorizeHistory = () => {
    const categorized: CategorizedHistory = {};

    history.forEach((item: TimerHistory) => {
      const { mode, timings, duration } = item;
      if (!categorized[mode]) {
        categorized[mode] = {
          tooShort: [],
          onTime: [],
          overTime: [],
        };
      }

      const green = timings.green;
      const red = timings.red;

      if (duration < green) {
        categorized[mode].tooShort.push(item);
      } else if (duration >= green && duration <= red) {
        categorized[mode].onTime.push(item);
      } else {
        categorized[mode].overTime.push(item);
      }
    });

    return categorized;
  };

  const categorizedHistory = categorizeHistory();

  const categories: Array<'tooShort' | 'onTime' | 'overTime'> = [
    'tooShort',
    'onTime',
    'overTime',
  ];

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('toastmastersHistory', JSON.stringify(history));
  }, [history]);

  // Function to download the history as a PDF
  const downloadPDF = () => {
    const doc = new jsPDF();
    let y = 20;

    // Get the page width to center the text
    const pageWidth = doc.internal.pageSize.getWidth();

    // Get current date and time
    const now = new Date();
    const dateString = now.toLocaleDateString();
    const timeString = now.toLocaleTimeString();

    // Update the heading to include date and time
    doc.setFontSize(18);
    doc.text(
      `Toastmasters Timer Report - ${dateString} ${timeString}`,
      pageWidth / 2,
      y,
      { align: 'center' }
    );
    y += 10;

    Object.keys(categorizedHistory).forEach((modeKey) => {
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      y += 10;
      doc.text(modeKey, 10, y);
      y += 6;

      categories.forEach((category) => {
        const entries = categorizedHistory[modeKey][category];
        if (entries.length > 0) {
          doc.setFontSize(14);
          doc.setTextColor(100);
          doc.text(
            category === 'tooShort'
              ? 'Too Short'
              : category === 'onTime'
              ? 'On Time'
              : 'Over Time',
            14,
            y
          );
          y += 6;

          entries.forEach((item) => {
            doc.setFontSize(12);
            doc.setTextColor(50);
            doc.text(
              `${item.name}: ${formatTime(item.duration)}`,
              18,
              y
            );
            y += 6;

            // Add page if content exceeds page height
            if (y > 280) {
              doc.addPage();
              y = 10;
            }
          });
        }
      });
    });

    // Include date and time in the filename
    const filename = `Toastmasters_Timer_Report_${now
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, '_')}.pdf`;
    doc.save(filename);
  };

  // Function to clear history with confirmation
  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear the history?')) {
      setHistory([]);
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-6"
      style={{ backgroundColor }}
    >
      <h1 className="text-4xl font-bold mb-8 text-center">
        Toastmasters Timer for {mode}
      </h1>

      {/* Mode Selector */}
      <div className="mb-4 flex flex-col items-center">
        <label className="mr-2 font-bold">Select Mode:</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          disabled={isActive}
          className="px-2 py-1 border border-gray-300 rounded"
        >
          <option value="Introductions">Introductions</option>
          <option value="Table Topics">Table Topics</option>
          <option value="Speeches">Speeches</option>
        </select>
      </div>

      {/* Timing Inputs */}
      <div className="w-full max-w-md mb-4">
        <h2 className="text-xl font-bold mb-2 text-center">
          Set Timings (Minutes:Seconds)
        </h2>
        <div className="flex justify-center space-x-4">
          {(['green', 'yellow', 'red'] as Color[]).map((color) => (
            <div key={color} className="flex flex-col items-center">
              <label className="font-bold capitalize">{color}:</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="0"
                  value={currentTimings[color].minutes}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (mode === 'Introductions') {
                      setIntroductionTimings((prevTimings) => ({
                        ...prevTimings,
                        [color]: {
                          ...prevTimings[color],
                          minutes: value,
                        },
                      }));
                    } else if (mode === 'Table Topics') {
                      setTableTopicsTimings((prevTimings) => ({
                        ...prevTimings,
                        [color]: {
                          ...prevTimings[color],
                          minutes: value,
                        },
                      }));
                    } else {
                      setSpeechesTimings((prevTimings) => ({
                        ...prevTimings,
                        [color]: {
                          ...prevTimings[color],
                          minutes: value,
                        },
                      }));
                    }
                  }}
                  disabled={isActive}
                  className="w-16 px-2 py-1 border border-gray-300 rounded"
                  placeholder="Min"
                />
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={currentTimings[color].seconds}
                  onChange={(e) => {
                    let value = Number(e.target.value);
                    if (value > 59) value = 59;
                    if (mode === 'Introductions') {
                      setIntroductionTimings((prevTimings) => ({
                        ...prevTimings,
                        [color]: {
                          ...prevTimings[color],
                          seconds: value,
                        },
                      }));
                    } else if (mode === 'Table Topics') {
                      setTableTopicsTimings((prevTimings) => ({
                        ...prevTimings,
                        [color]: {
                          ...prevTimings[color],
                          seconds: value,
                        },
                      }));
                    } else {
                      setSpeechesTimings((prevTimings) => ({
                        ...prevTimings,
                        [color]: {
                          ...prevTimings[color],
                          seconds: value,
                        },
                      }));
                    }
                  }}
                  disabled={isActive}
                  className="w-16 px-2 py-1 border border-gray-300 rounded"
                  placeholder="Sec"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timer visibility toggle */}
      {isTimerVisible && (
        <div className="text-6xl font-bold mb-8">
          {formatTime(time)}
        </div>
      )}

      <input
        className="w-full max-w-md px-4 py-2 mb-4 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        type="text"
        placeholder="Enter speaker's name"
        value={speakerName}
        onChange={(e) => setSpeakerName(e.target.value)}
        disabled={isActive}
      />
      <div className="flex flex-wrap justify-center space-x-4 mb-8">
        <button
          className={`px-4 py-2 font-bold text-white bg-blue-500 rounded shadow transition duration-200 ${
            isActive
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-blue-700'
          }`}
          onClick={startTimer}
          disabled={isActive}
        >
          Start
        </button>
        <button
          className={`px-4 py-2 font-bold text-white bg-red-500 rounded shadow transition duration-200 ${
            !isActive
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-red-700'
          }`}
          onClick={stopTimer}
          disabled={!isActive}
        >
          Stop
        </button>
        <button
          className="px-4 py-2 font-bold text-white bg-gray-500 rounded shadow hover:bg-gray-700 transition duration-200"
          onClick={resetTimer}
        >
          Reset
        </button>

        {/* Button to toggle timer visibility */}
        {isActive && (
          <button
            className={`px-4 py-2 font-bold text-white bg-orange-500 rounded shadow hover:bg-orange-700 transition duration-200`}
            onClick={() => setIsTimerVisible((prev) => !prev)}
          >
            {isTimerVisible ? 'Hide Timer' : 'Show Timer'}
          </button>
        )}
      </div>

      {/* Button to toggle history visibility and clear history */}
      <div className="flex mb-4 space-x-4">
        <button
          className={`px-4 py-2 font-bold text-white bg-purple-500 rounded shadow hover:bg-purple-700 transition duration-200`}
          onClick={() => setIsHistoryVisible((prev) => !prev)}
        >
          {isHistoryVisible ? 'Hide History' : 'Show History'}
        </button>
        {history.length > 0 && (
          <>
            <button
              className="px-4 py-2 font-bold text-white bg-green-600 rounded shadow hover:bg-green-800 transition duration-200"
              onClick={downloadPDF}
            >
              Download PDF
            </button>
            <button
              className="px-4 py-2 font-bold text-white bg-red-600 rounded shadow hover:bg-red-800 transition duration-200"
              onClick={clearHistory}
            >
              Clear History
            </button>
          </>
        )}
      </div>

      {/* History Section */}
      {isHistoryVisible && (
        <div className="w-full max-w-md mt-4 p-4 border border-gray-300 rounded shadow bg-white">
          <h2 className="text-2xl font-bold mb-4">History</h2>
          {Object.keys(categorizedHistory).map((modeKey) => (
            <div key={modeKey} className="mb-8">
              <h2 className="text-2xl font-bold mb-4">{modeKey}</h2>
              {categories.map((category) => (
                <div key={category}>
                  <h3 className="text-xl font-semibold mb-2">
                    {category === 'tooShort'
                      ? 'Too Short'
                      : category === 'onTime'
                      ? 'On Time'
                      : 'Over Time'}
                  </h3>
                  <div className="max-h-40 overflow-y-auto">
                    {categorizedHistory[modeKey][category].map(
                      (item: TimerHistory, index: number) => (
                        <div
                          key={index}
                          className={`p-2 mb-2 rounded ${
                            category === 'tooShort'
                              ? 'bg-blue-100'
                              : category === 'onTime'
                              ? 'bg-green-100'
                              : 'bg-red-100'
                          }`}
                        >
                          <span className="font-bold">
                            {item.name} ({item.mode}):
                          </span>{' '}
                          {formatTime(item.duration)}
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <a
          href="https://github.com/Engineered0"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xl font-bold transition-all duration-300 transform hover:scale-105 hover:tracking-wider"
        >
          Made by Khaled Ali Ahmed
        </a>
      </div>
    </div>
  );
}
