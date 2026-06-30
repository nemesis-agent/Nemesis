"use client";

import { useEffect, useState } from "react";
import { VersionedTransaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import type { Proposal } from "@nemesis/db";
import {
  summarizeExecutionPayload,
  validateBaseExecutionPayload,
  validateSolanaExecutionPayload,
  type SolanaExecutionEnvelope,
} from "@nemesis/execution";
import { Button } from "./Button";

interface ExecuteProposalButtonProps {
  proposal: Proposal;
}

type TxPayload = { to?: string; data?: string; value?: string; chainId?: number; label?: string };
type MultiStepPayload = { steps?: TxPayload[] };
type SolanaJupiterSwapPayload = SolanaExecutionEnvelope;

function parsePayload(rawPayload: string): TxPayload | MultiStepPayload | SolanaJupiterSwapPayload {
  return JSON.parse(rawPayload) as TxPayload | MultiStepPayload | SolanaJupiterSwapPayload;
}

function isSolanaPayload(payload: TxPayload | MultiStepPayload | SolanaJupiterSwapPayload): payload is SolanaJupiterSwapPayload {
  return (payload as SolanaJupiterSwapPayload).kind === "solana-jupiter-swap" && (payload as SolanaJupiterSwapPayload).chain === "solana";
}

function getCompletedStepCount(proposal: Proposal): number {
  const hashes = proposal.executionState?.completedTxHashes;
  return Array.isArray(hashes) ? hashes.length : 0;
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function formatExpiry(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const expiryMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiryMs)) return null;
  const seconds = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
  if (seconds === 0) return "expired";
  if (seconds < 60) return `expires in ${seconds}s`;
  return `expires in ${Math.floor(seconds / 60)}m`;
}

