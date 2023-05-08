import React, { useState } from "react";
import Head from "next/head";
import MicRecorder from "mic-recorder-to-mp3";
import * as Tone from "tone";
import { Player } from "tone";
import aubio, { Pitch } from "aubiojs";
import { ClipLoader } from "react-spinners";
import Container from "../components/Container";
import Button from "../components/Button";
import Dropdown from "../components/Dropdown";

export type Instrument = "piano" | "guitar" | "violin" | "flute" | "saxophone";
export type MusicalKey = "C" | "C#" | "D" | "D#" | "E" | "F" | "F#" | "G" | "G#" | "A" | "A#" | "B";
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function Home() {
  const [recording, setRecording] = useState(false);
  const [tempo, setTempo] = useState(120);
  const [beats, setBeats] = useState<number>(4);
  const [key, setKey] = useState("C");
  const [instrument, setInstrument] = useState("piano");
  const [recordedBuffer, setRecordedBuffer] = useState<AudioBuffer | null>(null);
  const [synthesizedBuffer, setSynthesizedBuffer] = useState<AudioBuffer | null>(null);
  const [processing, setProcessing] = useState(false);


  const Mp3Recorder = new MicRecorder({ bitRate: 128 });

  const synthesizeInstrument = async (
    inputBuffer: AudioBuffer | null,
    instrument: Instrument,
    key: MusicalKey,
    scale: string
  ): Promise<AudioBuffer | null> => {
    if (!inputBuffer) return null;
    // Adjust the inputBuffer based on the key and scale

    const player = new Tone.Player(inputBuffer);
    const synth = new Tone.Synth().toDestination();
    const notes: string[] = []; // Extract notes from the inputBuffer using Tone.js

    // Play the notes using the synth
    for (let note of notes) {
      synth.triggerAttackRelease(note, "8n");
      await new Promise<void>((resolve) => {
        Tone.Transport.scheduleOnce(() => {
          resolve();
        }, "8n");
      });
    }

    // Synthesize the instrument
    const sampler = new Tone.Sampler({
      urls: {
        [instrument]: `/instruments/${instrument}.mp3`,
      },
      onload: () => {
        sampler.releaseAll();
      },
    }).toDestination();

    const offlineContext = new OfflineAudioContext(player.buffer.numberOfChannels, player.buffer.duration * player.buffer.sampleRate, player.buffer.sampleRate);
    const offlinePlayer = new Tone.Player(inputBuffer).connect(offlineContext.destination);
    offlinePlayer.start();
    const renderedBuffer = await offlineContext.startRendering();

    for (let i = 0; i < player.buffer.duration; i += 0.1) {
      const note = notes[Math.floor(i * notes.length / player.buffer.duration)];
      const frequency = Tone.Frequency(note).toFrequency();
      sampler.triggerAttackRelease(frequency, "0.1", i);
      (await new Promise((resolve) => {
        (Tone.Transport as any).scheduleOnce(() => {
          resolve();
        }, "0.1", `+${i}`);
      })) as void;
    }

    return renderedBuffer;
  };

  const handleInstrumentChange = async (value: string): Promise<void> => {
    setInstrument(value as Instrument);
    if (recordedBuffer) {
      const synthesizedBuffer = await synthesizeInstrument(recordedBuffer, value as Instrument, key as MusicalKey, "major");
      if (synthesizedBuffer) {
        setSynthesizedBuffer(synthesizedBuffer);
        // Play the synthesizedBuffer
      }
    }
  };

  const getAveragePitch = (pitchArray: number[]): number => {
    const filteredPitches = pitchArray.filter((pitch) => pitch !== -1);
    const totalPitches = filteredPitches.reduce((sum, pitch) => sum + pitch, 0);
    return totalPitches / filteredPitches.length;
  };

  const getKeyFromPitch = (pitch: number): MusicalKey => {
    const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const midiNumber = Math.round(12 * (Math.log2(pitch / 440)) + 69);
    return noteStrings[midiNumber % 12] as MusicalKey;
  };

  const detectTempo = async (audioBuffer: AudioBuffer | null): Promise<number> => {
    if (!audioBuffer) return 0;
    const toneAudioBuffer = new Tone.ToneAudioBuffer(audioBuffer);
    const player = new Player(toneAudioBuffer);
    await player.sync().start(0);
    const bpm = await Tone.Transport.bpm.value;
    player.dispose();
    return bpm;
  };

  const analyzePitchAndKey = async (buffer: AudioBuffer | null): Promise<void> => {
    if (!buffer) return;
    try {
      const sampleRate = buffer.sampleRate;
      const pitchDetect = await aubio().then(({ Pitch }) => {
        return new Pitch("yin", 2048, 1024, sampleRate);
      });

      const channelData = buffer.getChannelData(0);
      const frameSize = 1024;
      const hopSize = 512;

      let pitchArray = [];

      for (let i = 0; i < channelData.length; i += hopSize) {
        const frame = channelData.slice(i, i + frameSize);
        const pitch = pitchDetect.do(frame);
        pitchArray.push(pitch);
      }

      const averagePitch = getAveragePitch(pitchArray);
      const key = getKeyFromPitch(averagePitch);
      const tempo = await detectTempo(buffer);

      // Update the state with the detected key and tempo
      setKey(key);
      setTempo(tempo);
    } catch (error) {
      console.error(error);
      alert("Error analyzing pitch and key: " + error.message);
    }
  };

  const bufferToAudioBuffer = async (arrayBuffer: ArrayBuffer): Promise<AudioBuffer> => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    return await audioContext.decodeAudioData(arrayBuffer);
  };

  const handleRecord = (): void => {
    if (!recording) {
      Mp3Recorder.start()
        .then(() => {
          setRecording(true);
        })
        .catch((error) => {
          console.error(error);
          alert("Error starting recording: " + error.message);
        });
    } else {
      setProcessing(true);
      Mp3Recorder.stop()
        .getMp3()
        .then(async ([buffer, blob]) => {
          const audioBuffer = await bufferToAudioBuffer(buffer);
          await analyzePitchAndKey(audioBuffer);
          setRecordedBuffer(audioBuffer);
          setRecording(false);
          setProcessing(false);
        })
        .catch((error) => {
          console.error(error);
          alert("Error stopping recording: " + error.message);
          setProcessing(false);
        });
    }
  };

  const handleTempoChange = (value: string | number): void => {
    const newTempo = parseInt(value.toString());
    setTempo(newTempo);
    console.log(`Tempo changed to: ${newTempo}`);
    // Add your custom tempo change logic here
  };

  const handleBeatsChange = (value: string | number): void => {
    const newBeats = parseInt(value.toString());
    setBeats(newBeats);
    console.log(`Beats changed to: ${newBeats}`);
    // Add your custom beats change logic here
  };

  const handleKeyChange = (value: string | number): void => {
    const newValue = parseInt(value.toString());
    setKey(value as MusicalKey);
    // Add your key change logic here
  };

  const handleExport = (): void => {
    if (synthesizedBuffer) {
      const buffer = synthesizedBuffer;
      const blob = new Blob([buffer], { type: "audio/mp3" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "exported_audio.mp3";
      link.click();
    } else {
      alert("No synthesized audio to export.");
    }
  };


  return (
    <div>
      <Head>
        <title>Hum to Instrument Transformer</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Container>
        <h1 className="text-4xl font-bold mb-8">Hum to Instrument Transformer</h1>
        <Button onClick={handleRecord}>{recording ? "Stop" : "Record"}</Button>
        <Dropdown label="Tempo" options={[60, 90, 120, 140]} value={tempo} onChange={handleTempoChange} />
        <Dropdown label="Beats" options={[2, 3, 4, 6]} value={beats} onChange={handleBeatsChange} />
        <Dropdown label="Key" options={["C", "D", "E", "F", "G", "A", "B"]} value={key} onChange={handleKeyChange} />
        <Dropdown
          label="Instrument"
          options={["piano", "guitar", "violin", "flute", "saxophone"]}
          value={instrument}
          onChange={handleInstrumentChange}
        />
        <Button onClick={handleExport}>Export</Button>
        {
          processing && (
            <div className="flex justify-center mt-4">
              <ClipLoader color="#4A90E2" />
            </div>
          )
        }
      </Container>
    </div>
  );
}

export default Home