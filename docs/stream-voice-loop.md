# Stream Voice Loop

## Public portal deploy

The Foxfam dashboard embeds the ElevenLabs Conversational AI widget for Eren.

- Agent name: Eren
- Agent ID: `70Z2rf5rjOarYmwgh1nY`
- Public widget source: `https://elevenlabs.io/convai-widget/index.js`

This path is safe for the portal because it does not expose an ElevenLabs API key.

## MixItUp chat-to-voice flow

Use this flow for live stream TTS or agent-assisted responses:

```text
Twitch chat command
  -> MixItUp command/action
  -> local or hosted TTS bridge
  -> ElevenLabs Conversational AI or TTS API
  -> generated audio or streamed response
  -> MixItUp playback / OBS media source
```

Keep the bridge server-side whenever API keys or conversation tokens are involved.

## Guardrails

- Apply MixItUp cooldowns before sending text to ElevenLabs.
- Cap message length and reject empty input.
- Filter URLs, spam, and blocked words before generation.
- Keep an emergency mod-only kill switch.
- Log username, character count, voice/agent, result, and timestamp.
- Do not award Foxfam points for TTS unless progression rules explicitly include it.

## Future WebRTC route

For lower latency voice sessions, add a backend token endpoint that calls:

```text
GET https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=70Z2rf5rjOarYmwgh1nY
```

The backend must attach `xi-api-key` from server-side environment variables. The frontend should only receive the short-lived conversation token.