export function ExecuteProposalButton({ proposal }: ExecuteProposalButtonProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSolanaSigning, setIsSolanaSigning] = useState(false);
  const [solanaPendingSignature, setSolanaPendingSignature] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const { connection } = useConnection();
  const { address: baseAddress } = useAccount();
  const solanaWallet = useWallet();
  const summary = summarizeExecutionPayload(proposal.unsignedTxPayload, getCompletedStepCount(proposal));
  const expiryLabel = formatExpiry(summary.expiresAt);

  const {
    data: hash,
    error: sendError,
    isPending: isSigning,
    sendTransaction,
  } = useSendTransaction();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
    confirmations: 1,
  });

  useEffect(() => {
    if (isConfirmed && hash) {
      setIsVerifying(true);
      fetch(`/api/proposals/${proposal.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: hash }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to verify transaction");
          }
          window.location.reload();
        })
        .catch((err) => {
          setVerificationError(err.message);
        })
        .finally(() => {
          setIsVerifying(false);
        });
    }
  }, [isConfirmed, hash, proposal.id]);

  const confirmSolanaSignature = async (signature: string) => {
    const response = await fetch(`/api/proposals/${proposal.id}/confirm-solana`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signature }),
    });

    if (response.status === 425) {
      setSolanaPendingSignature(signature);
      throw new Error("Solana transaction was submitted, but confirmation is still pending. Wait a few seconds, then retry verification.");
    }

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to verify Solana transaction");
    }

    setSolanaPendingSignature(null);
    window.location.reload();
  };

  const handleSolanaExecute = async (payload: SolanaJupiterSwapPayload) => {
    if (!solanaWallet.publicKey) throw new Error("Connect Solflare first");
    if (solanaWallet.publicKey.toBase58() !== payload.walletAddress) {
      throw new Error("Connected Solana wallet does not match this proposal");
    }
    if (!solanaWallet.sendTransaction) throw new Error("Solana wallet cannot send transactions");

    const validation = validateSolanaExecutionPayload(JSON.stringify(payload), solanaWallet.publicKey.toBase58());
    if (!validation.ok) throw new Error(validation.error);

    const transaction = VersionedTransaction.deserialize(base64ToBytes(payload.serializedTransaction));
    const signature = await solanaWallet.sendTransaction(transaction, connection, { skipPreflight: false });

    await confirmSolanaSignature(signature);
  };

  const handleExecute = async () => {
    if (!proposal.unsignedTxPayload) return;
    try {
      setVerificationError(null);
      if (!summary.executable) {
        throw new Error(summary.reason ?? "This proposal is not executable from the wallet UI.");
      }
      if (solanaPendingSignature) {
        setIsSolanaSigning(true);
        await confirmSolanaSignature(solanaPendingSignature);
        return;
      }

      const parsed = parsePayload(proposal.unsignedTxPayload);
      if (isSolanaPayload(parsed)) {
        setIsSolanaSigning(true);
        await handleSolanaExecute(parsed);
        return;
      }

      if (!baseAddress) {
        throw new Error("Connect Base wallet first");
      }
      const validation = validateBaseExecutionPayload(proposal.unsignedTxPayload, baseAddress);
      if (!validation.ok) {
        throw new Error(validation.error);
      }
      const steps = validation.value.steps;
      const payload = steps[getCompletedStepCount(proposal)];
      if (!payload) {
        throw new Error("No remaining transaction step");
      }
      if (payload.chainId !== 8453 || !payload.to || !/^0x[a-fA-F0-9]{40}$/.test(payload.to)) {
        throw new Error("Invalid transaction payload");
      }
      if (payload.data && !/^0x[a-fA-F0-9]*$/.test(payload.data)) {
        throw new Error("Invalid transaction calldata");
      }
      if (payload.value && !/^(0|[1-9][0-9]*)$/.test(payload.value)) {
        throw new Error("Invalid transaction value");
      }
      sendTransaction({
        chainId: 8453,
        to: payload.to as `0x${string}`,
        data: (payload.data ?? "0x") as `0x${string}`,
        value: BigInt(payload.value ?? "0"),
      });
    } catch (err) {
      setVerificationError(err instanceof Error ? err.message : "Failed to parse transaction payload");
    } finally {
      setIsSolanaSigning(false);
    }
  };

  if (!proposal.unsignedTxPayload) {
    return (
      <div className="text-[10px] text-nm-muted uppercase tracking-widest2 font-mono border border-nm-border px-2 py-1">
        Review only
      </div>
    );
  }

  const isLoading = isSigning || isConfirming || isVerifying || isSolanaSigning;
  const buttonText = isSolanaSigning
    ? solanaPendingSignature ? "Verifying Solana..." : "Signing in Solflare..."
    : isSigning
    ? "Signing in Wallet..."
    : isConfirming
    ? "Broadcasting..."
    : isVerifying
    ? "Verifying..."
    : solanaPendingSignature
    ? "Retry Solana verification"
    : summary.actionLabel;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="primary"
        onClick={handleExecute}
        disabled={isLoading || isConfirmed || summary.expired || summary.kind === "invalid"}
      >
        {buttonText}
      </Button>
      <span className="max-w-56 text-right font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
        {summary.networkLabel}
        {summary.totalSteps > 1 ? ` step ${Math.min(summary.currentStep, summary.totalSteps)}/${summary.totalSteps}` : ""}
        {expiryLabel ? ` / ${expiryLabel}` : ""}
      </span>

      {sendError && (
        <span className="text-[10px] text-nm-fragment-red font-mono lowercase">
          {sendError.message.split("\n")[0]}
        </span>
      )}
      {receiptError && (
        <span className="text-[10px] text-nm-fragment-red font-mono lowercase">
          transaction failed on-chain
        </span>
      )}
      {(verificationError || summary.reason) && (
        <span className="max-w-64 text-right text-[10px] text-nm-fragment-red font-mono lowercase">
          {verificationError ?? summary.reason}
        </span>
      )}
    </div>
  );
}
