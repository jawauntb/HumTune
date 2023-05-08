import { useState } from "react"
import Head from "next/head"
import MicRecorder from "mic-recorder-to-mp3"
import * as Tone from "tone"
import { Player } from "tone"
import { Pitch } from "aubiojs"
import { ClipLoader } from "react-spinners"
import { Container, Button, Dropdown } from "../components"

export default function Home() {
  const [recording, setRecording] = useState(false);
  const [tempo, setTempo] = useState(120);
  const [beats, setBeats] = useState(4);
  const [key, setKey] = useState("C");
  const [instrument, setInstrument] = useState("piano");
  const [recordedBuffer, setRecordedBuffer] = useState(null);
  const [synthesizedBuffer, setSynthesizedBuffer] = useState(null);
  const [processing, setProcessing] = useState(false);


  const Mp3Recorder = new MicRecorder({ bitRate: 128 });

  const synthesizeInstrument = async (inputBuffer, instrument, key, scale) => {
    // Adjust the inputBuffer based on the key and scale

    const player = new Tone.Player(inputBuffer);
    const synth = new Tone.Synth().toDestination();
    const notes = []; // Extract notes from the inputBuffer using Tone.js

    // Play the notes using the synth
    for (let note of notes) {
      synth.triggerAttackRelease(note, "8n");
      await Tone.Draw.wait("8n");
    }
  };


  const getAveragePitch = (pitchArray) => {
    const filteredPitches = pitchArray.filter((pitch) => pitch !== -1);
    const totalPitches = filteredPitches.reduce((sum, pitch) => sum + pitch, 0);
    return totalPitches / filteredPitches.length;
  };

  const getKeyFromPitch = (pitch) => {
    const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const midiNumber = Math.round(12 * (Math.log2(pitch / 440)) + 69);
    return noteStrings[midiNumber % 12];
  };



  const detectTempo = async (audioBuffer) => {
    const buffer = new Buffer.fromArrayBuffer(audioBuffer);
    const player = new Player(buffer);
    await player.sync().start(0);
    const bpm = await Tone.Transport.bpm.value;
    player.dispose();
    return bpm;
  };



  const analyzePitchAndKey = async (buffer) => {
    try {
      const sampleRate = buffer.sampleRate;
      const pitchDetect = new Pitch("yin", 2048, 1024, sampleRate);

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


  const bufferToAudioBuffer = async (arrayBuffer) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    return await audioContext.decodeAudioData(arrayBuffer);
  };



  const handleRecord = () => {
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



  const handleTempoChange = (value) => {
    setTempo(value);
    // Add your tempo change logic here
  };

  const handleBeatsChange = (value) => {
    setBeats(value);
    // Add your beats change logic here
  };

  const handleKeyChange = (value) => {
    setKey(value);
    // Add your key change logic here
  };

  const handleInstrumentChange = async (value) => {
    setInstrument(value);
    if (recordedBuffer) {
      const synthesizedBuffer = await synthesizeInstrument(recordedBuffer, value, key);
      // Play the synthesizedBuffer
    }
  };


  const handleExport = () => {
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
        <Dropdown label="Tempo" options={[60, 90, 120, 140]} onChange={handleTempoChange} />
        <Dropdown label="Beats" options={[2, 3, 4, 6]} onChange={handleBeatsChange} />
        <Dropdown label="Key" options={["C", "D", "E", "F", "G", "A", "B"]} onChange={handleKeyChange} />
        <Dropdown
          label="Instrument"
          options={["piano", "guitar", "violin", "flute", "saxophone"]}
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
