# Security Model

NEMESIS is built around a non-custodial, approval-first security model.

## Non-Custodial

NEMESIS does not store seed phrases, private keys, recovery phrases, or custodial exchange credentials. Wallet signatures happen in the user's own wallet.

## Approval-First Execution

Agents monitor conditions and create proposals. A proposal can only move forward after the user reviews the wallet action and signs from their own wallet.

## Ownership Boundaries

Dashboard actions, Telegram commands, agent details, pause/resume, and proposal confirmation are scoped to the authenticated or linked wallet.

## Proposal confirmations

Where executable payloads are prepared, confirmation endpoints compare the submitted transaction against the stored proposal data before marking a proposal approved.

## User Responsibility

Users should reject any proposal that does not match the wallet preview, expected chain, expected token, expected amount, or current market context.