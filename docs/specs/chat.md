# Chat V1

## Goal

Add a very small shared chat in the right column, between the global influence panel and the event log.

## Scope

- One shared channel for all connected players.
- Messages are stored in MySQL.
- The UI shows the last 20 messages.
- Messages refresh through the same polling rhythm as the map.
- Sending is done with the input form in the right column.
- No WebSocket, no pagination, no moderation workflow, no formatting.

## Database

Table: `pcw_chat_messages`

Fields:

- `id`
- `player_id`
- `player_name`
- `message`
- `created_at`

`player_name` is intentionally denormalized to keep rendering simple and avoid extra joins.

## API

Endpoint: `api/chat.php`

### GET

Returns the last 20 messages in chronological order.

### POST

Accepts JSON:

```json
{
  "message": "Hello"
}
```

Rules:

- authentication token is required;
- empty messages are rejected;
- messages are truncated to 200 characters;
- after insert, old messages are pruned to keep only the last 20.

## Frontend

Files:

- `js/services/chat-service.js`
- `index.html`
- `css/game.css`

Behavior:

- chat initializes once when the game starts;
- messages are fetched during the regular tick;
- form submit sends the message;
- the message list auto-scrolls only when the user is already near the bottom.

## Migration

Run:

```bash
mysql -u julien -p compass < sql/upgrade_chat.sql
```
