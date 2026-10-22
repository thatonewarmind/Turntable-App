import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  Disc, 
  Sparkles, 
  CloudRain, 
  Radio, 
  Link as LinkIcon, 
  Unlink, 
  ListMusic, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Search,
  X
} from 'lucide-react';

const VINYL_PALETTES = [
  { color: '#1c1917', labelBg: '#b45309' }, // Warm Ochre
  { color: '#262626', labelBg: '#991b1b' }, // Rust Red
  { color: '#172554', labelBg: '#0f766e' }, // Forest Teal
  { color: '#1c1917', labelBg: '#78350f' }, // Saddle Brown
  { color: '#27272a', labelBg: '#4d7c0f' }, // Olive Green
  { color: '#1e1b4b', labelBg: '#a21caf' }, // Dusty Plum
];

const INITIAL_TRACKS = [
  { 
    id: '0VjIjW4GlUZAMYd2vXMi3b', 
    title: 'Blinding Lights', 
    artist: 'The Weeknd', 
    duration: '3:20', 
    uri: 'spotify:track:0VjIjW4GlUZAMYd2vXMi3b', 
    color: '#1c1917', 
    labelBg: '#b45309' 
  },
  { 
    id: '7MXVkk9YM5IZxh0wAE23mn', 
    title: 'Starboy', 
    artist: 'The Weeknd', 
    duration: '3:50', 
    uri: 'spotify:track:7MXVkk9YM5IZxh0wAE23mn', 
    color: '#262626', 
    labelBg: '#991b1b' 
  },
  { 
    id: '0wXuerDYiDFV2v5f5x0910', 
    title: 'Redbone', 
    artist: 'Childish Gambino', 
    duration: '5:26', 
    uri: 'spotify:track:0wXuerDYiDFV2v5f5x0910', 
    color: '#172554', 
    labelBg: '#0f766e' 
  },
];

