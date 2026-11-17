import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Compass,
  Navigation,
  MapPin,
  Volume2,
  VolumeX,
  RotateCw,
  Smartphone,
  CheckCircle2,
  Info,
  Clock,
  Globe,
  Sliders,
  Sparkles,
  Crosshair,
  ChevronUp,
  ChevronDown,
  Watch
} from 'lucide-react';

// ============================================================================
// CONSTANTS & GEODETIC MATH
// ============================================================================

// Exact coordinates of the Holy Kaaba in Mecca, Saudi Arabia
const KAABA_COORDS = {
  lat: 21.422487,
  lng: 39.826206
};

// Curated global cities for instant testing (defaults to Dubai)
const PRESET_CITIES = [
  { id: 'dubai', name: 'Dubai, UAE', short: 'Dubai', lat: 25.2048, lng: 55.2708, tz: 'Asia/Dubai' },
  { id: 'london', name: 'London, UK', short: 'London', lat: 51.5074, lng: -0.1278, tz: 'Europe/London' },
  { id: 'newyork', name: 'New York, USA', short: 'NYC', lat: 40.7128, lng: -74.0060, tz: 'America/New_York' },
  { id: 'tokyo', name: 'Tokyo, Japan', short: 'Tokyo', lat: 35.6762, lng: 139.6503, tz: 'Asia/Tokyo' },
  { id: 'istanbul', name: 'Istanbul, Turkey', short: 'Istanbul', lat: 41.0082, lng: 28.9784, tz: 'Europe/Istanbul' },
  { id: 'jakarta', name: 'Jakarta, Indonesia', short: 'Jakarta', lat: -6.2088, lng: 106.8456, tz: 'Asia/Jakarta' },
  { id: 'cairo', name: 'Cairo, Egypt', short: 'Cairo', lat: 30.0444, lng: 31.2357, tz: 'Africa/Cairo' },
  { id: 'mecca', name: 'Mecca, Saudi Arabia', short: 'Mecca', lat: 21.4225, lng: 39.8262, tz: 'Asia/Riyadh' },
];

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

/**
 * Calculates the initial great-circle bearing (forward azimuth) from a given point to the Kaaba.
 * Formula: θ = atan2( sin Δλ ⋅ cos φ2 , cos φ1 ⋅ sin φ2 − sin φ1 ⋅ cos φ2 ⋅ cos Δλ )
 */
function calculateQiblaBearing(lat, lng) {
  const phi1 = toRad(lat);
  const phi2 = toRad(KAABA_COORDS.lat);
  const deltaLambda = toRad(KAABA_COORDS.lng - lng);

  // If virtually at the Kaaba
  if (Math.abs(lat - KAABA_COORDS.lat) < 0.0001 && Math.abs(lng - KAABA_COORDS.lng) < 0.0001) {
    return 0;
  }

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return (toDeg(theta) + 360) % 360;
}

/**
 * Calculates the great-circle distance in kilometers using the Haversine formula.
 */
