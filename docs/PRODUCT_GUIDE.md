# Product Guide

NEMESIS turns wallet intent into approval-first agent proposals.

## Dashboard

The dashboard shows agents linked to the currently signed-in wallet session. Users can inspect agent status, proposal history, template details, and Telegram linking state.

## Templates

Templates are narrow by design. Each template has one monitored condition and one proposed action. NEMESIS supports Base and Solana templates. Base templates can prepare verified payloads where the product can validate the transaction. Solana templates use guarded Jupiter proposal flows where available and keep final signing in the user's wallet.

## Telegram

Telegram is used for proposal delivery and command convenience. Open the Telegram bot from the dashboard, generate a short-lived link code, and send it to the bot. Commands only operate on the wallet linked to that chat.

Available commands:

- `/start`
- `/help`
- `/link <code>`
- `/unlink`
- `/agents`
- `/status [agent_id]`
- `/pause <agent_id>`
- `/resume <agent_id>`

## Proposal Review

Every proposal should be reviewed before signing. Users should verify the chain, token, amount, destination, fee, and wallet preview. If a proposal looks wrong or stale, skip it.