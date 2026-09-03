import React, { useState, useEffect, useRef } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
} from "recharts";
import "./AVD.css";

// Custom SVG Gauge Component
const ThreatGauge = ({ value }) => {
  const radius = 80;
  const strokeWidth = 14;
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  const strokeDashoffset = 251 - (251 * (normalizedValue / 100) * 0.75);

  let strokeColor = "#22c55e"; // Green
  if (value >= 40 && value < 75) strokeColor = "#eab308"; // Yellow
  if (value >= 75) strokeColor = "#ef4444"; // Red

  return (
    <div className="gauge-container" style={{ position: "relative", textAlign: "center" }}>
      <svg width="200" height="150" viewBox="0 0 200 150">
        <path
          d="M 30 130 A 70 70 0 1 1 170 130"
          fill="none"
          stroke="#334155"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d="M 30 130 A 70 70 0 1 1 170 130"
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray="251"
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.3s ease, stroke 0.3s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", bottom: "20px", left: "0", right: "0" }}>
        <span style={{ fontSize: "2rem", fontWeight: "bold", color: strokeColor }}>
          {value}%
        </span>
        <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>AI Probability</div>
      </div>
    </div>
  );
};

const AVD = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [aiScore, setAiScore] = useState(25);
  const [chartData, setChartData] = useState([
    { time: "0s", level: 0, peak: 0 },
  ]);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameIdRef = useRef(null);

  const toggleMicrophone = async () => {
    if (isRecording) {
      stopAudioProcessing();
    } else {
      await startAudioProcessing();
    }
  };

  const startAudioProcessing = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      setIsRecording(true);
      processAudio();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied or not supported.");
    }
  };

  const stopAudioProcessing = () => {
    if (animationFrameIdRef.current) clearTimeout(animationFrameIdRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    setIsRecording(false);
  };

  const processAudio = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateMetrics = () => {
      analyserRef.current.getByteFrequencyData(dataArray);

      let sum = 0;
      let max = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
        if (dataArray[i] > max) max = dataArray[i];
      }
      const avgLevel = Math.round(sum / bufferLength);

      setAiScore((prev) => {
        if (avgLevel > 80) return Math.min(100, prev + 2);
        return Math.max(10, prev - 1);
      });

      setChartData((prevData) => {
        const currentTime = new Date().toLocaleTimeString().split(" ")[0];
        const updated = [...prevData, { time: currentTime, level: avgLevel, peak: max }];
        return updated.slice(-12);
      });

      animationFrameIdRef.current = setTimeout(() => {
        requestAnimationFrame(updateMetrics);
      }, 200);
    };

    updateMetrics();
  };

  useEffect(() => {
    return () => stopAudioProcessing();
  }, []);

  return (
    <div className="avd-card">
      <header className="avd-header">
        <div>
          <h2>Audio Voice Detection (AVD) Analysis</h2>
          <p className="avd-subtitle">Real-time AI probability & waveform levels</p>
        </div>
        <button
          className={`mic-control-btn ${isRecording ? "active" : ""}`}
          onClick={toggleMicrophone}
        >
          {isRecording ? "Stop Live Stream" : "Start Live Stream"}
        </button>
      </header>

      <div className="avd-grid">
        <div className="avd-gauge-section">
          <h3>AI Voice Confidence</h3>
          <div className="gauge-wrapper">
            <ThreatGauge value={aiScore} />
          </div>
        </div>

        <div className="avd-chart-section">
          <h3>Live Microphone Frequency Levels</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" />
                <YAxis domain={[0, 255]} stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#475569" }} />
                <ReferenceArea y1={160} y2={220} fill="#ef4444" fillOpacity={0.15} />
                <Line type="monotone" dataKey="level" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="peak" stroke="#38bdf8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AVD;