"use client";

import { useEffect, useState } from "react";
import { VersionedTransaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import type { Proposal } from "@nemesis/db";
import { Button } from "./Button";

interface ExecuteProposalButtonProps {
  proposal: Proposal;
}

type TxPayload = { to?: string; data?: string; value?: string; chainId?: number; label?: string };
type MultiStepPayload = { steps?: TxPayload[] };
type SolanaJupiterSwapPayload = {
  kind: "solana-jupiter-swap";
  chain: "solana";
  walletAddress: string;
  serializedTransaction: string;
  messageHash: string;
  label?: string;
};

function parsePayload(rawPayload: string): TxPayload | MultiStepPayload | SolanaJupiterSwapPayload {
  return JSON.parse(rawPayload) as TxPayload | MultiStepPayload | SolanaJupiterSwapPayload;
}

function isSolanaPayload(payload: TxPayload | MultiStepPayload | SolanaJupiterSwapPayload): payload is SolanaJupiterSwapPayload {
  return (payload as SolanaJupiterSwapPayload).kind === "solana-jupiter-swap" && (payload as SolanaJupiterSwapPayload).chain === "solana";
}

function getPayloadSteps(rawPayload: string): TxPayload[] {
  const parsed = parsePayload(rawPayload);
  if (isSolanaPayload(parsed)) return [];
  return Array.isArray((parsed as MultiStepPayload).steps) ? ((parsed as MultiStepPayload).steps ?? []) : [parsed as TxPayload];
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

function getButtonLabel(rawPayload: string, proposal: Proposal): string {
  const parsed = parsePayload(rawPayload);
  if (isSolanaPayload(parsed)) return parsed.label ?? "Sign Jupiter swap in Solflare";

  const steps = getPayloadSteps(rawPayload);
  const step = steps[getCompletedStepCount(proposal)];
  return step?.label ?? "Sign in wallet";
}

export function ExecuteProposalButton({ proposal }: ExecuteProposalButtonProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSolanaSigning, setIsSolanaSigning] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const { connection } = useConnection();
  const solanaWallet = useWallet();

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

  const handleSolanaExecute = async (payload: SolanaJupiterSwapPayload) => {
    if (!solanaWallet.publicKey) throw new Error("Connect Solflare first");
    if (solanaWallet.publicKey.toBase58() !== payload.walletAddress) {
      throw new Error("Connected Solana wallet does not match this proposal");
    }
    if (!solanaWallet.sendTransaction) throw new Error("Solana wallet cannot send transactions");

    const transaction = VersionedTransaction.deserialize(base64ToBytes(payload.serializedTransaction));
    const signature = await solanaWallet.sendTransaction(transaction, connection, { skipPreflight: false });

    const response = await fetch(`/api/proposals/${proposal.id}/confirm-solana`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signature }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to verify Solana transaction");
    }

    window.location.reload();
  };

  const handleExecute = async () => {
    if (!proposal.unsignedTxPayload) return;
    try {
      setVerificationError(null);
      const parsed = parsePayload(proposal.unsignedTxPayload);
      if (isSolanaPayload(parsed)) {
        setIsSolanaSigning(true);
        await handleSolanaExecute(parsed);
        return;
      }

      const steps = getPayloadSteps(proposal.unsignedTxPayload);
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
        No Payload
      </div>
    );
  }

  let stepLabel = "Sign in wallet";
  try {
    stepLabel = getButtonLabel(proposal.unsignedTxPayload, proposal);
  } catch {
    stepLabel = "Invalid payload";
  }

  const isLoading = isSigning || isConfirming || isVerifying || isSolanaSigning;
  const buttonText = isSolanaSigning
    ? "Signing in Solflare..."
    : isSigning
    ? "Signing in Wallet..."
    : isConfirming
    ? "Broadcasting..."
    : isVerifying
    ? "Verifying..."
    : stepLabel;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="primary"
        onClick={handleExecute}
        disabled={isLoading || isConfirmed}
      >
        {buttonText}
      </Button>

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
      {verificationError && (
        <span className="text-[10px] text-nm-fragment-red font-mono lowercase">
          {verificationError}
        </span>
      )}
    </div>
  );
}