export default function RetroVinylTurntable() {
  // Deck States: IDLE, CUEING, PLAYING, SWAPPING, RETURNING
  const [deckState, setDeckState] = useState('IDLE');
  const [tracks, setTracks] = useState(INITIAL_TRACKS);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [targetTrackIndex, setTargetTrackIndex] = useState(null);
  const [isSwappingDisc, setIsSwappingDisc] = useState(false);

  // Carousel & Search states
  const [browseIndex, setBrowseIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTracks = tracks
    .map((track, originalIndex) => ({ ...track, originalIndex }))
    .filter(
      (track) =>
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleNextVinyl = () => {
    setBrowseIndex((prev) => Math.min(filteredTracks.length - 1, prev + 1));
  };

  const handlePrevVinyl = () => {
    setBrowseIndex((prev) => Math.max(0, prev - 1));
  };

  // Turntable Physical Attributes
  const [selectedRpm, setSelectedRpm] = useState(33);
  const [pitchOffset, setPitchOffset] = useState(0);
  const [armElevated, setArmElevated] = useState(false);
  const [armAngle, setArmAngle] = useState(0);
  const [needleOnGroove, setNeedleOnGroove] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);

  // Spotify Embed State
  const [playlistInput, setPlaylistInput] = useState('');
  const [spotifyEmbedReady, setSpotifyEmbedReady] = useState(false);
  const spotifyControllerRef = useRef(null);
  const spotifyContainerRef = useRef(null);

  // Ambient Layer States
  const [tandemMode, setTandemMode] = useState(true);
  const [ambientCrackle, setAmbientCrackle] = useState(0.40);
  const [ambientRain, setAmbientRain] = useState(0.15);
  const [ambientHum, setAmbientHum] = useState(0.10);
  const [masterVolume, setMasterVolume] = useState(0.85);

  // Audio Context & Physics Refs
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const crackleGainRef = useRef(null);
  const rainGainRef = useRef(null);
  const humGainRef = useRef(null);

  const targetArmAngleRef = useRef(0);
  const animFrameRef = useRef(null);
  const currentTrack = tracks[activeTrackIndex] || tracks[0];

  // 1. Initialize Web Audio API for Needle drops and Ambience
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(masterVolume, ctx.currentTime);
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;

      // Dust Crackle
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        const pop = Math.random() > 0.998 ? (Math.random() > 0.5 ? 0.9 : -0.9) : 0;
        output[i] = white * 0.08 + pop;
      }
      const crackleSource = ctx.createBufferSource();
      crackleSource.buffer = noiseBuffer;
      crackleSource.loop = true;
      const crackleFilter = ctx.createBiquadFilter();
      crackleFilter.type = 'bandpass';
      crackleFilter.frequency.setValueAtTime(2200, ctx.currentTime);
      const crackleGain = ctx.createGain();
      crackleGain.gain.setValueAtTime(0, ctx.currentTime);
      crackleSource.connect(crackleFilter);
      crackleFilter.connect(crackleGain);
      crackleGain.connect(masterGain);
      crackleSource.start();
      crackleGainRef.current = crackleGain;

      // Window Rain
      const rainBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const rainData = rainBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        rainData[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = rainData[i];
        rainData[i] *= 3.5;
      }
      const rainSource = ctx.createBufferSource();
      rainSource.buffer = rainBuffer;
      rainSource.loop = true;
      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.setValueAtTime(800, ctx.currentTime);
      const rainGain = ctx.createGain();
      rainGain.gain.setValueAtTime(0, ctx.currentTime);
      rainSource.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(masterGain);
      rainSource.start();
      rainGainRef.current = rainGain;

      // 60Hz Amp Warmth
      const humOsc = ctx.createOscillator();
      humOsc.type = 'triangle';
      humOsc.frequency.setValueAtTime(60, ctx.currentTime);
      const humGain = ctx.createGain();
      humGain.gain.setValueAtTime(0, ctx.currentTime);
      humOsc.connect(humGain);
      humGain.connect(masterGain);
      humOsc.start();
      humGainRef.current = humGain;
    }

    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const triggerNeedleThump = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 0.12);
    thumpGain.gain.setValueAtTime(0.45, ctx.currentTime);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.connect(thumpGain);
    thumpGain.connect(masterGainRef.current);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  };

  // 2. Initialize Spotify Embed Controller with Autoplay permissions
  useEffect(() => {
    const initSpotify = () => {
      if (!window.SpotifyIframeApi || !spotifyContainerRef.current) return;
      
      const element = spotifyContainerRef.current;
      element.innerHTML = ''; 

      const targetUri = (currentTrack && currentTrack.uri) 
        ? currentTrack.uri 
        : 'spotify:track:0VjIjW4GlUZAMYd2vXMi3b';

      const options = {
        width: '100%',
        height: '152',
        uri: targetUri
      };

      window.SpotifyIframeApi.createController(element, options, (EmbedController) => {
        spotifyControllerRef.current = EmbedController;
        setSpotifyEmbedReady(true);

        const iframe = element.querySelector('iframe');
        if (iframe) {
          iframe.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture');
        }
      });
    };

    if (window.SpotifyIframeApi) {
      initSpotify();
    } else {
      window.onSpotifyIframeApiReady = (IFrameAPI) => {
        window.SpotifyIframeApi = IFrameAPI;
        initSpotify();
      };
    }
  }, []);

  // Resilient Live Track Synchronizer for Spotify Embed
  useEffect(() => {
    if (!currentTrack?.uri) return;

    if (spotifyControllerRef.current && typeof spotifyControllerRef.current.loadUri === 'function') {
      try {
        spotifyControllerRef.current.loadUri(currentTrack.uri);
      } catch (err) {
        console.warn('Controller loadUri error:', err);
      }
    }

    const container = spotifyContainerRef.current;
    if (container) {
      const iframe = container.querySelector('iframe');
      if (iframe && currentTrack.id) {
        const expectedSrc = `https://open.spotify.com/embed/track/${currentTrack.id}?utm_source=generator`;
        if (!iframe.src.includes(currentTrack.id)) {
          iframe.src = expectedSrc;
        }
      }
    }
  }, [currentTrack]);

  // 3. Ambient Sync Automation
  useEffect(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    const shouldPlay = tandemMode ? (deckState === 'PLAYING' && needleOnGroove && !armElevated) : true;

    if (crackleGainRef.current) {
      crackleGainRef.current.gain.setTargetAtTime(shouldPlay ? ambientCrackle * 0.7 : 0, now, 0.3);
    }
    if (rainGainRef.current) {
      rainGainRef.current.gain.setTargetAtTime(shouldPlay ? ambientRain * 0.5 : 0, now, 0.3);
    }
    if (humGainRef.current) {
      humGainRef.current.gain.setTargetAtTime(shouldPlay ? ambientHum * 0.3 : 0, now, 0.3);
    }
  }, [tandemMode, deckState, needleOnGroove, armElevated, ambientCrackle, ambientRain, ambientHum]);

  // 4. Start / Stop Button Handler
  const handleStartStop = () => {
    initAudio();

    if (deckState === 'IDLE' || deckState === 'RETURNING') {
      setDeckState('CUEING');
      setArmElevated(true);
      targetArmAngleRef.current = 24;
    } else {
      setDeckState('RETURNING');
      setArmElevated(true);
      setNeedleOnGroove(false);
      targetArmAngleRef.current = 0;
      if (spotifyControllerRef.current) {
        try {
          spotifyControllerRef.current.pause();
        } catch (e) {}
      }
    }
  };

  // 5. Track Selection & Disc Swapping Sequence
  const handleSelectTrack = (index) => {
    if (index === activeTrackIndex && deckState === 'PLAYING') return;
    initAudio();

    const selectedTrack = tracks[index];
    setActiveTrackIndex(index);

    if (spotifyControllerRef.current && selectedTrack?.uri) {
      try {
        spotifyControllerRef.current.loadUri(selectedTrack.uri);
      } catch (e) {}
    }

    if (deckState === 'IDLE') {
      setDeckState('CUEING');
      setArmElevated(true);
      targetArmAngleRef.current = 24;
      return;
    }

    if (spotifyControllerRef.current) {
      try {
        spotifyControllerRef.current.pause();
      } catch (e) {}
    }
    setDeckState('SWAPPING');
    setArmElevated(true);
    setNeedleOnGroove(false);
    targetArmAngleRef.current = 0;
    setTargetTrackIndex(index);
  };

  // 6. Execute Record Swap Animation once arm returns to rest
  useEffect(() => {
    if (deckState === 'SWAPPING' && armAngle <= 0.5 && targetTrackIndex !== null) {
      setIsSwappingDisc(true);

      const swapTimer = setTimeout(() => {
        const nextTrack = tracks[targetTrackIndex];
        setActiveTrackIndex(targetTrackIndex);
        if (spotifyControllerRef.current && nextTrack?.uri) {
          try {
            spotifyControllerRef.current.loadUri(nextTrack.uri);
          } catch (e) {}
        }

        setIsSwappingDisc(false);
        setTargetTrackIndex(null);

        setDeckState('CUEING');
        setArmElevated(true);
        targetArmAngleRef.current = 24;
      }, 1000);

      return () => clearTimeout(swapTimer);
    }
  }, [deckState, armAngle, targetTrackIndex, tracks]);

  // 7. Mechanical Animation Frame (Platter & Arm Kinematics)
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (currentTime) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (deckState === 'PLAYING' || deckState === 'CUEING') {
        const rpm = selectedRpm * (1 + pitchOffset / 100);
        const degPerSec = (rpm * 360) / 60;
        setRotationAngle(prev => (prev + degPerSec * dt) % 360);
      }

      setArmAngle(prev => {
        const target = targetArmAngleRef.current;
        const diff = target - prev;

        if (Math.abs(diff) < 0.1) {
          if (deckState === 'CUEING' && diff >= 0) {
            setDeckState('PLAYING');
            setArmElevated(false);
            setNeedleOnGroove(true);
            triggerNeedleThump();

            if (spotifyControllerRef.current) {
              if (typeof spotifyControllerRef.current.play === 'function') {
                spotifyControllerRef.current.play();
              } else if (typeof spotifyControllerRef.current.resume === 'function') {
                spotifyControllerRef.current.resume();
              }
            }
          } else if (deckState === 'RETURNING') {
            setDeckState('IDLE');
            setArmElevated(false);
            setNeedleOnGroove(false);
          }
          return target;
        }
        return prev + diff * Math.min(dt * 3.8, 1);
      });

      if (deckState === 'PLAYING' && needleOnGroove && !armElevated) {
        targetArmAngleRef.current = Math.min(52, targetArmAngleRef.current + dt * 0.15);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [deckState, needleOnGroove, armElevated, selectedRpm, pitchOffset]);

  // 8. Custom Playlist URL loader via local Vite dev proxy
  const handleLoadCustomPlaylist = async (e) => {
    e.preventDefault();
    const cleanUrl = playlistInput.split('?')[0];
    const match = cleanUrl.match(/playlist[\/:]([a-zA-Z0-9]+)/);

    if (!match) {
      alert('Please enter a valid Spotify Playlist link.');
      return;
    }
    const playlistId = match[1];

    try {
      const res = await fetch(`/spotify-embed/embed/playlist/${playlistId}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const htmlText = await res.text();

      const doc = new DOMParser().parseFromString(htmlText, 'text/html');
      const scriptTag = doc.getElementById('__NEXT_DATA__') || doc.getElementById('initial-state');

      let parsedTracks = [];

      if (scriptTag && scriptTag.textContent) {
        const jsonData = JSON.parse(scriptTag.textContent);
        const entity = jsonData?.props?.pageProps?.state?.data?.entity 
                    || jsonData?.props?.pageProps?.entity;
        const rawTracks = entity?.trackList || entity?.tracks?.items || [];

        parsedTracks = rawTracks.map((item, idx) => {
          const t = item.track || item;
          const rawId = t.id || (t.uri ? t.uri.split(':').pop() : `track-${idx}`);
          const durationMs = t.duration || t.duration_ms || 180000;
          const mins = Math.floor(durationMs / 60000);
          const secs = Math.floor((durationMs % 60000) / 1000).toString().padStart(2, '0');
          const palette = VINYL_PALETTES[idx % VINYL_PALETTES.length];
          const trackUri = `spotify:track:${rawId}`;

          return {
            id: rawId,
            title: t.title || t.name || 'Untitled Track',
            artist: t.subtitle || (Array.isArray(t.artists) ? t.artists.map(a => a.name).join(', ') : 'Unknown Artist'),
            duration: `${mins}:${secs}`,
            uri: trackUri,
            color: palette.color,
            labelBg: palette.labelBg,
          };
        });
      }

      if (parsedTracks.length === 0) {
        const tokenRes = await fetch('/spotify-embed/get_access_token?reason=transport&productType=web_player');
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          if (tokenData?.accessToken) {
            const apiRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=30`, {
              headers: { 'Authorization': `Bearer ${tokenData.accessToken}` }
            });
            if (apiRes.ok) {
              const apiData = await apiRes.json();
              parsedTracks = (apiData.items || [])
                .filter(item => item?.track?.id)
                .map((item, idx) => {
                  const t = item.track;
                  const mins = Math.floor(t.duration_ms / 60000);
                  const secs = Math.floor((t.duration_ms % 60000) / 1000).toString().padStart(2, '0');
                  const palette = VINYL_PALETTES[idx % VINYL_PALETTES.length];
                  return {
                    id: t.id,
                    title: t.name,
                    artist: t.artists.map(a => a.name).join(', '),
                    duration: `${mins}:${secs}`,
                    uri: `spotify:track:${t.id}`,
                    color: palette.color,
                    labelBg: palette.labelBg,
                  };
                });
            }
          }
        }
      }

      if (parsedTracks.length === 0) {
        alert('Could not find tracks in this playlist.');
        return;
      }

      setTracks(parsedTracks);
      setSearchQuery('');
      setBrowseIndex(0);
      setActiveTrackIndex(0);
      setPlaylistInput('');

      if (spotifyControllerRef.current) {
        spotifyControllerRef.current.loadUri(parsedTracks[0].uri);
      }
      handleSelectTrack(0);

    } catch (err) {
      console.error('Playlist import error:', err);
      alert('Unable to load playlist tracks directly.');
    }
  };

  return (
    <main className="min-h-screen w-full bg-[#171210] text-[#e8dfd5] flex flex-col justify-between p-3 sm:p-5 md:p-8 select-none font-sans overflow-x-hidden">
      
      {/* Studio Header */}
      <header className="w-full max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 px-2">
        <div className="flex items-center gap-3.5 w-full sm:w-auto">
          <div className="p-2 sm:p-2.5 bg-[#2a1a14] border border-[#523326] rounded-xl shadow-md shrink-0">
            <Disc className="w-5 h-5 sm:w-6 sm:h-6 text-[#d97706] animate-pulse" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-[#f5ebe0] flex items-center gap-2.5 truncate font-serif">
              DUAL 1219 <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase bg-[#3f271d] text-[#f59e0b] px-2 py-0.5 rounded border border-[#78350f] shrink-0">Hi-Fi System</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-[#a8998c] font-mono tracking-wide truncate">Acoustic Precision • Walnut Plinth & Cream Enamel[cite: 5]</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#251b17] border border-[#442c22] text-xs font-mono text-[#d6c7b2] self-start sm:self-center shrink-0 shadow-inner">
          <span className={`w-2 h-2 rounded-full ${needleOnGroove && deckState === 'PLAYING' ? 'bg-[#d97706] shadow-[#d97706]/70 shadow-md animate-ping' : 'bg-[#5c4033]'}`} />
          {isSwappingDisc ? 'REPLACING DISC...' : deckState === 'PLAYING' ? 'NEEDLE ON GROOVE' : 'TONEARM RESTING'}
        </div>
      </header>

      {/* Main Mid-Century Turntable Console */}
      <section className="w-full max-w-[1360px] mx-auto rounded-2xl p-4 sm:p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.85)] relative border-4 border-[#3a2016] bg-gradient-to-b from-[#4a2b1f] via-[#351c14] to-[#25130d] ring-1 ring-[#78442e]/30 my-auto">
        
        {/* Brass Screws */}
        <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-gradient-to-br from-[#d4af37] to-[#785b12] shadow-sm border border-[#523d0a]" />
        <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-gradient-to-br from-[#d4af37] to-[#785b12] shadow-sm border border-[#523d0a]" />
        <div className="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-gradient-to-br from-[#d4af37] to-[#785b12] shadow-sm border border-[#523d0a]" />
        <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-gradient-to-br from-[#d4af37] to-[#785b12] shadow-sm border border-[#523d0a]" />

        {/* Cream Enamel Top Deck */}
        <div className="rounded-xl bg-[#ede6da] p-4 sm:p-6 md:p-8 shadow-[inset_0_3px_8px_rgba(0,0,0,0.35),0_4px_12px_rgba(0,0,0,0.5)] border-2 border-[#cfc4b2] relative overflow-hidden text-[#2c1d17]">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-center relative z-10">
            
            {/* Platter & Vinyl Disc Area */}
            <div className="lg:col-span-8 flex justify-center items-center relative w-full py-2">
              <div 
                className="w-full max-w-[min(90vw,450px)] aspect-square rounded-full bg-[#1c1917] p-3 shadow-[0_12px_28px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.1)] border-4 border-[#3a3532] flex items-center justify-center relative"
              >
                {/* Brass Strobe Dot */}
                <div className="absolute top-3 left-3 w-3 h-3 bg-[#eab308] rounded-full shadow-[0_0_8px_#ca8a04] border border-[#a16207] z-10" />

                {/* Rotating Vinyl Disc */}
                <div 
                  style={{
                    transform: `rotate(${rotationAngle}deg) ${isSwappingDisc ? 'scale(0.85) translateY(-40px)' : 'scale(1) translateY(0px)'}`,
                    opacity: isSwappingDisc ? 0.2 : 1,
                    transition: 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease',
                    backgroundColor: currentTrack.color
                  }}
                  className="w-full h-full rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.9)] relative flex items-center justify-center overflow-hidden"
                >
                  <div className="absolute inset-[3%] rounded-full border border-white/5" />
                  <div className="absolute inset-[8%] rounded-full border border-white/5" />
                  <div className="absolute inset-[15%] rounded-full border border-white/5" />
                  <div className="absolute inset-[24%] rounded-full border border-white/5" />
                  <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.06)_60deg,transparent_120deg,rgba(255,255,255,0.06)_240deg,transparent_300deg)] rounded-full pointer-events-none" />

                  {/* Matte Center Label */}
                  <div 
                    style={{ backgroundColor: currentTrack.labelBg }}
                    className="w-[32%] h-[32%] min-w-[85px] min-h-[85px] rounded-full shadow-inner border-2 border-[#2b1810] flex flex-col items-center justify-center p-2 text-center pointer-events-none relative"
                  >
                    <div className="w-4 h-4 rounded-full bg-[#1c1917] border-2 border-[#d4af37] shadow-inner z-20" />
                    <div className="mt-1 text-[9px] sm:text-[10px] font-bold tracking-tight text-[#fdf6e2] truncate max-w-[80%] font-serif">
                      {currentTrack.title}
                    </div>
                    <div className="text-[7px] text-[#e2d5c3] truncate max-w-[80%] hidden sm:block font-mono">
                      {currentTrack.artist}
                    </div>
                    <div className="text-[6.5px] sm:text-[7.5px] text-[#fef3c7] font-mono tracking-widest uppercase mt-0.5 border-t border-[#fef3c7]/30 pt-0.5">
                      33⅓ RPM • STEREO
                    </div>
                  </div>
                </div>

                {/* Tonearm Assembly */}
                <div 
                  className="absolute top-2 right-2 sm:right-6 w-16 sm:w-20 md:w-24 h-[75%] pointer-events-none z-30"
                  style={{
                    transformOrigin: '50% 15%',
                    transform: `rotate(${armAngle}deg)`,
                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-[#262220] border-2 border-[#8c7853] shadow-2xl flex items-center justify-center relative">
                    <div className="absolute -top-5 sm:-top-6 w-9 sm:w-11 h-8 rounded-sm bg-gradient-to-b from-[#3a3532] to-[#1c1917] border border-[#786341] shadow-md flex items-center justify-center text-[7px] sm:text-[8px] font-mono text-[#e8dfd5] font-bold">
                      1.8g
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#d4af37] to-[#785b12] border border-[#523d0a] flex items-center justify-center shadow-inner">
                      <div className="w-3 h-3 rounded-full bg-[#1c1917]" />
                    </div>
                  </div>

                  <div 
                    className={`w-2 sm:w-2.5 h-[70%] mx-auto rounded-full bg-gradient-to-r from-[#d1d5db] via-[#f3f4f6] to-[#9ca3af] shadow-xl transition-all duration-300 ${
                      armElevated ? 'translate-y-[-6px] brightness-105' : 'translate-y-0'
                    }`}
                  >
                    <div className="absolute -bottom-6 -left-2.5 sm:-bottom-7 sm:-left-3 w-7 sm:w-8 h-10 sm:h-11 bg-[#1a1817] rounded-b-sm border border-[#52453c] flex flex-col items-center justify-end pb-1 shadow-lg">
                      <div className="text-[6px] sm:text-[7px] font-mono text-[#d4af37] font-bold">SHURE</div>
                      <div className={`w-1 h-2 rounded-full ${needleOnGroove && !armElevated ? 'bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]' : 'bg-[#52453c]'}`} />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Deck Controls */}
            <div className="lg:col-span-4 flex flex-col justify-between h-full space-y-4">
              
              <div className="bg-[#dfd7c9] p-3.5 sm:p-4 rounded-xl border border-[#c4b9a5] shadow-inner space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-[#5c4a3d]">
                  <span className="font-bold">STATUS</span>
                  <span className="text-[#92400e] font-semibold">{needleOnGroove ? 'ENGAGED' : 'RESTING'}</span>
                </div>
                <div className="p-3 bg-[#ede6da] rounded-lg border border-[#c9beab] shadow-sm">
                  <div className="text-xs sm:text-sm font-bold text-[#2c1d17] truncate font-serif">{currentTrack.title}</div>
                  <div className="text-[10px] sm:text-xs text-[#786555] font-mono truncate">{currentTrack.artist} • {currentTrack.duration}</div>
                </div>
              </div>

              {/* Start / Stop Button */}
              <button
                onClick={handleStartStop}
                disabled={isSwappingDisc}
                className={`w-full py-3.5 sm:py-4 rounded-xl font-bold font-mono tracking-widest text-xs sm:text-sm flex items-center justify-center gap-2 sm:gap-3 shadow-md transition-all active:translate-y-0.5 border ${
                  deckState === 'IDLE' || deckState === 'RETURNING'
                    ? 'bg-gradient-to-b from-[#4d3327] to-[#301c13] hover:from-[#5c3e30] hover:to-[#3d2419] text-[#fde68a] border-[#6b4735] shadow-[#20120a]/60'
                    : 'bg-gradient-to-b from-[#831843] to-[#500724] hover:from-[#9d174d] text-white border-[#9d174d]/40 shadow-black/60'
                }`}
              >
                {deckState === 'IDLE' || deckState === 'RETURNING' ? (
                  <>
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current text-[#f59e0b]" /> CUE TONEARM
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 sm:w-5 sm:h-5 fill-current text-rose-300" /> RETURN ARM
                  </>
                )}
              </button>

            </div>

          </div>
        </div>
      </section>

      {/* Bottom Dashboard */}
      <footer className="w-full max-w-[1360px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 mt-4 sm:mt-6">
        
        {/* Record Crate Browser */}
        <div className="lg:col-span-7 bg-[#281b15] border-2 border-[#452b21] p-3 sm:p-5 rounded-xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <div className="flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-[#d97706] shrink-0" />
                <h3 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-[#e8dfd5] font-serif">Wooden Record Crate</h3>
              </div>
              
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="w-3.5 h-3.5 text-[#9c8979] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Browse albums..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setBrowseIndex(0);
                  }}
                  className="w-full bg-[#1b120e] border border-[#523326] rounded-md pl-8 pr-7 py-1.5 text-xs font-mono text-[#f5ebe0] placeholder:text-[#786354] focus:outline-none focus:border-[#d97706] transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setBrowseIndex(0);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9c8979] hover:text-[#f5ebe0]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <span className="text-[10px] font-mono text-[#a89584] shrink-0 self-end sm:self-center">
                {filteredTracks.length > 0 ? `${browseIndex + 1} of ${filteredTracks.length} LPs` : '0 LPs'}
              </span>
            </div>

            {/* Vintage Sleeve Card Deck */}
            <div className="relative h-40 sm:h-44 w-full bg-[#19110d] rounded-lg border border-[#3b2319] p-2 sm:p-4 flex items-center justify-center overflow-hidden shadow-inner">
              {filteredTracks.length > 0 ? (
                <div className="relative w-full max-w-sm h-full flex items-center justify-center">
                  {filteredTracks.map((track, idx) => {
                    const offset = idx - browseIndex;
                    if (Math.abs(offset) > 2) return null;

                    const isCenter = offset === 0;
                    const isActive = track.originalIndex === activeTrackIndex;

                    return (
                      <div
                        key={track.id}
                        onClick={() => {
                          setBrowseIndex(idx);
                          handleSelectTrack(track.originalIndex);
                        }}
                        style={{
                          transform: `translateX(${offset * 36}px) scale(${1 - Math.abs(offset) * 0.12}) rotate(${offset * 3}deg)`,
                          zIndex: 20 - Math.abs(offset),
                          opacity: 1 - Math.abs(offset) * 0.35,
                          backgroundColor: track.color,
                        }}
                        className={`absolute w-[85%] sm:w-72 h-28 sm:h-32 rounded-lg p-3 border shadow-2xl cursor-pointer transition-all duration-300 flex items-center justify-between select-none ${
                          isActive
                            ? 'border-[#d97706] ring-2 ring-[#d97706]/50'
                            : isCenter
                            ? 'border-[#854d0e] ring-1 ring-[#ca8a04]/40'
                            : 'border-[#452b21] hover:border-[#78442e]'
                        }`}
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#151312] border border-[#443831] shadow-lg flex items-center justify-center shrink-0">
                            <div className="absolute inset-1 rounded-full border border-white/5" />
                            <div
                              className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-[#261f1b] flex items-center justify-center"
                              style={{ backgroundColor: track.labelBg }}
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-[#151312]" />
                            </div>
                          </div>

                          <div className="overflow-hidden min-w-0">
                            <div className="text-xs font-bold text-[#f5ebe0] truncate max-w-[110px] sm:max-w-[130px] font-serif">
                              {track.title}
                            </div>
                            <div className="text-[10px] text-[#c7b5a3] truncate max-w-[110px] sm:max-w-[130px] font-mono">
                              {track.artist}
                            </div>
                            <div className="text-[9px] font-mono text-[#d97706] mt-0.5">
                              {track.duration}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {isActive ? (
                            <span className="text-[8px] sm:text-[9px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded bg-[#b45309] text-[#fef3c7] flex items-center gap-1 shadow-sm">
                              <CheckCircle2 className="w-3 h-3" /> ON TURNTABLE
                            </span>
                          ) : isCenter ? (
                            <span className="text-[8px] sm:text-[9px] font-mono px-1.5 sm:px-2 py-0.5 rounded bg-[#38231a] text-[#d6c7b2] border border-[#5c3829]">
                              SELECT
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-[#8c7665] font-mono flex flex-col items-center gap-1">
                  <span>No crate items found for "{searchQuery}"</span>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="text-[#d97706] underline hover:text-[#f59e0b] cursor-pointer"
                  >
                    Reset crate search
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handlePrevVinyl}
                disabled={browseIndex === 0 || filteredTracks.length <= 1}
                className="absolute left-2 z-30 p-1.5 sm:p-2 rounded-full bg-[#2a1a14]/90 hover:bg-[#3d271e] text-[#f5ebe0] border border-[#523326] disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextVinyl}
                disabled={browseIndex >= filteredTracks.length - 1 || filteredTracks.length <= 1}
                className="absolute right-2 z-30 p-1.5 sm:p-2 rounded-full bg-[#2a1a14]/90 hover:bg-[#3d271e] text-[#f5ebe0] border border-[#523326] disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          {/* Import Spotify Playlist Bar */}
          <form onSubmit={handleLoadCustomPlaylist} className="mt-3 sm:mt-4 pt-3 border-t border-[#452b21] flex gap-2">
            <input
              type="text"
              placeholder="Paste Spotify Playlist URL..."
              value={playlistInput}
              onChange={(e) => setPlaylistInput(e.target.value)}
              className="flex-1 min-w-0 bg-[#1b120e] border border-[#523326] rounded-md px-3 py-1.5 sm:py-2 text-xs font-mono text-[#f5ebe0] focus:outline-none focus:border-[#d97706]"
            />
            <button
              type="submit"
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#b45309] hover:bg-[#d97706] text-[#fef3c7] font-bold text-xs rounded-md font-mono transition-colors shrink-0 shadow-sm"
            >
              LOAD CRATE
            </button>
          </form>
        </div>

        {/* Vintage Stereo Amplifier & Acoustics Deck */}
        <div className="lg:col-span-5 bg-[#281b15] border-2 border-[#452b21] p-3 sm:p-5 rounded-xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-[#e8dfd5] font-serif">Pioneer Stereo Amp</h3>
              <button
                onClick={() => setTandemMode(!tandemMode)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border ${
                  tandemMode ? 'bg-[#78350f]/40 text-[#f59e0b] border-[#92400e]' : 'bg-[#1b120e] text-[#8c7665] border-[#442c22]'
                }`}
              >
                {tandemMode ? <LinkIcon className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
                {tandemMode ? 'TANDEM: ON' : 'MANUAL'}
              </button>
            </div>

            {/* Embedded Spotify Player Mount - Fixed height and container styling */}
            <div className="w-full min-h-[152px] h-[152px] rounded-lg overflow-hidden border border-[#523326] bg-[#140e0b] mb-3 sm:mb-4 shadow-inner flex items-center justify-center">
              <div ref={spotifyContainerRef} className="w-full h-full" />
            </div>

            {/* Ambient Controls */}
            <div className="space-y-2.5 sm:space-y-3">
              <div>
                <div className="flex justify-between text-xs font-mono text-[#b8a695] mb-1">
                  <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-[#d97706]" /> Vinyl Crackle & Dust</span>
                  <span>{Math.round(ambientCrackle * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={ambientCrackle} 
                  onChange={(e) => setAmbientCrackle(parseFloat(e.target.value))} 
                  className="w-full accent-[#d97706] bg-[#1b120e] h-1.5 rounded cursor-pointer" 
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono text-[#b8a695] mb-1">
                  <span className="flex items-center gap-1.5"><CloudRain className="w-3 h-3 text-[#78716c]" /> Rain Outside</span>
                  <span>{Math.round(ambientRain * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={ambientRain} 
                  onChange={(e) => setAmbientRain(parseFloat(e.target.value))} 
                  className="w-full accent-[#a8a29e] bg-[#1b120e] h-1.5 rounded cursor-pointer" 
                />
              </div>
            </div>
          </div>

          <div className="mt-3 sm:mt-4 pt-3 border-t border-[#452b21] text-[10px] sm:text-[11px] font-mono text-[#8c7665] flex items-center justify-between">
            <span>SOLID STATE RECEIVER</span>
            <span className="text-[#d97706]">ANALOG PASS</span>
          </div>
        </div>

      </footer>

    </main>
  );
}