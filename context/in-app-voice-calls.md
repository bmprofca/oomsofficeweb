# In-app voice calls

The staff/admin browser can place one-to-one app-to-app audio calls to active clients who have registered the mobile app for client-panel FCM. This is a separate feature from the PBX phone-number click-to-call buttons.

## Implementation

- `src/services/voiceCallApi.js` calls the shared `/api/v1/voice-calls` API using the current branch authentication headers.
- `src/components/Call/InAppVoiceCall.jsx` checks server capability, creates an idempotent call invitation, polls call state, joins LiveKit after client acceptance, and supports mute/end controls.
- `src/pages/client-profile.jsx` displays the in-app call action beside the existing PBX action when the server confirms the caller/client are eligible.
- `livekit-client` is the browser media SDK. The server signs short-lived, microphone-only room tokens; API secrets must never be added to this app.

## Runtime requirements

- Configure `REACT_APP_API_BASE_URL` for the environment that runs the browser and configure the server's LiveKit credentials/feature flag.
- Browser microphone capture requires user permission and a secure context (HTTPS in production; localhost is allowed for local browser development).
- The browser is the caller; incoming acceptance/notification is handled by the client mobile app. Keep the call profile tab open until the call ends; leaving/unmounting cancels or ends the call.
- Production requires the same CORS origins/rules already used for authenticated browser API calls and a reachable `wss://` LiveKit URL.
