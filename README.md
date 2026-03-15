# Steno

Record or import audio, transcribe with speaker diarization, and process through LLM prompts.

## Features

- **Audio recording** — Record directly within Obsidian with a single command or ribbon icon.
- **Audio import** — Import existing audio files (mp3, mp4, m4a, wav, webm, ogg, flac) for transcription. Ideal for longer recordings made with screen off.
- **Speaker diarization** — Transcripts identify and label different speakers automatically.
- **LLM post-processing** — Run diarized transcripts through configurable prompts (meeting notes, summaries, action items, or your own custom prompts).
- **Processing prompt bank** — Save and manage multiple named prompts. Switch between them from settings or via command palette.
- **Flexible output** — Append to the current note or create a new note in a configurable folder with datetime or LLM-generated titles.
- **Auto-transcribe** — On mobile, new audio files added to the audio folder are automatically detected and transcribed. Pairs well with the iOS Shortcut flow for screen-off recording.
- **iOS Shortcut integration** — Trigger recording or import via `obsidian://steno` URI scheme. Bind to the iPhone Action Button for quick access.

## Setup

1. Install the plugin from Community Plugins.
2. Open **Settings → Steno**.
3. Add your API keys:
   - **Transcription**: [AssemblyAI](https://www.assemblyai.com/) or [Deepgram](https://deepgram.com/) (required for diarization).
   - **LLM**: [OpenAI](https://platform.openai.com/) (`gpt-4o`), [Anthropic](https://console.anthropic.com/) (`claude-sonnet-4-20250514`), or [Google Gemini](https://aistudio.google.com/) (`gemini-2.5-flash`) (required for post-processing prompts).
4. Configure your preferred output mode and processing prompt.

## Usage

### Recording in-app

- **Command palette** (Cmd/Ctrl+P): "Steno: Toggle recording", "Steno: Start recording", "Steno: Stop recording"
- **Ribbon icon**: Click the microphone icon to toggle recording.
- On mobile, a modal with a large Stop button appears for easy access.

> **Note**: On iOS, the screen must stay on during in-app recording. For longer recordings, use the import flow below.

### Importing audio

- **Command palette**: "Steno: Import audio file for transcription"
- Select any audio file in your vault. The full pipeline (transcribe → LLM → output) runs automatically.

### iOS Shortcut / Action Button

**For in-app recording:**
1. Create an iOS Shortcut with a single "Open URL" action: `obsidian://steno?action=toggle`
2. Assign the Shortcut to your iPhone Action Button.

**For screen-off recording with reliable diarization (recommended):**

iOS applies audio processing to in-app recordings that can reduce diarization accuracy. For reliable multi-speaker detection, use a native iOS recording via Shortcuts. Your vault must use iCloud sync for this flow.

1. Open the **Shortcuts** app on your iPhone.
2. Create a new Shortcut with these actions in order:
   - **Record Audio** — uses native iOS recording (works with screen off, no audio processing)
   - **Save File** — set the destination to your Obsidian vault's audio folder in iCloud Drive (e.g., `iCloud Drive/Obsidian/YourVault/Steno/audio/`). Enable "Ask Where to Save" or set a fixed path.
   - **Open URL** — set the URL to `obsidian://steno?action=import`
3. Assign the Shortcut to your iPhone **Action Button** (Settings → Action Button → Shortcut).

**How it works:** Press the Action Button → native recording starts (screen can turn off) → press Stop when done → audio saves to your vault → Obsidian opens and Steno automatically prompts you to select the audio file for transcription.

### URI scheme

| URI | Action |
|-----|--------|
| `obsidian://steno?action=start` | Start recording |
| `obsidian://steno?action=stop` | Stop recording and process |
| `obsidian://steno?action=toggle` | Toggle recording |
| `obsidian://steno?action=import` | Open audio file picker |
| `obsidian://steno?action=import&file=path/to/audio.m4a` | Import specific file |
| `obsidian://steno?action=start&prompt=Meeting%20Notes` | Start with a specific prompt |

### Selecting a processing prompt

- **Command palette**: "Steno: Select processing prompt"
- **Settings**: Choose the active prompt from the dropdown.
- The "Raw Transcript (no LLM)" prompt skips LLM processing and outputs the diarized transcript directly.

## Network usage

This plugin sends data to external services. **No data is sent without user-configured API keys.**

- **AssemblyAI** (`api.assemblyai.com`): Audio is uploaded for transcription with speaker diarization.
- **Deepgram** (`api.deepgram.com`): Alternative transcription provider.
- **OpenAI** (`api.openai.com`): Diarized transcript text is sent for LLM post-processing.
- **Anthropic** (`api.anthropic.com`): Alternative LLM provider.
- **Google Gemini** (`generativelanguage.googleapis.com`): Alternative LLM provider.

Audio and transcript data is sent only to the providers you configure. Refer to each provider's privacy policy for data handling details.