function calculateDistanceKm(lat, lng) {
  const R = 6371; // Earth's mean radius in km
  const dLat = toRad(KAABA_COORDS.lat - lat);
  const dLon = toRad(KAABA_COORDS.lng - lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat)) *
      Math.cos(toRad(KAABA_COORDS.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Computes shortest signed angular difference (-180 to +180) between target and current heading.
 */
function getSignedAngleDiff(target, current) {
  return ((target - current + 540) % 360) - 180;
}

/**
 * Returns cardinal/intercardinal direction label for a degree bearing.
 */
function getCardinalDirection(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((deg % 360) / 45)) % 8;
  return dirs[index];
}

// ============================================================================
// CUSTOM SVG ASSETS (KAABA & ISLAMIC GEOMETRIC ACCENTS)
// ============================================================================

const KaabaIcon = ({ size = 24, glowing = false, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {glowing && (
      <circle
        cx="18"
        cy="18"
        r="16"
        fill="url(#kaabaGlow)"
        opacity="0.55"
      />
    )}
    <defs>
      <radialGradient id="kaabaGlow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="goldBand" x1="6" y1="12" x2="30" y2="15" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FBBF24" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
    </defs>
    {/* Isometric Cube Base */}
    <path
      d="M18 5L29 11V25L18 31L7 25V11L18 5Z"
      fill="#141416"
      stroke={glowing ? '#10B981' : '#F59E0B'}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    {/* Top Roof Facet */}
    <path
      d="M18 5L29 11L18 17L7 11L18 5Z"
      fill="#262629"
    />
    {/* Right Wall Shadow */}
    <path
      d="M18 17L29 11V25L18 31V17Z"
      fill="#0D0D0F"
    />
    {/* Kiswah Gold Embroidered Band (Hizam) */}
    <path
      d="M7 13.8L18 19.8L29 13.8V16.4L18 22.4L7 16.4V13.8Z"
      fill="url(#goldBand)"
    />
    {/* Golden Door (Multazam) */}
    <path
      d="M21.5 19.2L24.5 17.6V23.8L21.5 25.4V19.2Z"
      fill="#F59E0B"
    />
  </svg>
);

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================

export default function App() {
  // Location State (Default: Dubai, UAE)
  const [selectedCityId, setSelectedCityId] = useState('dubai');
  const [coords, setCoords] = useState({ lat: 25.2048, lng: 55.2708 });
  const [locationLabel, setLocationLabel] = useState('Dubai, UAE');
  const [customLat, setCustomLat] = useState('25.2048');
  const [customLng, setCustomLng] = useState('55.2708');
  const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [gpsMessage, setGpsMessage] = useState('');

  // Watch Orientation / Heading State (0 - 359.9 degrees)
  const [heading, setHeading] = useState(215); // Start near Dubai's Qibla (~258.6°) so user can easily test sweeping across it
  const [useDeviceSensors, setUseDeviceSensors] = useState(false);
  const [sensorStatus, setSensorStatus] = useState('');

  // Watch UI & Hardware State
  const [activeScreen, setActiveScreen] = useState(0); // 0: Compass, 1: Telemetry & Prayer, 2: Calibration & Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [useMiles, setUseMiles] = useState(false);
  const [trueNorthMode, setTrueNorthMode] = useState(true);
  const [watchSize, setWatchSize] = useState('ultra'); // 'series' | 'ultra'
  const [crownRotation, setCrownRotation] = useState(0);
  const [hapticPulse, setHapticPulse] = useState(false);
  const [watchTime, setWatchTime] = useState('');

  // Refs for drag interactions & audio synthesis
  const compassRef = useRef(null);
  const isDraggingCompass = useRef(false);
  const lastDragAngle = useRef(0);
  const crownRef = useRef(null);
  const isDraggingCrown = useRef(false);
  const lastCrownY = useRef(0);
  const crownAccumulator = useRef(0);
  const prevAlignedRef = useRef(false);
  const audioCtxRef = useRef(null);

  // Update watch status bar clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setWatchTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 10000);
    return () => clearInterval(timer);
  }, []);

  // Derived Qibla Telemetry
  const qiblaBearing = useMemo(
    () => calculateQiblaBearing(coords.lat, coords.lng),
    [coords.lat, coords.lng]
  );

  const distanceKm = useMemo(
    () => calculateDistanceKm(coords.lat, coords.lng),
    [coords.lat, coords.lng]
  );

  const formattedDistance = useMemo(() => {
    if (useMiles) {
      const miles = distanceKm * 0.621371;
      return `${Math.round(miles).toLocaleString()} mi`;
    }
    return `${Math.round(distanceKm).toLocaleString()} km`;
  }, [distanceKm, useMiles]);

  // Signed angular difference from current heading to Qibla (-180 to +180)
  const angleDiff = useMemo(
    () => getSignedAngleDiff(qiblaBearing, heading),
    [qiblaBearing, heading]
  );

  // Alignment threshold: within ±3.0 degrees
  const isAligned = Math.abs(angleDiff) <= 3.0;

  // Web Audio API subtle Taptic/Chime feedback when aligning with Qibla
  const playAlignmentFeedback = useCallback(() => {
    // Trigger visual haptic shake/pulse on watch body
    setHapticPulse(true);
    setTimeout(() => setHapticPulse(false), 450);

    // Trigger mobile vibration if available
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([25, 30, 40]);
      } catch (_) {
        // Ignore if blocked
      }
    }

    if (!soundEnabled) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Subtle watchOS-inspired harmonic double tap chime (E5 -> B5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now); // E5
      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.exponentialRampToValueAtTime(0.08, now + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.24);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.07); // B5
      gain2.gain.setValueAtTime(0.001, now + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.06, now + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.07);
      osc2.stop(now + 0.4);
    } catch (_) {
      // Audio playback gracefully ignored if browser blocks autoplay
    }
  }, [soundEnabled]);

  // Subtle Digital Crown click sound
  const playCrownTick = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.018);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.025);
    } catch (_) {}
  }, [soundEnabled]);

  // Detect transition into Qibla alignment
  useEffect(() => {
    if (isAligned && !prevAlignedRef.current) {
      playAlignmentFeedback();
    }
    prevAlignedRef.current = isAligned;
  }, [isAligned, playAlignmentFeedback]);

  // Real DeviceOrientation Sensor Listener (Mobile/Tablet)
  useEffect(() => {
    if (!useDeviceSensors) {
      setSensorStatus('');
      return;
    }

    const handleOrientation = (event) => {
      let compassHeading = null;
      // iOS Safari webkitCompassHeading
      if (typeof event.webkitCompassHeading === 'number') {
        compassHeading = event.webkitCompassHeading;
      } else if (event.alpha !== null) {
        // Android / Standard absolute orientation
        compassHeading = (360 - event.alpha) % 360;
      }

      if (compassHeading !== null && !Number.isNaN(compassHeading)) {
        setHeading(Math.round(compassHeading * 10) / 10);
        setSensorStatus('Live compass sensor active');
      } else {
        setSensorStatus('Sensor data unavailable on this device — use dial');
      }
    };

    window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    window.addEventListener('deviceorientation', handleOrientation, true);

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [useDeviceSensors]);

  const toggleDeviceSensors = async () => {
    if (useDeviceSensors) {
      setUseDeviceSensors(false);
      return;
    }

    // iOS 13+ requires explicit permission request on user gesture
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          setUseDeviceSensors(true);
          setSensorStatus('Requesting sensor stream...');
        } else {
          setSensorStatus('Compass sensor permission denied.');
        }
      } catch (err) {
        setSensorStatus('Unable to access device orientation.');
      }
    } else if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      setUseDeviceSensors(true);
      setSensorStatus('Listening for device sensors...');
    } else {
      setSensorStatus('Device orientation not supported in this browser.');
    }
  };

  // Live Browser Geolocation
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsMessage('Geolocation is not supported by your browser.');
      return;
    }

    setGpsStatus('loading');
    setGpsMessage('Acquiring satellite fix...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lng = Number(pos.coords.longitude.toFixed(4));
        setCoords({ lat, lng });
        setCustomLat(String(lat));
        setCustomLng(String(lng));
        setSelectedCityId('gps');
        setLocationLabel(`GPS (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`);
        setGpsStatus('success');
        setGpsMessage('Live GPS coordinates locked.');
      },
      (err) => {
        setGpsStatus('error');
        setGpsMessage(
          err.code === 1
            ? 'Location permission denied. Select a preset city below.'
            : 'Could not retrieve GPS fix. Try a preset city.'
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Select Preset City
  const handleSelectCity = (city) => {
    setSelectedCityId(city.id);
    setCoords({ lat: city.lat, lng: city.lng });
    setCustomLat(String(city.lat));
    setCustomLng(String(city.lng));
    setLocationLabel(city.name);
    setGpsStatus('idle');
    setGpsMessage('');
  };

  // Apply Custom Coordinates
  const handleApplyCustomCoords = (e) => {
    e.preventDefault();
    const parsedLat = parseFloat(customLat);
    const parsedLng = parseFloat(customLng);
    if (
      Number.isNaN(parsedLat) ||
      Number.isNaN(parsedLng) ||
      parsedLat < -90 ||
      parsedLat > 90 ||
      parsedLng < -180 ||
      parsedLng > 180
    ) {
      setGpsStatus('error');
      setGpsMessage('Enter valid Latitude (-90 to 90) and Longitude (-180 to 180).');
      return;
    }
    setSelectedCityId('custom');
    setCoords({ lat: parsedLat, lng: parsedLng });
    setLocationLabel(`Custom (${parsedLat.toFixed(2)}°, ${parsedLng.toFixed(2)}°)`);
    setGpsStatus('success');
    setGpsMessage('Custom coordinates applied.');
  };

  // Smoothly animate heading to align directly with Qibla
  const snapToQibla = () => {
    setUseDeviceSensors(false);
    setHeading(Math.round(qiblaBearing * 10) / 10);
  };

  // ==========================================================================
  // INTERACTIVE WATCH COMPASS DRAG HANDLERS (MOUSE + TOUCH)
  // ==========================================================================
  const getAngleFromCenter = (clientX, clientY) => {
    if (!compassRef.current) return 0;
    const rect = compassRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rad = Math.atan2(clientY - cy, clientX - cx);
    return (toDeg(rad) + 90 + 360) % 360;
  };

  const handleCompassPointerDown = (e) => {
    if (activeScreen !== 0) return;
    isDraggingCompass.current = true;
    setUseDeviceSensors(false);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    lastDragAngle.current = getAngleFromCenter(clientX, clientY);
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (isDraggingCompass.current) {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const currentAngle = getAngleFromCenter(clientX, clientY);
        const delta = currentAngle - lastDragAngle.current;
        lastDragAngle.current = currentAngle;

        // Dragging the dial counter-clockwise simulates turning wrist clockwise
        setHeading((prev) => (prev - delta + 360) % 360);
      }

      if (isDraggingCrown.current) {
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const deltaY = clientY - lastCrownY.current;
        lastCrownY.current = clientY;
        setCrownRotation((prev) => prev + deltaY * 2);
        crownAccumulator.current += deltaY;

        if (Math.abs(crownAccumulator.current) >= 28) {
          const step = crownAccumulator.current > 0 ? 1 : -1;
          crownAccumulator.current = 0;
          setActiveScreen((prev) => (prev + step + 3) % 3);
          playCrownTick();
        }
      }
    };

    const handlePointerUp = () => {
      isDraggingCompass.current = false;
      isDraggingCrown.current = false;
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [playCrownTick]);

  // ==========================================================================
  // DIGITAL CROWN SCROLL & DRAG HANDLERS
  // ==========================================================================
  const handleCrownWheel = (e) => {
    e.preventDefault();
    const dir = e.deltaY > 0 ? 1 : -1;
    setCrownRotation((prev) => prev + dir * 24);
    setActiveScreen((prev) => (prev + dir + 3) % 3);
    playCrownTick();
  };

  const handleCrownPointerDown = (e) => {
    e.stopPropagation();
    isDraggingCrown.current = true;
    crownAccumulator.current = 0;
    lastCrownY.current = e.touches ? e.touches[0].clientY : e.clientY;
  };

  const cycleWatchScreen = (dir = 1) => {
    setCrownRotation((prev) => prev + dir * 30);
    setActiveScreen((prev) => (prev + dir + 3) % 3);
    playCrownTick();
  };

  // Simulated Next Prayer Countdown based on local clock
  const nextPrayerInfo = useMemo(() => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const schedule = [
      { name: 'Fajr', time: 5 * 60 + 18, label: '05:18' },
      { name: 'Dhuhr', time: 12 * 60 + 15, label: '12:15' },
      { name: 'Asr', time: 15 * 60 + 32, label: '15:32' },
      { name: 'Maghrib', time: 17 * 60 + 48, label: '17:48' },
      { name: 'Isha', time: 19 * 60 + 12, label: '19:12' },
    ];
    for (const p of schedule) {
      if (p.time > mins) {
        const diff = p.time - mins;
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return {
          name: p.name,
          timeStr: p.label,
          countdown: h > 0 ? `in ${h}h ${m}m` : `in ${m}m`,
        };
      }
    }
    const diff = 24 * 60 - mins + schedule[0].time;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return {
      name: 'Fajr',
      timeStr: '05:18',
      countdown: `in ${h}h ${m}m`,
    };
  }, [watchTime]);

  // Degree tick marks for compass dial (every 5 degrees)
  const compassTicks = useMemo(() => {
    const ticks = [];
    for (let deg = 0; deg < 360; deg += 5) {
      const isMajor = deg % 30 === 0;
      const isCardinal = deg % 90 === 0;
      ticks.push({ deg, isMajor, isCardinal });
    }
    return ticks;
  }, []);

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-between selection:bg-emerald-500/30 selection:text-emerald-200 overflow-x-hidden">
      {/* Subtle Ambient Islamic Geometric Background Grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(#10B981 1px, transparent 1px), radial-gradient(#F59E0B 1px, transparent 1px)`,
          backgroundSize: '36px 36px',
          backgroundPosition: '0 0, 18px 18px',
        }}
      />

      {/* Top Navigation / Header */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-3 flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-950/40">
            <KaabaIcon size={24} glowing />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-white">
                Qibla<span className="text-emerald-400">Watch</span>
              </h1>
              <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-amber-400">
                watchOS 11
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Interactive Apple Watch Great-Circle Qibla Compass
            </p>
          </div>
        </div>

        {/* Header Quick Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWatchSize((s) => (s === 'ultra' ? 'series' : 'ultra'))}
            className="px-3 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 flex items-center gap-1.5 transition"
            title="Switch Apple Watch Case Style"
          >
            <Watch className="w-3.5 h-3.5 text-amber-400" />
            <span>{watchSize === 'ultra' ? 'Ultra 49mm' : 'Series 10'}</span>
          </button>

          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`p-2.5 rounded-xl border transition ${
              soundEnabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}
            title={soundEnabled ? 'Mute Haptic Chime' : 'Enable Haptic Chime'}
            aria-label="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content Grid: Left = Apple Watch Hardware Simulator | Right = Companion Controls */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
        {/* ===================================================================
            LEFT COLUMN: REALISTIC APPLE WATCH HARDWARE & OLED DISPLAY
        =================================================================== */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          {/* Interactive Instruction Pill */}
          <div className="mb-4 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800/90 text-xs text-zinc-400 shadow-sm">
            <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Drag compass dial to turn wrist • Scroll Crown for views</span>
          </div>

          {/* Apple Watch Assembly Wrapper */}
          <div
            className={`relative flex flex-col items-center select-none transition-transform duration-150 ${
              hapticPulse ? 'scale-[1.018]' : 'scale-100'
            }`}
          >
            {/* Top Watch Band Stub */}
            <div
              className={`w-44 sm:w-48 h-14 rounded-t-[28px] relative overflow-hidden transition-colors duration-300 ${
                watchSize === 'ultra'
                  ? 'bg-gradient-to-b from-zinc-800 via-zinc-850 to-zinc-900 border-x border-t border-zinc-700/60'
                  : 'bg-gradient-to-b from-zinc-900 via-zinc-900 to-black border-x border-t border-zinc-800'
              }`}
            >
              {/* Alpine / Sport Loop Texture */}
              <div
                className="absolute inset-0 opacity-25"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(255,255,255,0.08) 4px, rgba(255,255,255,0.08) 6px)',
                }}
              />
              {watchSize === 'ultra' && (
                <div className="absolute bottom-2 inset-x-8 h-1.5 rounded-full bg-amber-500/40" />
              )}
            </div>

            {/* Watch Metallic Chassis + Hardware Buttons */}
            <div className="relative flex items-center">
              {/* Left Action Button (Ultra Mode) */}
              {watchSize === 'ultra' && (
                <button
                  onClick={snapToQibla}
                  title="Action Button: Align Directly to Qibla"
                  className="w-2.5 h-16 -mr-1 rounded-l-md bg-gradient-to-b from-orange-400 via-orange-500 to-amber-600 border-y border-l border-orange-300/50 shadow-md hover:brightness-110 active:scale-95 transition z-0 cursor-pointer"
                />
              )}

              {/* Outer Titanium / Aluminum Bezel */}
              <div
                className={`relative w-[296px] h-[358px] sm:w-[316px] sm:h-[382px] p-[13px] transition-all duration-300 shadow-2xl ${
                  watchSize === 'ultra'
                    ? 'rounded-[62px] bg-gradient-to-br from-zinc-300 via-zinc-400 to-zinc-600 shadow-black/90 ring-1 ring-white/30'
                    : 'rounded-[68px] bg-gradient-to-br from-zinc-600 via-zinc-800 to-zinc-950 shadow-black/90 ring-1 ring-white/15'
                }`}
              >
                {/* Inner Chamfered Lip */}
                <div
                  className={`w-full h-full p-[5px] bg-black ${
                    watchSize === 'ultra' ? 'rounded-[50px]' : 'rounded-[56px]'
                  }`}
                >
                  {/* TRUE OLED SCREEN (#000000) */}
                  <div
                    className={`relative w-full h-full bg-black overflow-hidden flex flex-col justify-between ${
                      watchSize === 'ultra' ? 'rounded-[45px]' : 'rounded-[51px]'
                    }`}
                  >
                    {/* Ambient Alignment Glow Overlay */}
                    <div
                      className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
                        isAligned ? 'opacity-100' : 'opacity-0'
                      }`}
                      style={{
                        background:
                          'radial-gradient(circle at 50% 52%, rgba(16, 185, 129, 0.22) 0%, rgba(16, 185, 129, 0.04) 58%, transparent 80%)',
                      }}
                    />

                    {/* =======================================================
                        WATCHOS TOP STATUS BAR
                    ======================================================= */}
                    <div className="relative z-20 px-5 pt-3 pb-1 flex items-center justify-between text-[11px] font-semibold tracking-tight">
                      <button
                        onClick={() => cycleWatchScreen(1)}
                        className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Qibla</span>
                      </button>

                      {/* Page Indicator Dots */}
                      <div className="flex items-center gap-1">
                        {[0, 1, 2].map((idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveScreen(idx)}
                            aria-label={`Watch screen ${idx + 1}`}
                            className={`h-1 rounded-full transition-all ${
                              activeScreen === idx
                                ? 'w-3 bg-emerald-400'
                                : 'w-1 bg-zinc-700 hover:bg-zinc-500'
                            }`}
                          />
                        ))}
                      </div>

                      <span className="text-zinc-300 font-mono text-[11px]">{watchTime || '20:55'}</span>
                    </div>

                    {/* =======================================================
                        VIEW 0: INTERACTIVE QIBLA COMPASS DIAL
                    ======================================================= */}
                    {activeScreen === 0 && (
                      <div className="relative flex-1 flex flex-col items-center justify-between px-3 pb-3 pt-0.5">
                        {/* Top Fixed Lubber Line / Alignment Triangle */}
                        <div className="relative z-20 flex flex-col items-center -mb-1">
                          <div
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide transition-all duration-300 flex items-center gap-1 ${
                              isAligned
                                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/40 scale-105'
                                : 'bg-zinc-900/95 text-zinc-300 border border-zinc-800'
                            }`}
                          >
                            {isAligned ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                                <span>Aligned with Qibla</span>
                              </>
                            ) : (
                              <span>
                                {Math.abs(angleDiff) < 1
                                  ? '0°'
                                  : `${angleDiff > 0 ? 'Turn Right' : 'Turn Left'} ${Math.abs(
                                      Math.round(angleDiff)
                                    )}°`}
                              </span>
                            )}
                          </div>
                          {/* Lubber Pointer */}
                          <div
                            className={`w-0.5 h-2.5 mt-0.5 rounded-full transition-colors ${
                              isAligned ? 'bg-emerald-400 shadow-[0_0_8px_#10B981]' : 'bg-amber-400'
                            }`}
                          />
                        </div>

                        {/* Rotating Compass Dial */}
                        <div
                          ref={compassRef}
                          onMouseDown={handleCompassPointerDown}
                          onTouchStart={handleCompassPointerDown}
                          className="relative w-[224px] h-[224px] sm:w-[238px] sm:h-[238px] rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
                        >
                          {/* Outer Alignment Ring */}
                          <div
                            className={`absolute inset-0 rounded-full border-2 transition-all duration-300 ${
                              isAligned
                                ? 'border-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.55)]'
                                : 'border-zinc-800/90'
                            }`}
                          />

                          {/* Rotating Dial Plate (rotates by -heading so current heading is at top 12 o'clock) */}
                          <div
                            className="relative w-full h-full rounded-full transition-transform duration-75 ease-out"
                            style={{ transform: `rotate(${-heading}deg)` }}
                          >
                            {/* Degree Tick Marks */}
                            {compassTicks.map(({ deg, isMajor, isCardinal }) => (
                              <div
                                key={deg}
                                className="absolute inset-0 flex justify-center"
                                style={{ transform: `rotate(${deg}deg)` }}
                              >
                                <div
                                  className={`${
                                    deg === 0
                                      ? 'w-0.5 h-3 bg-rose-500'
                                      : isCardinal
                                      ? 'w-0.5 h-2.5 bg-zinc-300'
                                      : isMajor
                                      ? 'w-[1.5px] h-2 bg-zinc-500'
                                      : 'w-[1px] h-1.5 bg-zinc-700'
                                  } mt-1 rounded-full`}
                                />
                              </div>
                            ))}

                            {/* Cardinal Labels (N, E, S, W) */}
                            {[
                              { label: 'N', deg: 0, color: 'text-rose-500 font-bold' },
                              { label: 'E', deg: 90, color: 'text-zinc-400 font-semibold' },
                              { label: 'S', deg: 180, color: 'text-zinc-400 font-semibold' },
                              { label: 'W', deg: 270, color: 'text-zinc-400 font-semibold' },
                            ].map((item) => (
                              <div
                                key={item.label}
                                className="absolute inset-0 flex justify-center"
                                style={{ transform: `rotate(${item.deg}deg)` }}
                              >
                                <span
                                  className={`mt-4 text-[11px] tracking-wider ${item.color}`}
                                  style={{
                                    transform: `rotate(${heading - item.deg}deg)`,
                                  }}
                                >
                                  {item.label}
                                </span>
                              </div>
                            ))}

                            {/* Qibla Bearing Ray & Kaaba Marker on Compass Perimeter */}
                            <div
                              className="absolute inset-0 flex flex-col items-center"
                              style={{ transform: `rotate(${qiblaBearing}deg)` }}
                            >
                              {/* Kaaba Icon at Perimeter */}
                              <div
                                className={`-mt-2.5 p-1 rounded-full transition-transform duration-300 ${
                                  isAligned ? 'scale-125' : 'scale-100'
                                }`}
                                style={{
                                  transform: `rotate(${heading - qiblaBearing}deg)`,
                                }}
                              >
                                <KaabaIcon size={24} glowing={isAligned} />
                              </div>

                              {/* Glowing Qibla Pointer Beam from Center to Kaaba */}
                              <div
                                className={`w-[3px] h-[72px] rounded-full transition-all duration-300 ${
                                  isAligned
                                    ? 'bg-gradient-to-t from-emerald-500/20 via-emerald-400 to-emerald-300 shadow-[0_0_12px_#10B981]'
                                    : 'bg-gradient-to-t from-amber-500/10 via-amber-400/80 to-amber-300'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Center Digital Readout Hub (Fixed Upright) */}
                          <div
                            className={`absolute w-24 h-24 rounded-full bg-zinc-950/95 border flex flex-col items-center justify-center shadow-inner transition-colors ${
                              isAligned ? 'border-emerald-500/60' : 'border-zinc-800'
                            }`}
                          >
                            <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-medium">
                              Heading
                            </span>
                            <div className="flex items-baseline gap-0.5">
                              <span
                                className={`text-2xl font-bold tracking-tight tabular-nums ${
                                  isAligned ? 'text-emerald-400' : 'text-white'
                                }`}
                              >
                                {Math.round(heading)}°
                              </span>
                              <span className="text-[10px] font-semibold text-amber-400">
                                {getCardinalDirection(heading)}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              Qibla {Math.round(qiblaBearing)}°
                            </span>
                          </div>
                        </div>

                        {/* Bottom Complication Pill: Location & Distance */}
                        <div className="w-full px-2 flex items-center justify-between gap-1.5">
                          <div className="flex-1 bg-zinc-900/90 border border-zinc-800/90 rounded-2xl px-2.5 py-1.5 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="text-[10px] text-zinc-200 font-medium truncate">
                                {locationLabel.split(',')[0]}
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold text-amber-400 tabular-nums shrink-0 ml-1">
                              {formattedDistance}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* =======================================================
                        VIEW 1: TELEMETRY, COORDINATES & PRAYER COUNTDOWN
                    ======================================================= */}
                    {activeScreen === 1 && (
                      <div className="flex-1 px-4 py-2 flex flex-col justify-between overflow-y-auto">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-emerald-400">
                              Mecca Telemetry
                            </span>
                            <KaabaIcon size={18} glowing />
                          </div>

                          {/* Distance Card */}
                          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-2.5 mb-2">
                            <div className="text-[10px] text-zinc-400 uppercase tracking-wider">
                              Great-Circle Distance
                            </div>
                            <div className="text-xl font-bold text-white tabular-nums mt-0.5">
                              {formattedDistance}
                            </div>
                            <div className="text-[10px] text-emerald-400 mt-0.5">
                              Bearing: {qiblaBearing.toFixed(1)}° {getCardinalDirection(qiblaBearing)}
                            </div>
                          </div>

                          {/* Coordinates Pill */}
                          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-2.5 mb-2">
                            <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                              <span>Current Fix</span>
                              <span className="text-zinc-300 font-medium truncate max-w-[115px]">
                                {locationLabel}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-zinc-300">
                              <div className="bg-black/60 rounded-lg px-2 py-1">
                                LAT {coords.lat.toFixed(2)}°
                              </div>
                              <div className="bg-black/60 rounded-lg px-2 py-1">
                                LNG {coords.lng.toFixed(2)}°
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Next Prayer Complication */}
                        <div className="bg-gradient-to-r from-emerald-950/80 to-zinc-900 border border-emerald-500/30 rounded-2xl px-3 py-2 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                              <Clock className="w-3 h-3" />
                              <span>Next: {nextPrayerInfo.name}</span>
                            </div>
                            <div className="text-xs font-bold text-white">
                              {nextPrayerInfo.timeStr}{' '}
                              <span className="text-[10px] font-normal text-zinc-400">
                                ({nextPrayerInfo.countdown})
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setActiveScreen(0)}
                            className="px-2 py-1 rounded-xl bg-emerald-500 text-black text-[10px] font-bold"
                          >
                            Compass
                          </button>
                        </div>
                      </div>
                    )}

                    {/* =======================================================
                        VIEW 2: WATCH CALIBRATION & QUICK SETTINGS
                    ======================================================= */}
                    {activeScreen === 2 && (
                      <div className="flex-1 px-4 py-2 flex flex-col justify-between">
                        <div>
                          <div className="text-xs font-semibold text-amber-400 mb-2">
                            Watch Settings
                          </div>

                          <div className="space-y-2">
                            {/* Units Toggle */}
                            <button
                              onClick={() => setUseMiles((m) => !m)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-3 py-2 flex items-center justify-between text-left"
                            >
                              <div>
                                <div className="text-[11px] font-medium text-white">Distance Unit</div>
                                <div className="text-[9px] text-zinc-400">
                                  {useMiles ? 'Imperial (Miles)' : 'Metric (Kilometers)'}
                                </div>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-zinc-800 text-emerald-400">
                                {useMiles ? 'MI' : 'KM'}
                              </span>
                            </button>

                            {/* True North Toggle */}
                            <button
                              onClick={() => setTrueNorthMode((t) => !t)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-3 py-2 flex items-center justify-between text-left"
                            >
                              <div>
                                <div className="text-[11px] font-medium text-white">True North</div>
                                <div className="text-[9px] text-zinc-400">
                                  Geodetic spherical bearing
                                </div>
                              </div>
                              <div
                                className={`w-8 h-4.5 rounded-full p-0.5 transition ${
                                  trueNorthMode ? 'bg-emerald-500' : 'bg-zinc-700'
                                }`}
                              >
                                <div
                                  className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                                    trueNorthMode ? 'translate-x-3.5' : 'translate-x-0'
                                  }`}
                                />
                              </div>
                            </button>

                            {/* Haptic Chime Toggle */}
                            <button
                              onClick={() => setSoundEnabled((s) => !s)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-3 py-2 flex items-center justify-between text-left"
                            >
                              <div>
                                <div className="text-[11px] font-medium text-white">Haptic Chime</div>
                                <div className="text-[9px] text-zinc-400">
                                  Pulse on ±3° Qibla lock
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                                  soundEnabled
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-zinc-800 text-zinc-500'
                                }`}
                              >
                                {soundEnabled ? 'ON' : 'OFF'}
                              </span>
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            snapToQibla();
                            setActiveScreen(0);
                          }}
                          className="w-full py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] transition"
                        >
                          Calibrate & Lock Qibla
                        </button>
                      </div>
                    )}

                    {/* Subtle OLED Glass Glare Highlight */}
                    <div
                      className="absolute inset-0 pointer-events-none opacity-20"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 38%)',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Right Hardware Controls: Digital Crown + Side Button */}
              <div className="flex flex-col items-start -ml-1 z-20 gap-5">
                {/* Interactive Digital Crown */}
                <div className="relative group flex items-center">
                  <div
                    ref={crownRef}
                    onWheel={handleCrownWheel}
                    onMouseDown={handleCrownPointerDown}
                    onTouchStart={handleCrownPointerDown}
                    onClick={() => cycleWatchScreen(1)}
                    title="Scroll or Drag Digital Crown to switch watch views"
                    className={`w-4 h-14 rounded-r-lg border-y border-r cursor-ns-resize shadow-lg flex flex-col justify-evenly py-1.5 px-0.5 transition-transform active:scale-95 ${
                      watchSize === 'ultra'
                        ? 'bg-gradient-to-r from-zinc-400 via-zinc-300 to-zinc-500 border-zinc-200'
                        : 'bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-800 border-zinc-500'
                    }`}
                  >
                    {/* Crown Knurling Grooves */}
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-full h-[1.5px] bg-black/50 rounded-full transition-transform"
                        style={{
                          transform: `translateY(${Math.sin((crownRotation + i * 30) * 0.05) * 1}px)`,
                        }}
                      />
                    ))}
                    {/* Orange Accent Ring on Ultra */}
                    {watchSize === 'ultra' && (
                      <div className="absolute inset-y-1.5 left-0.5 w-[2px] bg-orange-500 rounded-full" />
                    )}
                  </div>

                  {/* Crown Helper Buttons for easy clicking */}
                  <div className="ml-2 flex flex-col gap-1">
                    <button
                      onClick={() => cycleWatchScreen(-1)}
                      className="p-1 rounded-md bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition"
                      title="Scroll Crown Up"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => cycleWatchScreen(1)}
                      className="p-1 rounded-md bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition"
                      title="Scroll Crown Down"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Hardware Side Button (Cycles Views / Quick Action) */}
                <button
                  onClick={() => cycleWatchScreen(1)}
                  title="Side Button: Switch Watch View"
                  className={`w-2.5 h-16 rounded-r-md border-y border-r shadow-md transition active:scale-95 ${
                    watchSize === 'ultra'
                      ? 'bg-gradient-to-r from-zinc-400 to-zinc-500 border-zinc-300'
                      : 'bg-gradient-to-r from-zinc-700 to-zinc-800 border-zinc-600'
                  }`}
                />
              </div>
            </div>

            {/* Bottom Watch Band Stub */}
            <div
              className={`w-44 sm:w-48 h-14 rounded-b-[28px] relative overflow-hidden transition-colors duration-300 ${
                watchSize === 'ultra'
                  ? 'bg-gradient-to-t from-zinc-800 via-zinc-850 to-zinc-900 border-x border-b border-zinc-700/60'
                  : 'bg-gradient-to-t from-zinc-900 via-zinc-900 to-black border-x border-b border-zinc-800'
              }`}
            >
              <div
                className="absolute inset-0 opacity-25"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(255,255,255,0.08) 4px, rgba(255,255,255,0.08) 6px)',
                }}
              />
            </div>
          </div>
        </div>

        {/* ===================================================================
            RIGHT COLUMN: COMPANION SIMULATOR & LOCATION CONTROLS
        =================================================================== */}
        <div className="lg:col-span-6 space-y-5">
          {/* Card 1: Wrist Heading & Orientation Simulator */}
          <div className="bg-zinc-900/70 backdrop-blur-md border border-zinc-800/90 rounded-3xl p-5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Wrist Heading Simulator</h2>
                  <p className="text-xs text-zinc-400">
                    Rotate your wrist 360° or use live device sensors
                  </p>
                </div>
              </div>

              <button
                onClick={snapToQibla}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Align to Qibla ({Math.round(qiblaBearing)}°)</span>
              </button>
            </div>

            {/* Interactive Heading Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Simulated Compass Bearing</span>
                <span className="font-mono font-bold text-white bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                  {heading.toFixed(1)}° {getCardinalDirection(heading)}
                </span>
              </div>

              <div className="relative flex items-center">
                <input
                  type="range"
                  min="0"
                  max="359.9"
                  step="0.5"
                  value={heading}
                  onChange={(e) => {
                    setUseDeviceSensors(false);
                    setHeading(parseFloat(e.target.value));
                  }}
                  aria-label="Simulated Wrist Heading"
                  className="w-full h-2.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Cardinal Quick-Jump Buttons & Real Sensor Button */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  {[
                    { label: 'N 0°', deg: 0 },
                    { label: 'E 90°', deg: 90 },
                    { label: 'S 180°', deg: 180 },
                    { label: 'W 270°', deg: 270 },
                  ].map((dir) => (
                    <button
                      key={dir.label}
                      onClick={() => {
                        setUseDeviceSensors(false);
                        setHeading(dir.deg);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-medium text-zinc-300 transition"
                    >
                      {dir.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={toggleDeviceSensors}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition ${
                    useDeviceSensors
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{useDeviceSensors ? 'Sensors Active' : 'Use Phone Compass'}</span>
                </button>
              </div>

              {sensorStatus && (
                <p className="text-[11px] text-amber-400/90 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>{sensorStatus}</span>
                </p>
              )}
            </div>
          </div>

          {/* Card 2: Location Selector & GPS */}
          <div className="bg-zinc-900/70 backdrop-blur-md border border-zinc-800/90 rounded-3xl p-5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Your Location</h2>
                  <p className="text-xs text-zinc-400">
                    Test Qibla bearing from anywhere in the world
                  </p>
                </div>
              </div>

              <button
                onClick={handleUseCurrentLocation}
                disabled={gpsStatus === 'loading'}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition cursor-pointer"
              >
                <Crosshair className={`w-3.5 h-3.5 ${gpsStatus === 'loading' ? 'animate-spin' : ''}`} />
                <span>{gpsStatus === 'loading' ? 'Locating...' : 'Use Live GPS'}</span>
              </button>
            </div>

            {gpsMessage && (
              <div
                className={`mb-3 px-3 py-2 rounded-xl text-xs flex items-center gap-2 border ${
                  gpsStatus === 'error'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}
              >
                <Navigation className="w-3.5 h-3.5 shrink-0" />
                <span>{gpsMessage}</span>
              </div>
            )}

            {/* Preset Global Cities Grid */}
            <div className="mb-4">
              <div className="text-[11px] font-medium text-zinc-400 mb-2">Quick City Presets</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESET_CITIES.map((city) => {
                  const active = selectedCityId === city.id;
                  return (
                    <button
                      key={city.id}
                      onClick={() => handleSelectCity(city)}
                      className={`px-3 py-2 rounded-xl border text-left transition flex flex-col ${
                        active
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                          : 'bg-zinc-950/80 hover:bg-zinc-800/80 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <span className="text-xs font-semibold truncate">{city.short}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {Math.round(calculateQiblaBearing(city.lat, city.lng))}° Qibla
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Latitude / Longitude Form */}
            <form onSubmit={handleApplyCustomCoords} className="pt-2 border-t border-zinc-800/80">
              <div className="text-[11px] font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
                <Sliders className="w-3 h-3 text-amber-400" />
                <span>Custom Coordinates</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-4">
                  <label className="sr-only">Latitude</label>
                  <input
                    type="text"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    placeholder="Latitude (e.g. 25.2048)"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:outline-none text-xs font-mono text-white"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="sr-only">Longitude</label>
                  <input
                    type="text"
                    value={customLng}
                    onChange={(e) => setCustomLng(e.target.value)}
                    placeholder="Longitude (e.g. 55.2708)"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:outline-none text-xs font-mono text-white"
                  />
                </div>
                <div className="sm:col-span-4">
                  <button
                    type="submit"
                    className="w-full h-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition"
                  >
                    Set Coordinates
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Card 3: Live Geodetic Summary Footer */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3.5">
              <div className="text-[11px] text-zinc-400">Qibla Bearing</div>
              <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">
                {qiblaBearing.toFixed(1)}°
              </div>
              <div className="text-[10px] text-zinc-500">
                {getCardinalDirection(qiblaBearing)} from True North
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3.5">
              <div className="text-[11px] text-zinc-400">Distance to Kaaba</div>
              <div className="text-lg font-bold text-white font-mono mt-0.5">
                {formattedDistance}
              </div>
              <div className="text-[10px] text-zinc-500">Great-circle arc</div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3.5">
              <div className="text-[11px] text-zinc-400">Alignment Status</div>
              <div
                className={`text-sm font-bold mt-1 ${
                  isAligned ? 'text-emerald-400' : 'text-zinc-300'
                }`}
              >
                {isAligned ? 'Locked (±3°)' : `${Math.abs(Math.round(angleDiff))}° Off`}
              </div>
              <div className="text-[10px] text-zinc-500">
                {isAligned ? 'Facing Mecca' : 'Rotate wrist'}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}